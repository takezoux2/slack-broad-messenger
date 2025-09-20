import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  Timestamp,
  WriteBatch,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase';
import { getAuthManager } from './auth-manager';
import {
  ChannelList,
  createChannelList,
  validateChannelList,
  addChannelsToList,
  removeChannelsFromList,
  markChannelListAsUsed,
} from './types/channel-list';
import {
  Channel,
  createChannel,
  validateChannel,
  isChannelAvailableForMessaging,
} from './types/channel';
import { getSlackChannels, getSlackUsers, SlackChannelInfo, SlackUserInfo } from './slack';

/**
 * Channel manager error types
 */
export enum ChannelManagerErrorType {
  NOT_AUTHENTICATED = 'not_authenticated',
  PERMISSION_DENIED = 'permission_denied',
  NOT_FOUND = 'not_found',
  VALIDATION_ERROR = 'validation_error',
  SLACK_API_ERROR = 'slack_api_error',
  FIRESTORE_ERROR = 'firestore_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Channel manager error class
 */
export class ChannelManagerError extends Error {
  constructor(
    public type: ChannelManagerErrorType,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ChannelManagerError';
  }
}

/**
 * Pagination options for listing operations
 */
export interface PaginationOptions {
  limit: number;
  startAfter?: DocumentSnapshot;
}

/**
 * Channel sync result
 */
export interface ChannelSyncResult {
  totalChannels: number;
  newChannels: number;
  updatedChannels: number;
  deletedChannels: number;
  errors: string[];
}

/**
 * Channel list with populated channel details
 */
export interface ChannelListWithChannels extends ChannelList {
  channels: Channel[];
}

/**
 * Channel manager class for CRUD operations
 */
export class ChannelManager {
  private firestore = getFirebaseFirestore();
  private authManager = getAuthManager();

  /**
   * Ensures user is authenticated and has Slack access
   */
  private ensureAuthenticated(): { uid: string; teamId: string; accessToken: string } {
    const authState = this.authManager.getCurrentAuthState();

    if (!authState.isAuthenticated || !authState.user) {
      throw new ChannelManagerError(
        ChannelManagerErrorType.NOT_AUTHENTICATED,
        'User must be authenticated'
      );
    }

    if (!authState.userProfile?.slackAccessToken || !authState.userProfile?.slackTeamId) {
      throw new ChannelManagerError(
        ChannelManagerErrorType.NOT_AUTHENTICATED,
        'User must have valid Slack authentication'
      );
    }

    return {
      uid: authState.user.uid,
      teamId: authState.userProfile.slackTeamId,
      accessToken: authState.userProfile.slackAccessToken,
    };
  }

  /**
   * Syncs channels from Slack API to Firestore
   */
  public async syncChannelsFromSlack(): Promise<ChannelSyncResult> {
    const { teamId, accessToken } = this.ensureAuthenticated();

    try {
      // Get channels from Slack API
      const slackChannels = await getSlackChannels(accessToken);

      const result: ChannelSyncResult = {
        totalChannels: slackChannels.length,
        newChannels: 0,
        updatedChannels: 0,
        deletedChannels: 0,
        errors: [],
      };

      // Get existing channels from Firestore
      const existingChannelsQuery = query(
        collection(this.firestore, 'channels'),
        where('teamId', '==', teamId)
      );
      const existingChannelsSnap = await getDocs(existingChannelsQuery);
      const existingChannels = new Map<string, Channel>();

      existingChannelsSnap.forEach(doc => {
        const channel = doc.data() as Channel;
        existingChannels.set(channel.id, channel);
      });

      // Process each Slack channel
      const batch = writeBatch(this.firestore);
      const currentChannelIds = new Set<string>();

      for (const slackChannel of slackChannels) {
        try {
          currentChannelIds.add(slackChannel.id);

          const channel = this.convertSlackChannelToChannel(slackChannel, teamId);
          const validation = validateChannel(channel);

          if (!validation.isValid) {
            result.errors.push(
              `Invalid channel data for ${slackChannel.name}: ${validation.errors.map(e => e.message).join(', ')}`
            );
            continue;
          }

          const channelRef = doc(this.firestore, 'channels', channel.id);
          const existingChannel = existingChannels.get(channel.id);

          if (existingChannel) {
            // Update existing channel
            batch.update(channelRef, { ...channel });
            result.updatedChannels++;
          } else {
            // Create new channel
            batch.set(channelRef, channel);
            result.newChannels++;
          }
        } catch (error) {
          result.errors.push(
            `Failed to process channel ${slackChannel.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Mark channels as deleted if they're not in current Slack channels
      for (const [channelId, existingChannel] of existingChannels) {
        if (!currentChannelIds.has(channelId) && !existingChannel.isDeleted) {
          const channelRef = doc(this.firestore, 'channels', channelId);
          batch.update(channelRef, {
            isDeleted: true,
            lastSyncAt: Timestamp.now(),
          });
          result.deletedChannels++;
        }
      }

      // Commit all changes
      await batch.commit();

      return result;
    } catch (error) {
      console.error('Channel sync failed:', error);
      throw new ChannelManagerError(
        ChannelManagerErrorType.SLACK_API_ERROR,
        `Failed to sync channels from Slack: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Converts Slack channel info to Channel interface
   */
  private convertSlackChannelToChannel(slackChannel: SlackChannelInfo, teamId: string): Channel {
    return createChannel({
      id: slackChannel.id,
      teamId,
      name: slackChannel.name,
      displayName: `#${slackChannel.name}`,
      purpose: slackChannel.purpose?.value,
      topic: slackChannel.topic?.value,
      isPrivate: slackChannel.isPrivate || false,
      isArchived: slackChannel.isArchived || false,
      memberCount: slackChannel.numMembers || 0,
      isDeleted: false,
      lastSyncAt: Timestamp.now(),
    });
  }

  /**
   * Gets all channels for the current user's team
   */
  public async getChannels(options?: {
    includeArchived?: boolean;
    includeDeleted?: boolean;
  }): Promise<Channel[]> {
    const { teamId } = this.ensureAuthenticated();

    try {
      let channelsQuery = query(
        collection(this.firestore, 'channels'),
        where('teamId', '==', teamId),
        orderBy('name')
      );

      const channelsSnap = await getDocs(channelsQuery);
      const channels: Channel[] = [];

      channelsSnap.forEach(doc => {
        const channel = doc.data() as Channel;

        // Filter based on options
        if (!options?.includeArchived && channel.isArchived) {
          return;
        }
        if (!options?.includeDeleted && channel.isDeleted) {
          return;
        }

        const validation = validateChannel(channel);
        if (validation.isValid) {
          channels.push(channel);
        }
      });

      return channels;
    } catch (error) {
      console.error('Failed to get channels:', error);
      throw new ChannelManagerError(
        ChannelManagerErrorType.FIRESTORE_ERROR,
        `Failed to get channels: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Gets available channels for messaging (not deleted)
   */
  public async getAvailableChannels(): Promise<Channel[]> {
    const channels = await this.getChannels({ includeArchived: true, includeDeleted: false });
    return channels.filter(isChannelAvailableForMessaging);
  }

  /**
   * Gets a specific channel by ID
   */
  public async getChannel(channelId: string): Promise<Channel | null> {
    const { teamId } = this.ensureAuthenticated();

    try {
      const channelRef = doc(this.firestore, 'channels', channelId);
      const channelSnap = await getDoc(channelRef);

      if (!channelSnap.exists()) {
        return null;
      }

      const channel = channelSnap.data() as Channel;

      // Verify channel belongs to user's team
      if (channel.teamId !== teamId) {
        throw new ChannelManagerError(
          ChannelManagerErrorType.PERMISSION_DENIED,
          "Channel does not belong to user's team"
        );
      }

      const validation = validateChannel(channel);
      if (!validation.isValid) {
        console.warn('Invalid channel data in Firestore:', validation.errors);
        return null;
      }

      return channel;
    } catch (error) {
      if (error instanceof ChannelManagerError) {
        throw error;
      }
      console.error('Failed to get channel:', error);
      throw new ChannelManagerError(
        ChannelManagerErrorType.FIRESTORE_ERROR,
        `Failed to get channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Creates a new channel list
   */
  public async createChannelList(data: {
    name: string;
    description?: string;
    channelIds: string[];
  }): Promise<ChannelList> {
    const { uid } = this.ensureAuthenticated();

    try {
      // Validate channel IDs exist and are accessible
      await this.validateChannelIds(data.channelIds);

      const channelList = createChannelList({
        ownerId: uid,
        name: data.name,
        description: data.description,
        channelIds: data.channelIds,
      });

      const validation = validateChannelList(channelList);
      if (!validation.isValid) {
        throw new ChannelManagerError(
          ChannelManagerErrorType.VALIDATION_ERROR,
          `Channel list validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        );
      }

      // Check for duplicate name
      await this.checkDuplicateChannelListName(uid, data.name);

      // Save to Firestore
      const channelListRef = doc(collection(this.firestore, 'channelLists'));
      const channelListWithId = { ...channelList, id: channelListRef.id };

      await setDoc(channelListRef, channelListWithId);

      return channelListWithId;
    } catch (error) {
      if (error instanceof ChannelManagerError) {
        throw error;
      }
      console.error('Failed to create channel list:', error);
      throw new ChannelManagerError(
        ChannelManagerErrorType.FIRESTORE_ERROR,
        `Failed to create channel list: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Gets all channel lists for the current user
   */
  public async getChannelLists(): Promise<ChannelList[]> {
    const { uid } = this.ensureAuthenticated();

    try {
      const channelListsQuery = query(
        collection(this.firestore, 'channelLists'),
        where('ownerId', '==', uid),
        where('isActive', '==', true),
        orderBy('updatedAt', 'desc')
      );

      const channelListsSnap = await getDocs(channelListsQuery);
      const channelLists: ChannelList[] = [];

      channelListsSnap.forEach(doc => {
        const channelList = { id: doc.id, ...doc.data() } as ChannelList;

        const validation = validateChannelList(channelList);
        if (validation.isValid) {
          channelLists.push(channelList);
        }
      });

      return channelLists;
    } catch (error) {
      console.error('Failed to get channel lists:', error);
      throw new ChannelManagerError(
        ChannelManagerErrorType.FIRESTORE_ERROR,
        `Failed to get channel lists: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Gets a specific channel list with populated channel details
   */
  public async getChannelListWithChannels(listId: string): Promise<ChannelListWithChannels | null> {
    const channelList = await this.getChannelList(listId);
    if (!channelList) {
      return null;
    }

    try {
      const channels = await Promise.all(
        channelList.channelIds.map(async channelId => {
          const channel = await this.getChannel(channelId);
          return channel;
        })
      );

      // Filter out null channels (deleted or inaccessible)
      const validChannels = channels.filter((channel): channel is Channel => channel !== null);

      return {
        ...channelList,
        channels: validChannels,
      };
    } catch (error) {
      console.error('Failed to populate channel list with channels:', error);
      throw new ChannelManagerError(
        ChannelManagerErrorType.FIRESTORE_ERROR,
        `Failed to populate channel list: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Gets a specific channel list by ID
   */
  public async getChannelList(listId: string): Promise<ChannelList | null> {
    const { uid } = this.ensureAuthenticated();

    try {
      const channelListRef = doc(this.firestore, 'channelLists', listId);
      const channelListSnap = await getDoc(channelListRef);

      if (!channelListSnap.exists()) {
        return null;
      }

      const channelList = { id: listId, ...channelListSnap.data() } as ChannelList;

      // Verify ownership
      if (channelList.ownerId !== uid) {
        throw new ChannelManagerError(
          ChannelManagerErrorType.PERMISSION_DENIED,
          'Channel list does not belong to current user'
        );
      }

      const validation = validateChannelList(channelList);
      if (!validation.isValid) {
        console.warn('Invalid channel list data in Firestore:', validation.errors);
        return null;
      }

      return channelList;
    } catch (error) {
      if (error instanceof ChannelManagerError) {
        throw error;
      }
      console.error('Failed to get channel list:', error);
      throw new ChannelManagerError(
        ChannelManagerErrorType.FIRESTORE_ERROR,
        `Failed to get channel list: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Updates an existing channel list
   */
  public async updateChannelList(
    listId: string,
    updates: {
      name?: string;
      description?: string;
      channelIds?: string[];
    }
  ): Promise<ChannelList> {
    const existingList = await this.getChannelList(listId);
    if (!existingList) {
      throw new ChannelManagerError(ChannelManagerErrorType.NOT_FOUND, 'Channel list not found');
    }

    try {
      // Validate channel IDs if provided
      if (updates.channelIds) {
        await this.validateChannelIds(updates.channelIds);
      }

      // Check for duplicate name if name is being changed
      if (updates.name && updates.name !== existingList.name) {
        await this.checkDuplicateChannelListName(existingList.ownerId, updates.name, listId);
      }

      const updatedChannelList = {
        ...existingList,
        ...updates,
        channelCount: updates.channelIds ? updates.channelIds.length : existingList.channelCount,
        updatedAt: Timestamp.now(),
      };

      const validation = validateChannelList(updatedChannelList);
      if (!validation.isValid) {
        throw new ChannelManagerError(
          ChannelManagerErrorType.VALIDATION_ERROR,
          `Channel list validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        );
      }

      // Update in Firestore
      const channelListRef = doc(this.firestore, 'channelLists', listId);
      await updateDoc(channelListRef, updates);

      return updatedChannelList;
    } catch (error) {
      if (error instanceof ChannelManagerError) {
        throw error;
      }
      console.error('Failed to update channel list:', error);
      throw new ChannelManagerError(
        ChannelManagerErrorType.FIRESTORE_ERROR,
        `Failed to update channel list: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Deletes a channel list (soft delete)
   */
  public async deleteChannelList(listId: string): Promise<void> {
    const existingList = await this.getChannelList(listId);
    if (!existingList) {
      throw new ChannelManagerError(ChannelManagerErrorType.NOT_FOUND, 'Channel list not found');
    }

    try {
      const channelListRef = doc(this.firestore, 'channelLists', listId);
      await updateDoc(channelListRef, {
        isActive: false,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Failed to delete channel list:', error);
      throw new ChannelManagerError(
        ChannelManagerErrorType.FIRESTORE_ERROR,
        `Failed to delete channel list: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Marks a channel list as used
   */
  public async markChannelListAsUsed(listId: string): Promise<void> {
    const existingList = await this.getChannelList(listId);
    if (!existingList) {
      throw new ChannelManagerError(ChannelManagerErrorType.NOT_FOUND, 'Channel list not found');
    }

    try {
      const channelListRef = doc(this.firestore, 'channelLists', listId);
      await updateDoc(channelListRef, {
        lastUsedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Failed to mark channel list as used:', error);
      // Don't throw error - this is not critical
    }
  }

  /**
   * Validates that all channel IDs exist and are accessible
   */
  private async validateChannelIds(channelIds: string[]): Promise<void> {
    const { teamId } = this.ensureAuthenticated();

    try {
      const invalidChannels: string[] = [];

      for (const channelId of channelIds) {
        const channel = await this.getChannel(channelId);
        if (!channel) {
          invalidChannels.push(channelId);
        } else if (channel.isDeleted) {
          invalidChannels.push(`${channelId} (deleted)`);
        }
      }

      if (invalidChannels.length > 0) {
        throw new ChannelManagerError(
          ChannelManagerErrorType.VALIDATION_ERROR,
          `Invalid or inaccessible channels: ${invalidChannels.join(', ')}`
        );
      }
    } catch (error) {
      if (error instanceof ChannelManagerError) {
        throw error;
      }
      throw new ChannelManagerError(
        ChannelManagerErrorType.VALIDATION_ERROR,
        `Failed to validate channel IDs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Checks for duplicate channel list name
   */
  private async checkDuplicateChannelListName(
    ownerId: string,
    name: string,
    excludeId?: string
  ): Promise<void> {
    try {
      const duplicateQuery = query(
        collection(this.firestore, 'channelLists'),
        where('ownerId', '==', ownerId),
        where('name', '==', name),
        where('isActive', '==', true)
      );

      const duplicateSnap = await getDocs(duplicateQuery);

      const hasDuplicate = duplicateSnap.docs.some(doc => {
        return excludeId ? doc.id !== excludeId : true;
      });

      if (hasDuplicate) {
        throw new ChannelManagerError(
          ChannelManagerErrorType.VALIDATION_ERROR,
          `Channel list name "${name}" already exists`
        );
      }
    } catch (error) {
      if (error instanceof ChannelManagerError) {
        throw error;
      }
      throw new ChannelManagerError(
        ChannelManagerErrorType.VALIDATION_ERROR,
        `Failed to check duplicate name: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }
}

// Global instance
let channelManagerInstance: ChannelManager | null = null;

/**
 * Gets the global ChannelManager instance
 */
export function getChannelManager(): ChannelManager {
  if (!channelManagerInstance) {
    channelManagerInstance = new ChannelManager();
  }
  return channelManagerInstance;
}

/**
 * Resets the ChannelManager instance (useful for testing)
 */
export function resetChannelManager(): void {
  channelManagerInstance = null;
}

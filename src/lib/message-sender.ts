import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  writeBatch,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase';
import { getAuthManager } from './auth-manager';
import { getChannelManager } from './channel-manager';
import {
  Message,
  MessageStatus,
  createMessage,
  validateMessage,
  startMessageSending,
  completeMessage,
  failMessage,
  calculateMessageProgress,
} from './types/message';
import {
  MessageDelivery,
  DeliveryStatus,
  createMessageDelivery,
  markDeliverySuccess,
  markDeliveryFailed,
  markDeliverySkipped,
  incrementRetryCount,
  startDeliveryAttempt,
} from './types/message-delivery';
import { ChannelList } from './types/channel-list';
import { Channel } from './types/channel';
import { postSlackMessage, SlackMessageResult } from './slack';

/**
 * Message sender error types
 */
export enum MessageSenderErrorType {
  NOT_AUTHENTICATED = 'not_authenticated',
  PERMISSION_DENIED = 'permission_denied',
  NOT_FOUND = 'not_found',
  VALIDATION_ERROR = 'validation_error',
  SLACK_API_ERROR = 'slack_api_error',
  FIRESTORE_ERROR = 'firestore_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Message sender error class
 */
export class MessageSenderError extends Error {
  constructor(
    public type: MessageSenderErrorType,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'MessageSenderError';
  }
}

/**
 * Message sending options
 */
export interface MessageSendingOptions {
  retryCount?: number;
  retryDelay?: number;
  batchSize?: number;
  progressCallback?: (progress: MessageSendingProgress) => void;
}

/**
 * Message sending progress
 */
export interface MessageSendingProgress {
  messageId: string;
  totalChannels: number;
  processedChannels: number;
  successCount: number;
  failureCount: number;
  skipCount: number;
  percentComplete: number;
  currentChannel?: string;
  isComplete: boolean;
  errors: string[];
}

/**
 * Delivery attempt result
 */
interface DeliveryAttemptResult {
  success: boolean;
  slackMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  shouldRetry: boolean;
}

/**
 * Message sender class for batch messaging
 */
export class MessageSender {
  private firestore = getFirebaseFirestore();
  private authManager = getAuthManager();
  private channelManager = getChannelManager();
  
  // Default options
  private defaultOptions: Required<MessageSendingOptions> = {
    retryCount: 3,
    retryDelay: 1000, // 1 second
    batchSize: 5, // Process 5 channels at a time
    progressCallback: () => {}, // No-op
  };

  /**
   * Ensures user is authenticated and has Slack access
   */
  private ensureAuthenticated(): { uid: string; teamId: string; accessToken: string } {
    const authState = this.authManager.getCurrentAuthState();
    
    if (!authState.isAuthenticated || !authState.user) {
      throw new MessageSenderError(
        MessageSenderErrorType.NOT_AUTHENTICATED,
        'User must be authenticated'
      );
    }

    if (!authState.userProfile?.slackAccessToken || !authState.userProfile?.slackTeamId) {
      throw new MessageSenderError(
        MessageSenderErrorType.NOT_AUTHENTICATED,
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
   * Creates a new message and starts sending process
   */
  public async sendMessage(
    content: string,
    channelListId: string,
    selectedSenderId: string,
    options: MessageSendingOptions = {}
  ): Promise<Message> {
    const { uid, accessToken } = this.ensureAuthenticated();
    const finalOptions = { ...this.defaultOptions, ...options };

    try {
      // Validate inputs
      if (!content.trim()) {
        throw new MessageSenderError(
          MessageSenderErrorType.VALIDATION_ERROR,
          'Message content cannot be empty'
        );
      }

      if (content.length > 4000) {
        throw new MessageSenderError(
          MessageSenderErrorType.VALIDATION_ERROR,
          'Message content cannot exceed 4000 characters'
        );
      }

      // Get and validate channel list
      const channelListWithChannels = await this.channelManager.getChannelListWithChannels(channelListId);
      if (!channelListWithChannels) {
        throw new MessageSenderError(
          MessageSenderErrorType.NOT_FOUND,
          'Channel list not found'
        );
      }

      if (channelListWithChannels.channels.length === 0) {
        throw new MessageSenderError(
          MessageSenderErrorType.VALIDATION_ERROR,
          'Channel list has no available channels'
        );
      }

      // Create message record
      const message = createMessage({
        senderId: uid,
        selectedSenderId,
        channelListId,
        content,
        status: MessageStatus.DRAFT,
        totalChannels: channelListWithChannels.channels.length,
      });

      const validation = validateMessage(message);
      if (!validation.isValid) {
        throw new MessageSenderError(
          MessageSenderErrorType.VALIDATION_ERROR,
          `Message validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        );
      }

      // Save message to Firestore
      const messageRef = doc(collection(this.firestore, 'messages'));
      const messageWithId = { ...message, id: messageRef.id };
      await setDoc(messageRef, messageWithId);

      // Create delivery records
      await this.createDeliveryRecords(messageWithId, channelListWithChannels.channels);

      // Mark channel list as used
      await this.channelManager.markChannelListAsUsed(channelListId);

      // Start sending process asynchronously
      this.startSendingProcess(messageWithId, channelListWithChannels.channels, accessToken, finalOptions)
        .catch(error => {
          console.error('Message sending process failed:', error);
        });

      return messageWithId;
    } catch (error) {
      if (error instanceof MessageSenderError) {
        throw error;
      }
      console.error('Failed to send message:', error);
      throw new MessageSenderError(
        MessageSenderErrorType.UNKNOWN_ERROR,
        `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Creates delivery records for all channels
   */
  private async createDeliveryRecords(message: Message, channels: Channel[]): Promise<void> {
    try {
      const batch = writeBatch(this.firestore);
      
      for (const channel of channels) {
        const delivery = createMessageDelivery({
          messageId: message.id,
          channelId: channel.id,
          channelName: channel.displayName,
          status: DeliveryStatus.PENDING,
        });

        const deliveryRef = doc(collection(this.firestore, 'messages', message.id, 'deliveries'));
        const deliveryWithId = { ...delivery, id: deliveryRef.id };
        batch.set(deliveryRef, deliveryWithId);
      }

      await batch.commit();
    } catch (error) {
      console.error('Failed to create delivery records:', error);
      throw new MessageSenderError(
        MessageSenderErrorType.FIRESTORE_ERROR,
        `Failed to create delivery records: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Starts the message sending process
   */
  private async startSendingProcess(
    message: Message,
    channels: Channel[],
    accessToken: string,
    options: Required<MessageSendingOptions>
  ): Promise<void> {
    try {
      // Update message status to SENDING
      const sendingMessage = startMessageSending(message);
      await this.updateMessage(sendingMessage);

      // Initialize progress
      const progress: MessageSendingProgress = {
        messageId: message.id,
        totalChannels: channels.length,
        processedChannels: 0,
        successCount: 0,
        failureCount: 0,
        skipCount: 0,
        percentComplete: 0,
        isComplete: false,
        errors: [],
      };

      // Get delivery records
      const deliveries = await this.getDeliveriesForMessage(message.id);
      
      // Process channels in batches
      for (let i = 0; i < deliveries.length; i += options.batchSize) {
        const batch = deliveries.slice(i, i + options.batchSize);
        
        // Process batch in parallel
        await Promise.all(
          batch.map(async (delivery) => {
            const channel = channels.find(c => c.id === delivery.channelId);
            if (!channel) {
              await this.markDeliveryAsSkipped(delivery, 'Channel not found');
              progress.skipCount++;
              progress.processedChannels++;
              return;
            }

            progress.currentChannel = channel.displayName;
            options.progressCallback(progress);

            const result = await this.attemptDelivery(
              delivery,
              message.content,
              accessToken,
              options.retryCount,
              options.retryDelay
            );

            if (result.success) {
              progress.successCount++;
            } else {
              progress.failureCount++;
              if (result.errorMessage) {
                progress.errors.push(`${channel.displayName}: ${result.errorMessage}`);
              }
            }

            progress.processedChannels++;
            progress.percentComplete = Math.round((progress.processedChannels / progress.totalChannels) * 100);
            options.progressCallback(progress);
          })
        );

        // Add delay between batches to respect rate limits
        if (i + options.batchSize < deliveries.length) {
          await this.delay(options.retryDelay);
        }
      }

      // Complete the message
      progress.isComplete = true;
      options.progressCallback(progress);

      const completedMessage = completeMessage(
        sendingMessage,
        progress.successCount,
        progress.failureCount,
        progress.skipCount
      );
      await this.updateMessage(completedMessage);

    } catch (error) {
      console.error('Message sending process failed:', error);
      
      // Mark message as failed
      const failedMessage = failMessage(message, error instanceof Error ? error.message : 'Unknown error');
      await this.updateMessage(failedMessage);
      
      throw error;
    }
  }

  /**
   * Attempts to deliver a message to a channel with retries
   */
  private async attemptDelivery(
    delivery: MessageDelivery,
    content: string,
    accessToken: string,
    maxRetries: number,
    retryDelay: number
  ): Promise<DeliveryAttemptResult> {
    let currentDelivery = delivery;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Start delivery attempt
        currentDelivery = startDeliveryAttempt(currentDelivery);
        await this.updateDelivery(currentDelivery);

        // Attempt to post message to Slack
        const result = await postSlackMessage(
          currentDelivery.channelId,
          content,
          accessToken
        );

        // Mark as successful
        const successDelivery = markDeliverySuccess(currentDelivery, result.ts);
        await this.updateDelivery(successDelivery);

        return {
          success: true,
          slackMessageId: result.ts,
          shouldRetry: false,
        };

      } catch (error) {
        console.error(`Delivery attempt ${attempt + 1} failed for channel ${currentDelivery.channelName}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorCode = this.extractErrorCode(error);
        
        // Check if this is a retryable error
        const shouldRetry = this.shouldRetryError(error) && attempt < maxRetries;
        
        if (shouldRetry) {
          // Increment retry count and wait before next attempt
          currentDelivery = incrementRetryCount(currentDelivery);
          await this.updateDelivery(currentDelivery);
          await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        } else {
          // Mark as failed
          const failedDelivery = markDeliveryFailed(currentDelivery, errorCode, errorMessage);
          await this.updateDelivery(failedDelivery);
          
          return {
            success: false,
            errorCode,
            errorMessage,
            shouldRetry: false,
          };
        }
      }
    }

    return {
      success: false,
      errorMessage: 'Max retries exceeded',
      shouldRetry: false,
    };
  }

  /**
   * Marks a delivery as skipped
   */
  private async markDeliveryAsSkipped(delivery: MessageDelivery, reason: string): Promise<void> {
    const skippedDelivery = markDeliverySkipped(delivery, reason);
    await this.updateDelivery(skippedDelivery);
  }

  /**
   * Determines if an error should be retried
   */
  private shouldRetryError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Retry on rate limits, timeouts, and temporary network issues
      if (message.includes('rate_limited') ||
          message.includes('timeout') ||
          message.includes('network') ||
          message.includes('temporary') ||
          message.includes('server_error')) {
        return true;
      }
      
      // Don't retry on permanent errors
      if (message.includes('channel_not_found') ||
          message.includes('not_in_channel') ||
          message.includes('is_archived') ||
          message.includes('account_inactive') ||
          message.includes('invalid_auth')) {
        return false;
      }
    }
    
    // Default to retry for unknown errors
    return true;
  }

  /**
   * Extracts error code from Slack API error
   */
  private extractErrorCode(error: unknown): string {
    if (error instanceof Error) {
      // Try to extract Slack error code from message
      const match = error.message.match(/error:\s*([a-z_]+)/i);
      if (match) {
        return match[1];
      }
    }
    
    return 'unknown_error';
  }

  /**
   * Updates a message in Firestore
   */
  private async updateMessage(message: Message): Promise<void> {
    try {
      const messageRef = doc(this.firestore, 'messages', message.id);
      await updateDoc(messageRef, { ...message });
    } catch (error) {
      console.error('Failed to update message:', error);
      throw new MessageSenderError(
        MessageSenderErrorType.FIRESTORE_ERROR,
        `Failed to update message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Updates a delivery in Firestore
   */
  private async updateDelivery(delivery: MessageDelivery): Promise<void> {
    try {
      const deliveryRef = doc(this.firestore, 'messages', delivery.messageId, 'deliveries', delivery.id);
      await updateDoc(deliveryRef, { ...delivery });
    } catch (error) {
      console.error('Failed to update delivery:', error);
      throw new MessageSenderError(
        MessageSenderErrorType.FIRESTORE_ERROR,
        `Failed to update delivery: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Gets all deliveries for a message (private method)
   */
  private async getDeliveriesForMessage(messageId: string): Promise<MessageDelivery[]> {
    try {
      const deliveriesQuery = query(
        collection(this.firestore, 'messages', messageId, 'deliveries'),
        orderBy('channelName')
      );
      
      const deliveriesSnap = await getDocs(deliveriesQuery);
      const deliveries: MessageDelivery[] = [];
      
      deliveriesSnap.forEach(doc => {
        const delivery = { id: doc.id, ...doc.data() } as MessageDelivery;
        deliveries.push(delivery);
      });
      
      return deliveries;
    } catch (error) {
      console.error('Failed to get message deliveries:', error);
      throw new MessageSenderError(
        MessageSenderErrorType.FIRESTORE_ERROR,
        `Failed to get message deliveries: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Gets a message by ID
   */
  public async getMessage(messageId: string): Promise<Message | null> {
    const { uid } = this.ensureAuthenticated();

    try {
      const messageRef = doc(this.firestore, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);

      if (!messageSnap.exists()) {
        return null;
      }

      const message = { id: messageId, ...messageSnap.data() } as Message;
      
      // Verify ownership
      if (message.senderId !== uid) {
        throw new MessageSenderError(
          MessageSenderErrorType.PERMISSION_DENIED,
          'Message does not belong to current user'
        );
      }

      const validation = validateMessage(message);
      if (!validation.isValid) {
        console.warn('Invalid message data in Firestore:', validation.errors);
        return null;
      }

      return message;
    } catch (error) {
      if (error instanceof MessageSenderError) {
        throw error;
      }
      console.error('Failed to get message:', error);
      throw new MessageSenderError(
        MessageSenderErrorType.FIRESTORE_ERROR,
        `Failed to get message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Gets messages for the current user
   */
  public async getMessages(limit: number = 20, offset: number = 0): Promise<Message[]> {
    const { uid } = this.ensureAuthenticated();

    try {
      const messagesQuery = query(
        collection(this.firestore, 'messages'),
        where('senderId', '==', uid),
        orderBy('createdAt', 'desc')
        // Note: Firestore doesn't support offset, so we'll use limit only
      );

      const messagesSnap = await getDocs(messagesQuery);
      const messages: Message[] = [];

      messagesSnap.forEach(doc => {
        const message = { id: doc.id, ...doc.data() } as Message;
        
        const validation = validateMessage(message);
        if (validation.isValid) {
          messages.push(message);
        }
      });

      // Manually apply offset since Firestore doesn't support it directly
      return messages.slice(offset, offset + limit);
    } catch (error) {
      console.error('Failed to get messages:', error);
      throw new MessageSenderError(
        MessageSenderErrorType.FIRESTORE_ERROR,
        `Failed to get messages: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Gets delivery details for a message (public interface)
   */
  public async getMessageDeliveries(messageId: string): Promise<MessageDelivery[]> {
    // Verify message ownership
    const message = await this.getMessage(messageId);
    if (!message) {
      throw new MessageSenderError(
        MessageSenderErrorType.NOT_FOUND,
        'Message not found'
      );
    }

    return this.getDeliveriesForMessage(messageId);
  }

  /**
   * Subscribes to real-time progress updates for a message
   */
  public subscribeToMessageProgress(
    messageId: string,
    callback: (progress: MessageSendingProgress) => void
  ): Unsubscribe {
    const deliveriesRef = collection(this.firestore, 'messages', messageId, 'deliveries');
    
    return onSnapshot(deliveriesRef, (snapshot) => {
      let totalChannels = 0;
      let processedChannels = 0;
      let successCount = 0;
      let failureCount = 0;
      let skipCount = 0;
      const errors: string[] = [];

      snapshot.forEach(doc => {
        const delivery = doc.data() as MessageDelivery;
        totalChannels++;
        
        if (delivery.status !== DeliveryStatus.PENDING) {
          processedChannels++;
          
          switch (delivery.status) {
            case DeliveryStatus.SUCCESS:
              successCount++;
              break;
            case DeliveryStatus.FAILED:
              failureCount++;
              if (delivery.errorMessage) {
                errors.push(`${delivery.channelName}: ${delivery.errorMessage}`);
              }
              break;
            case DeliveryStatus.SKIPPED:
              skipCount++;
              break;
          }
        }
      });

      const percentComplete = totalChannels > 0 ? Math.round((processedChannels / totalChannels) * 100) : 0;
      const isComplete = processedChannels === totalChannels;

      const progress: MessageSendingProgress = {
        messageId,
        totalChannels,
        processedChannels,
        successCount,
        failureCount,
        skipCount,
        percentComplete,
        isComplete,
        errors,
      };

      callback(progress);
    });
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global instance
let messageSenderInstance: MessageSender | null = null;

/**
 * Gets the global MessageSender instance
 */
export function getMessageSender(): MessageSender {
  if (!messageSenderInstance) {
    messageSenderInstance = new MessageSender();
  }
  return messageSenderInstance;
}

/**
 * Resets the MessageSender instance (useful for testing)
 */
export function resetMessageSender(): void {
  messageSenderInstance = null;
}

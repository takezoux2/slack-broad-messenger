import { WebClient, LogLevel } from '@slack/web-api';
import { WebAPICallResult } from '@slack/web-api';

/**
 * Slack API configuration interface
 */
export interface SlackConfig {
  clientId: string;
  clientSecret: string;
  signingSecret: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * Slack OAuth token information
 */
export interface SlackTokenInfo {
  accessToken: string;
  tokenType: string;
  scope: string;
  botUserId?: string;
  appId: string;
  teamId: string;
  teamName: string;
  userId?: string;
  enterpriseId?: string;
}

/**
 * Slack channel information
 */
export interface SlackChannelInfo {
  id: string;
  name: string;
  isChannel: boolean;
  isGroup: boolean;
  isIm: boolean;
  isMpim: boolean;
  isPrivate: boolean;
  isArchived: boolean;
  isGeneral: boolean;
  creator: string;
  created: number;
  unlinked: number;
  nameNormalized: string;
  isShared: boolean;
  isExtShared: boolean;
  isOrgShared: boolean;
  pendingShared: string[];
  contextTeamId: string;
  updated: number;
  purpose: {
    value: string;
    creator: string;
    lastSet: number;
  };
  topic: {
    value: string;
    creator: string;
    lastSet: number;
  };
  numMembers: number;
}

/**
 * Slack user information
 */
export interface SlackUserInfo {
  id: string;
  teamId: string;
  name: string;
  deleted: boolean;
  color: string;
  realName: string;
  tz: string;
  tzLabel: string;
  tzOffset: number;
  profile: {
    title: string;
    phone: string;
    skype: string;
    realName: string;
    realNameNormalized: string;
    displayName: string;
    displayNameNormalized: string;
    statusText: string;
    statusEmoji: string;
    statusExpiration: number;
    avatarHash: string;
    email: string;
    firstName: string;
    lastName: string;
    image24: string;
    image32: string;
    image48: string;
    image72: string;
    image192: string;
    image512: string;
    image1024: string;
    imageOriginal: string;
    team: string;
  };
  isAdmin: boolean;
  isOwner: boolean;
  isPrimaryOwner: boolean;
  isRestricted: boolean;
  isUltraRestricted: boolean;
  isBot: boolean;
  isAppUser: boolean;
  updated: number;
  isEmailConfirmed: boolean;
  whoCanShareContactCard: string;
}

/**
 * Slack message post result
 */
export interface SlackMessageResult {
  ok: boolean;
  channel: string;
  ts: string;
  message: {
    type: string;
    subtype?: string;
    text: string;
    user: string;
    ts: string;
    team: string;
  };
  warning?: string;
  responseMetadata?: {
    warnings?: string[];
  };
}

/**
 * Default Slack configuration from environment variables
 */
const defaultSlackConfig: SlackConfig = {
  clientId: process.env.SLACK_CLIENT_ID || '',
  clientSecret: process.env.SLACK_CLIENT_SECRET || '',
  signingSecret: process.env.SLACK_SIGNING_SECRET || '',
  redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/auth/slack/callback',
  scopes: [
    'channels:read',
    'groups:read',
    'users:read',
    'chat:write',
    'chat:write.public',
    'im:read',
    'mpim:read',
    'team:read',
  ],
};

/**
 * Validates Slack configuration
 */
function validateSlackConfig(config: SlackConfig): void {
  const requiredFields: (keyof SlackConfig)[] = [
    'clientId',
    'clientSecret',
    'signingSecret',
    'redirectUri',
  ];

  const missingFields = requiredFields.filter(field => !config[field]);

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required Slack configuration fields: ${missingFields.join(', ')}\n` +
        'Please check your environment variables or Slack app configuration.'
    );
  }

  if (!config.scopes || config.scopes.length === 0) {
    throw new Error('At least one Slack scope is required');
  }
}

/**
 * Creates a Slack WebClient with optional access token
 */
export function createSlackClient(
  accessToken?: string,
  config: SlackConfig = defaultSlackConfig
): WebClient {
  const clientOptions: any = {
    logLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
    retryConfig: {
      retries: 3,
      factor: 2,
    },
  };

  if (accessToken) {
    clientOptions.token = accessToken;
  }

  return new WebClient(clientOptions);
}

/**
 * Gets the Slack OAuth authorization URL
 */
export function getSlackAuthUrl(state: string, config: SlackConfig = defaultSlackConfig): string {
  validateSlackConfig(config);

  const params = new URLSearchParams({
    client_id: config.clientId,
    scope: config.scopes.join(','),
    redirect_uri: config.redirectUri,
    state,
    response_type: 'code',
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

/**
 * Exchanges OAuth code for access token
 */
export async function exchangeSlackCode(
  code: string,
  config: SlackConfig = defaultSlackConfig
): Promise<SlackTokenInfo> {
  validateSlackConfig(config);

  const client = createSlackClient();

  try {
    const result = await client.oauth.v2.access({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    });

    if (!result.ok) {
      throw new Error(`Slack OAuth error: ${result.error}`);
    }

    return {
      accessToken: result.access_token as string,
      tokenType: result.token_type as string,
      scope: result.scope as string,
      botUserId: result.bot_user_id as string,
      appId: result.app_id as string,
      teamId: result.team?.id as string,
      teamName: result.team?.name as string,
      userId: result.authed_user?.id as string,
      enterpriseId: result.enterprise?.id as string,
    };
  } catch (error) {
    console.error('Slack OAuth exchange failed:', error);
    throw new Error(
      `Failed to exchange Slack OAuth code: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Gets user information from Slack
 */
export async function getSlackUser(userId: string, accessToken: string): Promise<SlackUserInfo> {
  const client = createSlackClient(accessToken);

  try {
    const result = await client.users.info({
      user: userId,
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    return result.user as SlackUserInfo;
  } catch (error) {
    console.error('Failed to get Slack user:', error);
    throw new Error(
      `Failed to get Slack user: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Gets all users from Slack workspace
 */
export async function getSlackUsers(accessToken: string): Promise<SlackUserInfo[]> {
  const client = createSlackClient(accessToken);
  const users: SlackUserInfo[] = [];

  try {
    let cursor: string | undefined;

    do {
      const result = await client.users.list({
        cursor,
        limit: 1000,
      });

      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }

      if (result.members) {
        users.push(...(result.members as SlackUserInfo[]));
      }

      cursor = result.response_metadata?.next_cursor;
    } while (cursor);

    return users;
  } catch (error) {
    console.error('Failed to get Slack users:', error);
    throw new Error(
      `Failed to get Slack users: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Gets all channels from Slack workspace
 */
export async function getSlackChannels(accessToken: string): Promise<SlackChannelInfo[]> {
  const client = createSlackClient(accessToken);
  const channels: SlackChannelInfo[] = [];

  try {
    // Get public channels
    let cursor: string | undefined;

    do {
      const result = await client.conversations.list({
        cursor,
        limit: 1000,
        types: 'public_channel,private_channel',
        exclude_archived: false,
      });

      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }

      if (result.channels) {
        channels.push(...(result.channels as SlackChannelInfo[]));
      }

      cursor = result.response_metadata?.next_cursor;
    } while (cursor);

    return channels;
  } catch (error) {
    console.error('Failed to get Slack channels:', error);
    throw new Error(
      `Failed to get Slack channels: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Posts a message to a Slack channel
 */
export async function postSlackMessage(
  channelId: string,
  text: string,
  accessToken: string,
  asUser?: string
): Promise<SlackMessageResult> {
  const client = createSlackClient(accessToken);

  try {
    const options: any = {
      channel: channelId,
      text,
    };

    if (asUser) {
      options.as_user = true;
      options.username = asUser;
    }

    const result = await client.chat.postMessage(options);

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    return result as SlackMessageResult;
  } catch (error) {
    console.error('Failed to post Slack message:', error);
    throw new Error(
      `Failed to post Slack message: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Tests Slack API connection
 */
export async function testSlackConnection(accessToken: string): Promise<boolean> {
  const client = createSlackClient(accessToken);

  try {
    const result = await client.auth.test();
    return result.ok === true;
  } catch (error) {
    console.error('Slack connection test failed:', error);
    return false;
  }
}

/**
 * Gets Slack workspace information
 */
export async function getSlackTeamInfo(accessToken: string): Promise<any> {
  const client = createSlackClient(accessToken);

  try {
    const result = await client.team.info();

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    return result.team;
  } catch (error) {
    console.error('Failed to get Slack team info:', error);
    throw new Error(
      `Failed to get Slack team info: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Checks if user has permission to post to a channel
 */
export async function checkChannelPermissions(
  channelId: string,
  userId: string,
  accessToken: string
): Promise<boolean> {
  const client = createSlackClient(accessToken);

  try {
    const result = await client.conversations.info({
      channel: channelId,
    });

    if (!result.ok) {
      return false;
    }

    // For public channels, all users can typically post
    // For private channels, need to check membership
    if (result.channel?.is_private) {
      const membersResult = await client.conversations.members({
        channel: channelId,
      });

      if (!membersResult.ok) {
        return false;
      }

      return membersResult.members?.includes(userId) || false;
    }

    return true;
  } catch (error) {
    console.error('Failed to check channel permissions:', error);
    return false;
  }
}

/**
 * Slack configuration validation utility
 */
export function checkSlackConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    validateSlackConfig(defaultSlackConfig);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown configuration error');
  }

  // Check for security warnings
  if (
    process.env.NODE_ENV === 'production' &&
    defaultSlackConfig.redirectUri.includes('localhost')
  ) {
    errors.push('Production environment should not use localhost redirect URI');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

# Data Model: Send a Message to Multiple Channels

**Phase**: Phase 1 - Data Model Design
**Date**: September 9, 2025

## Entity Definitions

### User

**Purpose**: Represents the application user who creates channel lists and sends messages
**Storage**: Firebase Authentication + Firestore user profile

```typescript
interface User {
  uid: string; // Firebase Auth UID (primary key)
  email: string; // User email from Slack OAuth
  slackUserId: string; // Slack user ID
  displayName: string; // Display name from Slack
  avatar?: string; // Profile picture URL
  slackTeamId: string; // Slack workspace/team ID
  createdAt: Timestamp; // Account creation time
  lastLoginAt: Timestamp; // Last login timestamp
  isActive: boolean; // Account status
}
```

**Validation Rules**:

- `uid` must be valid Firebase Auth UID
- `email` must be valid email format
- `slackUserId` must be unique per workspace
- `displayName` required, max 100 characters

### SlackUser

**Purpose**: Represents selectable senders from the Slack workspace
**Storage**: Firestore collection, synced from Slack API

```typescript
interface SlackUser {
  id: string; // Slack user ID (primary key)
  teamId: string; // Slack workspace/team ID
  name: string; // Username (e.g., @john.doe)
  displayName: string; // Display name
  realName?: string; // Full real name
  avatar: string; // Profile image URL
  isBot: boolean; // Whether user is a bot
  isActive: boolean; // Whether user is active in workspace
  hasPostingPermission: boolean; // Whether user can post to channels
  lastSyncAt: Timestamp; // Last sync from Slack API
}
```

**Validation Rules**:

- `id` must be valid Slack user ID format
- `hasPostingPermission` must be true for selectable senders
- `isActive` and `!isBot` required for message senders

### Channel

**Purpose**: Represents a Slack channel that can receive messages
**Storage**: Firestore collection, synced from Slack API

```typescript
interface Channel {
  id: string; // Slack channel ID (primary key)
  teamId: string; // Slack workspace/team ID
  name: string; // Channel name without #
  displayName: string; // Full channel name with #
  purpose?: string; // Channel purpose/description
  topic?: string; // Channel topic
  isPrivate: boolean; // Whether channel is private
  isArchived: boolean; // Whether channel is archived
  memberCount: number; // Number of channel members
  isDeleted: boolean; // Marked as deleted (auto-updated)
  lastSyncAt: Timestamp; // Last sync from Slack API
}
```

**Validation Rules**:

- `id` must be valid Slack channel ID format
- `isDeleted` channels are excluded from messaging
- `isArchived` channels should show warning but allow selection

### ChannelList

**Purpose**: User-defined groups of channels for batch messaging
**Storage**: Firestore collection

```typescript
interface ChannelList {
  id: string; // Auto-generated document ID
  ownerId: string; // User UID who owns this list
  name: string; // User-defined list name
  description?: string; // Optional description
  channelIds: string[]; // Array of Slack channel IDs
  channelCount: number; // Computed field for quick access
  isActive: boolean; // Whether list is active
  createdAt: Timestamp; // Creation timestamp
  updatedAt: Timestamp; // Last modification timestamp
  lastUsedAt?: Timestamp; // Last time used for messaging
}
```

**Validation Rules**:

- `name` required, max 100 characters, unique per user
- `channelIds` max 100 items (business rule)
- `channelIds` must reference existing Channel documents
- `ownerId` must reference existing User

### Message

**Purpose**: Represents a message sent to multiple channels
**Storage**: Firestore collection

```typescript
interface Message {
  id: string; // Auto-generated document ID
  senderId: string; // User UID who sent the message
  selectedSenderId: string; // Slack user ID of chosen sender
  channelListId: string; // Reference to ChannelList used
  content: string; // Message text content
  status: MessageStatus; // Overall message status
  totalChannels: number; // Total channels targeted
  successCount: number; // Successfully delivered count
  failureCount: number; // Failed delivery count
  skipCount: number; // Skipped (deleted) channels count
  createdAt: Timestamp; // Message creation time
  sentAt?: Timestamp; // When sending started
  completedAt?: Timestamp; // When sending completed
}

enum MessageStatus {
  DRAFT = 'draft',
  SENDING = 'sending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
```

**Validation Rules**:

- `content` required, max 4000 characters (Slack limit)
- `selectedSenderId` must reference valid SlackUser
- `channelListId` must reference existing ChannelList
- `totalChannels` must equal channelIds length from ChannelList

### MessageDelivery

**Purpose**: Tracks individual channel delivery results
**Storage**: Firestore subcollection under Message

```typescript
interface MessageDelivery {
  id: string; // Auto-generated document ID
  messageId: string; // Parent Message ID
  channelId: string; // Target Slack channel ID
  channelName: string; // Channel name for display
  status: DeliveryStatus; // Delivery status
  slackMessageId?: string; // Slack message ID if successful
  errorCode?: string; // Error code if failed
  errorMessage?: string; // Human-readable error message
  retryCount: number; // Number of retry attempts
  sentAt?: Timestamp; // When delivery was attempted
  completedAt?: Timestamp; // When delivery completed (success/fail)
}

enum DeliveryStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}
```

**Validation Rules**:

- `messageId` must reference existing Message
- `channelId` must reference existing Channel
- `slackMessageId` required when status is SUCCESS
- `errorMessage` required when status is FAILED

## Relationships

### User Relationships

- User (1) → ChannelList (many): One user owns multiple channel lists
- User (1) → Message (many): One user sends multiple messages

### Channel Relationships

- Channel (many) ← ChannelList (many): Many-to-many via channelIds array
- Channel (1) → MessageDelivery (many): One channel receives many deliveries

### Message Relationships

- Message (1) → MessageDelivery (many): One message has multiple deliveries
- Message (many) → ChannelList (1): Many messages can use same channel list
- Message (many) → SlackUser (1): Many messages can use same sender

## State Transitions

### Message Status Flow

```
DRAFT → SENDING → COMPLETED
  ↓       ↓
  ↓    FAILED
  ↓
FAILED (if validation fails)
```

### MessageDelivery Status Flow

```
PENDING → SUCCESS
   ↓
   ↓ → FAILED (after retries)
   ↓
   ↓ → SKIPPED (deleted channels)
```

## Firestore Collections Structure

```
users/{uid}
channels/{channelId}
slackUsers/{slackUserId}
channelLists/{listId}
messages/{messageId}
  └── deliveries/{deliveryId}
```

## Security Rules Considerations

- Users can only read/write their own data
- Channel and SlackUser data is workspace-scoped
- ChannelList ownership validation required
- Message creation requires valid sender selection
- MessageDelivery is read-only after creation

## Performance Considerations

- Index on `User.slackTeamId` for workspace queries
- Index on `ChannelList.ownerId` for user's lists
- Index on `Message.senderId` + `createdAt` for user's message history
- Composite index on `Channel.teamId` + `isDeleted` for active channels

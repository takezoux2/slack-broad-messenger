# Slack Broad Messenger API Documentation

This document provides comprehensive API documentation for the Slack Broad Messenger application. All API endpoints are implemented as Next.js API routes and follow RESTful conventions.

## Base URL

```
Local Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

All protected endpoints require authentication via Firebase Authentication. Include the Firebase ID token in the Authorization header:

```http
Authorization: Bearer <firebase-id-token>
```

Authentication status is managed via middleware that automatically validates tokens and provides user context.

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message",
  "details": [
    {
      "field": "fieldName",
      "message": "Field-specific error",
      "code": "VALIDATION_ERROR"
    }
  ]
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Standard endpoints**: 100 requests per minute per user
- **Message sending**: 10 requests per minute per user
- **Authentication**: 20 requests per minute per IP

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
```

## Authentication Endpoints

### Initiate Slack OAuth

**GET** `/api/auth/slack`

Initiates the Slack OAuth flow by redirecting to Slack's authorization URL.

#### Query Parameters

| Parameter      | Type   | Required | Description                                        |
| -------------- | ------ | -------- | -------------------------------------------------- |
| `redirect_url` | string | No       | URL to redirect to after successful authentication |

#### Response

```json
{
  "success": true,
  "redirectUrl": "https://slack.com/oauth/v2/authorize?..."
}
```

#### Example

```bash
curl -X GET "http://localhost:3000/api/auth/slack?redirect_url=/dashboard"
```

### Slack OAuth Callback

**GET** `/api/auth/slack/callback`

Handles the OAuth callback from Slack and completes the authentication process.

#### Query Parameters

| Parameter | Type   | Required | Description                         |
| --------- | ------ | -------- | ----------------------------------- |
| `code`    | string | Yes      | OAuth authorization code from Slack |
| `state`   | string | Yes      | OAuth state parameter for security  |

#### Response

```json
{
  "success": true,
  "user": {
    "uid": "firebase-uid-123",
    "email": "user@example.com",
    "displayName": "John Doe",
    "slackUserId": "U1234567890",
    "slackTeamId": "T1234567890"
  }
}
```

#### Error Codes

- `INVALID_CODE`: OAuth code is invalid or expired
- `STATE_MISMATCH`: OAuth state parameter doesn't match
- `SLACK_API_ERROR`: Error communicating with Slack API
- `USER_NOT_FOUND`: Firebase user not found

## Channel Endpoints

### List Channels

**GET** `/api/channels`

Retrieves all accessible Slack channels for the authenticated user's workspace.

#### Headers

```http
Authorization: Bearer <firebase-id-token>
```

#### Query Parameters

| Parameter          | Type    | Required | Description                                                             |
| ------------------ | ------- | -------- | ----------------------------------------------------------------------- |
| `include_archived` | boolean | No       | Include archived channels (default: false)                              |
| `types`            | string  | No       | Comma-separated channel types: `public_channel,private_channel,im,mpim` |
| `limit`            | number  | No       | Maximum number of channels to return (default: 100, max: 200)           |
| `cursor`           | string  | No       | Pagination cursor for next page                                         |

#### Response

```json
{
  "success": true,
  "data": {
    "channels": [
      {
        "id": "C1234567890",
        "name": "general",
        "displayName": "General",
        "isPrivate": false,
        "isArchived": false,
        "isDeleted": false,
        "hasBotAccess": true,
        "memberCount": 25,
        "purpose": "Company-wide announcements",
        "topic": "Welcome to our workspace!",
        "creator": "U1234567890",
        "created": 1640995200,
        "lastActivity": 1642694400
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 100,
      "cursor": "next-page-cursor",
      "hasMore": true
    }
  }
}
```

#### Example

```bash
curl -X GET "http://localhost:3000/api/channels?include_archived=false&limit=50" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### Get Channel Details

**GET** `/api/channels/:channelId`

Retrieves detailed information about a specific channel.

#### Parameters

| Parameter   | Type   | Required | Description      |
| ----------- | ------ | -------- | ---------------- |
| `channelId` | string | Yes      | Slack channel ID |

#### Response

```json
{
  "success": true,
  "data": {
    "id": "C1234567890",
    "name": "general",
    "displayName": "General",
    "isPrivate": false,
    "isArchived": false,
    "hasBotAccess": true,
    "memberCount": 25,
    "members": ["U1234567890", "U0987654321"],
    "purpose": "Company-wide announcements",
    "topic": "Welcome to our workspace!",
    "creator": "U1234567890",
    "created": 1640995200,
    "lastActivity": 1642694400
  }
}
```

## User Endpoints

### List Slack Users

**GET** `/api/slack-users`

Retrieves all users from the authenticated user's Slack workspace.

#### Headers

```http
Authorization: Bearer <firebase-id-token>
```

#### Query Parameters

| Parameter         | Type    | Required | Description                               |
| ----------------- | ------- | -------- | ----------------------------------------- |
| `include_bots`    | boolean | No       | Include bot users (default: false)        |
| `include_deleted` | boolean | No       | Include deleted users (default: false)    |
| `active_only`     | boolean | No       | Only include active users (default: true) |

#### Response

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "U1234567890",
        "name": "john.doe",
        "displayName": "John Doe",
        "realName": "John Doe",
        "email": "john@example.com",
        "isBot": false,
        "isActive": true,
        "isDeleted": false,
        "hasPostingPermission": true,
        "avatar": "https://avatars.slack-edge.com/...",
        "title": "Software Engineer",
        "timezone": "America/New_York",
        "lastSeen": 1642694400
      }
    ],
    "total": 42
  }
}
```

#### Example

```bash
curl -X GET "http://localhost:3000/api/slack-users?active_only=true" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

## Channel List Endpoints

### Get Channel Lists

**GET** `/api/channel-lists`

Retrieves all channel lists created by the authenticated user.

#### Headers

```http
Authorization: Bearer <firebase-id-token>
```

#### Query Parameters

| Parameter          | Type    | Required | Description                                   |
| ------------------ | ------- | -------- | --------------------------------------------- |
| `active_only`      | boolean | No       | Only include active lists (default: true)     |
| `include_channels` | boolean | No       | Include full channel details (default: false) |

#### Response

```json
{
  "success": true,
  "data": {
    "channelLists": [
      {
        "id": "cl_1234567890",
        "name": "Marketing Channels",
        "description": "All marketing-related channels",
        "channelIds": ["C1234567890", "C0987654321"],
        "channelCount": 2,
        "isActive": true,
        "userId": "firebase-uid-123",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-02T00:00:00Z",
        "channels": [
          {
            "id": "C1234567890",
            "name": "marketing-general",
            "displayName": "Marketing General"
          }
        ]
      }
    ],
    "total": 5
  }
}
```

### Create Channel List

**POST** `/api/channel-lists`

Creates a new channel list for the authenticated user.

#### Headers

```http
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

#### Request Body

```json
{
  "name": "Marketing Channels",
  "description": "All marketing-related channels",
  "channelIds": ["C1234567890", "C0987654321"]
}
```

#### Validation Rules

- `name`: Required, 1-100 characters, unique per user
- `description`: Optional, max 500 characters
- `channelIds`: Required, array of valid Slack channel IDs, max 50 channels

#### Response

```json
{
  "success": true,
  "data": {
    "id": "cl_1234567890",
    "name": "Marketing Channels",
    "description": "All marketing-related channels",
    "channelIds": ["C1234567890", "C0987654321"],
    "channelCount": 2,
    "isActive": true,
    "userId": "firebase-uid-123",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Example

```bash
curl -X POST "http://localhost:3000/api/channel-lists" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marketing Channels",
    "description": "All marketing-related channels",
    "channelIds": ["C1234567890", "C0987654321"]
  }'
```

### Get Channel List

**GET** `/api/channel-lists/:listId`

Retrieves a specific channel list by ID.

#### Parameters

| Parameter | Type   | Required | Description     |
| --------- | ------ | -------- | --------------- |
| `listId`  | string | Yes      | Channel list ID |

#### Response

```json
{
  "success": true,
  "data": {
    "id": "cl_1234567890",
    "name": "Marketing Channels",
    "description": "All marketing-related channels",
    "channelIds": ["C1234567890", "C0987654321"],
    "channelCount": 2,
    "channels": [
      {
        "id": "C1234567890",
        "name": "marketing-general",
        "displayName": "Marketing General",
        "isPrivate": false,
        "isArchived": false,
        "hasBotAccess": true
      }
    ],
    "isActive": true,
    "userId": "firebase-uid-123",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T00:00:00Z"
  }
}
```

### Update Channel List

**PUT** `/api/channel-lists/:listId`

Updates an existing channel list.

#### Parameters

| Parameter | Type   | Required | Description     |
| --------- | ------ | -------- | --------------- |
| `listId`  | string | Yes      | Channel list ID |

#### Request Body

```json
{
  "name": "Updated Marketing Channels",
  "description": "Updated description",
  "channelIds": ["C1234567890", "C0987654321", "C1111111111"]
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "cl_1234567890",
    "name": "Updated Marketing Channels",
    "description": "Updated description",
    "channelIds": ["C1234567890", "C0987654321", "C1111111111"],
    "channelCount": 3,
    "isActive": true,
    "userId": "firebase-uid-123",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T12:00:00Z"
  }
}
```

### Delete Channel List

**DELETE** `/api/channel-lists/:listId`

Deletes a channel list (soft delete - sets isActive to false).

#### Parameters

| Parameter | Type   | Required | Description     |
| --------- | ------ | -------- | --------------- |
| `listId`  | string | Yes      | Channel list ID |

#### Response

```json
{
  "success": true,
  "message": "Channel list deleted successfully"
}
```

## Message Endpoints

### Send Message

**POST** `/api/messages`

Sends a message to multiple channels based on a channel list.

#### Headers

```http
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

#### Request Body

```json
{
  "channelListId": "cl_1234567890",
  "text": "Hello everyone! This is a test message.",
  "sendAsUser": "U1234567890",
  "scheduling": {
    "sendAt": "2024-01-01T12:00:00Z"
  },
  "options": {
    "unfurlLinks": true,
    "unfurlMedia": false,
    "asBot": false
  }
}
```

#### Validation Rules

- `channelListId`: Required, must exist and be owned by user
- `text`: Required, 1-4000 characters
- `sendAsUser`: Optional, must be valid Slack user ID with posting permissions
- `sendAt`: Optional, must be future timestamp for scheduled messages

#### Response

```json
{
  "success": true,
  "data": {
    "messageId": "msg_1234567890",
    "channelListId": "cl_1234567890",
    "text": "Hello everyone! This is a test message.",
    "sendAsUser": "U1234567890",
    "status": "pending",
    "totalChannels": 3,
    "deliveries": [
      {
        "channelId": "C1234567890",
        "channelName": "marketing-general",
        "status": "pending",
        "scheduledAt": "2024-01-01T00:00:00Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Example

```bash
curl -X POST "http://localhost:3000/api/messages" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channelListId": "cl_1234567890",
    "text": "Hello everyone! This is a test message.",
    "sendAsUser": "U1234567890"
  }'
```

### Get Messages

**GET** `/api/messages`

Retrieves messages sent by the authenticated user.

#### Headers

```http
Authorization: Bearer <firebase-id-token>
```

#### Query Parameters

| Parameter       | Type   | Required | Description                                                   |
| --------------- | ------ | -------- | ------------------------------------------------------------- |
| `status`        | string | No       | Filter by status: `pending`, `sending`, `completed`, `failed` |
| `limit`         | number | No       | Number of messages to return (default: 20, max: 100)          |
| `offset`        | number | No       | Number of messages to skip                                    |
| `channelListId` | string | No       | Filter by channel list ID                                     |

#### Response

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_1234567890",
        "channelListId": "cl_1234567890",
        "channelListName": "Marketing Channels",
        "text": "Hello everyone! This is a test message.",
        "sendAsUser": "U1234567890",
        "sendAsUserName": "John Doe",
        "status": "completed",
        "totalChannels": 3,
        "successfulDeliveries": 3,
        "failedDeliveries": 0,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:01:00Z"
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### Get Message Details

**GET** `/api/messages/:messageId`

Retrieves detailed information about a specific message including delivery status.

#### Parameters

| Parameter   | Type   | Required | Description |
| ----------- | ------ | -------- | ----------- |
| `messageId` | string | Yes      | Message ID  |

#### Response

```json
{
  "success": true,
  "data": {
    "id": "msg_1234567890",
    "channelListId": "cl_1234567890",
    "channelListName": "Marketing Channels",
    "text": "Hello everyone! This is a test message.",
    "sendAsUser": "U1234567890",
    "sendAsUserName": "John Doe",
    "status": "completed",
    "totalChannels": 3,
    "successfulDeliveries": 3,
    "failedDeliveries": 0,
    "deliveries": [
      {
        "id": "del_1234567890",
        "channelId": "C1234567890",
        "channelName": "marketing-general",
        "status": "delivered",
        "slackTimestamp": "1642694400.123456",
        "sentAt": "2024-01-01T00:00:30Z",
        "error": null
      },
      {
        "id": "del_0987654321",
        "channelId": "C0987654321",
        "channelName": "marketing-campaigns",
        "status": "failed",
        "error": "channel_not_found",
        "errorMessage": "Channel not found",
        "retryCount": 2,
        "lastRetryAt": "2024-01-01T00:02:00Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:01:00Z"
  }
}
```

### Get Delivery Reports

**GET** `/api/messages/deliveries`

Retrieves delivery reports for messages, optionally filtered by various criteria.

#### Headers

```http
Authorization: Bearer <firebase-id-token>
```

#### Query Parameters

| Parameter   | Type   | Required | Description                                         |
| ----------- | ------ | -------- | --------------------------------------------------- |
| `messageId` | string | No       | Filter by specific message ID                       |
| `channelId` | string | No       | Filter by specific channel ID                       |
| `status`    | string | No       | Filter by delivery status                           |
| `from`      | string | No       | Start date (ISO 8601)                               |
| `to`        | string | No       | End date (ISO 8601)                                 |
| `limit`     | number | No       | Number of records to return (default: 50, max: 200) |
| `offset`    | number | No       | Number of records to skip                           |

#### Response

```json
{
  "success": true,
  "data": {
    "deliveries": [
      {
        "id": "del_1234567890",
        "messageId": "msg_1234567890",
        "channelId": "C1234567890",
        "channelName": "marketing-general",
        "messageText": "Hello everyone!",
        "status": "delivered",
        "slackTimestamp": "1642694400.123456",
        "sentAt": "2024-01-01T00:00:30Z",
        "retryCount": 0,
        "error": null
      }
    ],
    "summary": {
      "totalDeliveries": 150,
      "successful": 145,
      "failed": 3,
      "pending": 2,
      "successRate": 0.967
    },
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### Retry Failed Delivery

**POST** `/api/messages/deliveries/:deliveryId/retry`

Retries a failed message delivery to a specific channel.

#### Parameters

| Parameter    | Type   | Required | Description |
| ------------ | ------ | -------- | ----------- |
| `deliveryId` | string | Yes      | Delivery ID |

#### Response

```json
{
  "success": true,
  "data": {
    "id": "del_1234567890",
    "status": "pending",
    "retryCount": 3,
    "lastRetryAt": "2024-01-01T00:05:00Z"
  }
}
```

## Error Codes

### Authentication Errors

| Code                  | Description                              |
| --------------------- | ---------------------------------------- |
| `UNAUTHORIZED`        | Missing or invalid authentication token  |
| `TOKEN_EXPIRED`       | Firebase ID token has expired            |
| `USER_NOT_FOUND`      | User not found in Firebase               |
| `SLACK_TOKEN_INVALID` | Slack access token is invalid or expired |

### Validation Errors

| Code                     | Description                    |
| ------------------------ | ------------------------------ |
| `VALIDATION_ERROR`       | Request data failed validation |
| `MISSING_REQUIRED_FIELD` | Required field is missing      |
| `INVALID_FORMAT`         | Field format is invalid        |
| `DUPLICATE_NAME`         | Name already exists            |
| `LIMIT_EXCEEDED`         | Resource limit exceeded        |

### Resource Errors

| Code                     | Description                          |
| ------------------------ | ------------------------------------ |
| `NOT_FOUND`              | Requested resource not found         |
| `ACCESS_DENIED`          | User doesn't have access to resource |
| `RESOURCE_DELETED`       | Resource has been deleted            |
| `CHANNEL_NOT_ACCESSIBLE` | Bot doesn't have access to channel   |

### Rate Limiting Errors

| Code                  | Description                  |
| --------------------- | ---------------------------- |
| `RATE_LIMIT_EXCEEDED` | Too many requests            |
| `QUOTA_EXCEEDED`      | Daily/monthly quota exceeded |

### External Service Errors

| Code                  | Description                              |
| --------------------- | ---------------------------------------- |
| `SLACK_API_ERROR`     | Error from Slack API                     |
| `FIREBASE_ERROR`      | Error from Firebase                      |
| `NETWORK_ERROR`       | Network connectivity issue               |
| `SERVICE_UNAVAILABLE` | External service temporarily unavailable |

## Webhooks

### Slack Events

The application can receive webhook events from Slack for real-time updates.

**POST** `/api/webhooks/slack`

#### Event Types

- `channel_archive` - Channel archived
- `channel_unarchive` - Channel unarchived
- `channel_rename` - Channel renamed
- `member_joined_channel` - User joined channel
- `member_left_channel` - User left channel

#### Example Event

```json
{
  "token": "verification-token",
  "team_id": "T1234567890",
  "api_app_id": "A1234567890",
  "event": {
    "type": "channel_rename",
    "channel": {
      "id": "C1234567890",
      "name": "new-channel-name",
      "created": 1642694400
    },
    "event_ts": "1642694400.123456"
  },
  "type": "event_callback",
  "event_id": "Ev1234567890",
  "event_time": 1642694400
}
```

## SDK Usage Examples

### JavaScript/TypeScript

```typescript
// Initialize API client
const apiClient = new SlackBroadMessengerAPI({
  baseUrl: 'http://localhost:3000/api',
  getToken: () => firebase.auth().currentUser?.getIdToken(),
});

// Create a channel list
const channelList = await apiClient.channelLists.create({
  name: 'Marketing Channels',
  description: 'All marketing-related channels',
  channelIds: ['C1234567890', 'C0987654321'],
});

// Send a message
const message = await apiClient.messages.send({
  channelListId: channelList.id,
  text: 'Hello everyone!',
  sendAsUser: 'U1234567890',
});

// Monitor delivery status
const deliveries = await apiClient.messages.getDeliveries(message.id);
```

### cURL Examples

```bash
# Get channels
curl -X GET "http://localhost:3000/api/channels" \
  -H "Authorization: Bearer $FIREBASE_TOKEN"

# Create channel list
curl -X POST "http://localhost:3000/api/channel-lists" \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test List","channelIds":["C1234567890"]}'

# Send message
curl -X POST "http://localhost:3000/api/messages" \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channelListId":"cl_123","text":"Hello!"}'
```

## Performance Considerations

- **Caching**: API responses are cached for 5-15 minutes depending on data type
- **Pagination**: Large datasets are paginated to improve performance
- **Rate Limiting**: Built-in rate limiting prevents API abuse
- **Batch Operations**: Use batch endpoints when possible for better efficiency
- **Background Processing**: Message sending is handled asynchronously

## Security Best Practices

- Always validate Firebase ID tokens on protected endpoints
- Store Slack tokens securely in Firebase
- Validate all input data before processing
- Implement proper CORS policies
- Use HTTPS in production
- Log security events for monitoring
- Regularly rotate API keys and secrets

## Support

For API support and questions:

1. Check this documentation for endpoint details
2. Review error codes and troubleshooting section
3. Create an issue in the repository with API-specific details
4. Include request/response examples when reporting issues

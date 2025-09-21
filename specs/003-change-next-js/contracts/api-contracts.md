# API Route Handler Contracts

## Contract Verification Strategy

This document defines the contracts that must be maintained during the Pages Router to App Router migration. All existing API behavior must be preserved exactly.

## Authentication Endpoints

### GET /api/auth/profile

- **Request**: Headers with Authorization bearer token
- **Response**: User profile object with identical structure
- **Status Codes**: 200 (success), 401 (unauthorized), 500 (error)

### POST /api/auth/signout

- **Request**: Session context
- **Response**: Success confirmation
- **Status Codes**: 200 (success), 500 (error)

### POST /api/auth/google/signin

- **Request**: Google OAuth initiation
- **Response**: Redirect URL or error
- **Status Codes**: 200 (success), 400 (bad request), 500 (error)

### GET /api/auth/google/callback

- **Request**: OAuth callback with code parameter
- **Response**: Session establishment or error
- **Status Codes**: 302 (redirect), 400 (bad request), 500 (error)

## Channel Management Endpoints

### GET /api/channels

- **Request**: Authenticated request
- **Response**: Array of Slack channels
- **Status Codes**: 200 (success), 401 (unauthorized), 500 (error)

### GET /api/channel-lists

- **Request**: Authenticated request with optional query params
- **Response**: Array of channel lists
- **Status Codes**: 200 (success), 401 (unauthorized), 500 (error)

### POST /api/channel-lists

- **Request**: Channel list creation data
- **Response**: Created channel list object
- **Status Codes**: 201 (created), 400 (validation error), 401 (unauthorized), 500 (error)

### GET /api/channel-lists/[listId]

- **Request**: List ID parameter
- **Response**: Channel list object
- **Status Codes**: 200 (success), 404 (not found), 401 (unauthorized), 500 (error)

### PUT /api/channel-lists/[listId]

- **Request**: List ID parameter and update data
- **Response**: Updated channel list object
- **Status Codes**: 200 (success), 404 (not found), 400 (validation error), 401 (unauthorized), 500 (error)

### DELETE /api/channel-lists/[listId]

- **Request**: List ID parameter
- **Response**: Deletion confirmation
- **Status Codes**: 204 (no content), 404 (not found), 401 (unauthorized), 500 (error)

## Message Management Endpoints

### GET /api/messages

- **Request**: Authenticated request with optional query params
- **Response**: Array of messages
- **Status Codes**: 200 (success), 401 (unauthorized), 500 (error)

### POST /api/messages

- **Request**: Message creation data
- **Response**: Created message object
- **Status Codes**: 201 (created), 400 (validation error), 401 (unauthorized), 500 (error)

### GET /api/messages/[messageId]

- **Request**: Message ID parameter
- **Response**: Message object
- **Status Codes**: 200 (success), 404 (not found), 401 (unauthorized), 500 (error)

### GET /api/messages/[messageId]/deliveries

- **Request**: Message ID parameter
- **Response**: Array of delivery statuses
- **Status Codes**: 200 (success), 404 (not found), 401 (unauthorized), 500 (error)

## User Management Endpoints

### GET /api/slack-users

- **Request**: Authenticated request
- **Response**: Array of Slack workspace users
- **Status Codes**: 200 (success), 401 (unauthorized), 500 (error)

## Legacy Endpoints

### POST /api/send-message

- **Request**: Message sending data (legacy format)
- **Response**: Sending confirmation
- **Status Codes**: 200 (success), 400 (validation error), 401 (unauthorized), 500 (error)

## Contract Testing Requirements

Each endpoint must have:

1. **Request validation**: Same input validation rules
2. **Response format**: Identical JSON structure
3. **Error handling**: Same error response format
4. **Status codes**: Exact HTTP status code mapping
5. **Headers**: Same CORS and security headers
6. **Authentication**: Identical auth middleware behavior

## Migration Validation Process

For each route migration:

1. Run existing contract tests against new App Router implementation
2. Verify all tests pass without modification
3. Compare response times and memory usage
4. Validate authentication flows work identically
5. Confirm error scenarios produce same responses

# Data Model: API Route Migration

## Entity Overview

The migration preserves all existing data structures and API contracts. No data model changes are required - only route handler implementation patterns change.

## API Route Entities

### Authentication Routes

- **Auth Profile**: `/api/auth/profile` - User profile management
- **Auth Signout**: `/api/auth/signout` - Session termination
- **Google Auth**: `/api/auth/google/signin`, `/api/auth/google/callback` - Google OAuth flow
- **Slack Auth**: `/api/auth/slack`, `/api/auth/slack/callback` - Slack OAuth flow

### Channel Management

- **Channels**: `/api/channels` - Slack channel listing and management
- **Channel Lists**: `/api/channel-lists` - Custom channel list CRUD
- **Channel List Item**: `/api/channel-lists/[listId]` - Individual channel list operations

### Message Management

- **Messages**: `/api/messages` - Message creation and listing
- **Message Detail**: `/api/messages/[messageId]` - Individual message operations
- **Message Deliveries**: `/api/messages/[messageId]/deliveries` - Delivery status tracking

### User Management

- **Slack Users**: `/api/slack-users` - Slack workspace user management
- **Send Message**: `/api/send-message` - Legacy message sending endpoint

## Route Handler Patterns

### Request/Response Structure Preservation

All existing request and response formats must remain identical:

**Authentication Context**:

- Headers: `Authorization: Bearer <token>`
- Session validation patterns
- Error response formats

**Request Bodies**:

- JSON payloads maintain same structure
- Query parameters preserve naming and validation
- File uploads (if any) use same multipart handling

**Response Formats**:

- HTTP status codes remain identical
- JSON response structure unchanged
- Error message formats preserved
- Headers (CORS, Content-Type) maintained

### Middleware Requirements

**Authentication Middleware**:

- Firebase Auth token validation
- Session management
- Permission checks

**CORS Handling**:

- Cross-origin request support
- Preflight OPTIONS handling
- Security headers

**Request Validation**:

- Input sanitization
- Schema validation
- Rate limiting

## Migration Constraints

### Zero Breaking Changes

- API endpoints URLs unchanged
- Request/response schemas identical
- Authentication flows preserved
- Error handling behavior maintained

### Performance Requirements

- Response time parity with Pages Router
- Memory usage optimization
- Edge runtime compatibility where beneficial

### Testing Validation

- All existing contract tests must pass
- Integration tests verify identical behavior
- E2E tests confirm user flows work unchanged

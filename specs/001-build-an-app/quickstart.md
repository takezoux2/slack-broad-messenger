# Quickstart Guide: Slack Broad Messenger

**Phase**: Phase 1 - Integration Test Scenarios
**Date**: September 9, 2025

## Prerequisites

### Development Environment

1. Node.js 18+ installed
2. Firebase CLI installed (`npm install -g firebase-tools`)
3. Slack workspace with admin access for app creation
4. Git repository cloned locally

### Configuration Setup

1. Firebase project created with Authentication and Firestore enabled
2. Slack app created with appropriate OAuth scopes
3. Environment variables configured (see `.env.example`)

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
cd slack-broad-messenger
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your Firebase and Slack credentials
```

### 3. Start Development Environment

```bash
# Terminal 1: Start Firebase Emulator
npm run dev:firebase

# Terminal 2: Start Next.js development server
npm run dev
```

### 4. Verify Installation

- Open http://localhost:3000
- Click "Sign in with Slack"
- Complete OAuth flow
- Verify dashboard loads

## User Story Validation Tests

### Story 1: Create and Edit Channel Lists

**Scenario**: User can manage channel lists for organized messaging

**Test Steps**:

1. Navigate to dashboard after authentication
2. Click "Create Channel List" button
3. Enter list name: "Marketing Channels"
4. Select 3-5 channels from the channel picker
5. Save the channel list
6. Verify list appears in "My Channel Lists"
7. Click edit icon on the created list
8. Add 2 more channels
9. Update the name to "Marketing Team Channels"
10. Save changes

**Expected Results**:

- ✅ Channel list creation form validates inputs
- ✅ Channel picker shows only non-deleted channels
- ✅ List saves successfully with correct channel count
- ✅ List appears immediately in the dashboard
- ✅ Edit functionality updates the list properly
- ✅ Channel count updates after editing

### Story 2: Send Message to Multiple Channels

**Scenario**: User can send a single message to all channels in a list

**Test Steps**:

1. Click "Send Message" button
2. Select "Marketing Team Channels" from dropdown
3. Enter message: "🎉 Weekly team update: All projects on track!"
4. Select sender from user dropdown
5. Review selected channels preview
6. Click "Send Message"
7. Monitor real-time sending progress
8. Review final delivery report

**Expected Results**:

- ✅ Channel list dropdown shows only user's lists
- ✅ Message input validates length (max 4000 chars)
- ✅ Sender dropdown shows only users with posting permission
- ✅ Preview shows all selected channels with status
- ✅ Sending progress updates in real-time
- ✅ Final report shows success/failure per channel
- ✅ Failed channels include specific error messages

### Story 3: Handle Validation Errors

**Scenario**: System prevents invalid message sending attempts

**Test Steps**:

1. Try to send message without selecting channel list
2. Try to send message without selecting sender
3. Try to send message with empty content
4. Try to send message with 4001+ characters
5. Try to create channel list with >100 channels

**Expected Results**:

- ✅ Error: "Please select a channel list"
- ✅ Error: "Please select a sender"
- ✅ Error: "Message content is required"
- ✅ Error: "Message too long (max 4000 characters)"
- ✅ Error: "Maximum 100 channels per list"

### Story 4: Handle Partial Failures

**Scenario**: System gracefully handles when some channels fail

**Test Steps**:

1. Create channel list with mix of valid/archived channels
2. Send test message to this list
3. Review delivery report
4. Verify specific failure reasons shown

**Expected Results**:

- ✅ Valid channels receive message successfully
- ✅ Archived channels show "Channel archived" error
- ✅ Deleted channels are automatically skipped
- ✅ Final report shows: X successful, Y failed, Z skipped
- ✅ Each failure includes channel name and reason

## Performance Validation Tests

### Test 1: Channel List Performance

**Scenario**: App handles large number of channels efficiently

**Test Steps**:

1. Create channel list with 50+ channels
2. Measure channel picker load time
3. Measure list save time
4. Verify UI remains responsive

**Targets**:

- ✅ Channel picker loads in <2 seconds
- ✅ List saves in <1 second
- ✅ UI stays responsive during operations

### Test 2: Message Sending Performance

**Scenario**: Batch messaging completes within reasonable time

**Test Steps**:

1. Send message to list with 25 channels
2. Measure total completion time
3. Verify progress updates frequency
4. Check for proper rate limiting

**Targets**:

- ✅ Completes in <30 seconds for 25 channels
- ✅ Progress updates every 2-3 seconds
- ✅ No Slack API rate limit violations

## Security Validation Tests

### Test 1: Authentication Flow

**Scenario**: Only authenticated users can access functionality

**Test Steps**:

1. Visit app without authentication
2. Verify redirect to Slack OAuth
3. Complete OAuth flow
4. Verify proper session creation
5. Test session persistence across page reloads

**Expected Results**:

- ✅ Unauthenticated users redirected to OAuth
- ✅ OAuth flow completes successfully
- ✅ User session persists across reloads
- ✅ Protected pages require authentication

### Test 2: Data Access Control

**Scenario**: Users can only access their own data

**Test Steps**:

1. Create channel list as User A
2. Try to access list URL as User B
3. Verify proper access control

**Expected Results**:

- ✅ User B cannot access User A's channel lists
- ✅ API returns 403 Forbidden for unauthorized access

## Error Recovery Tests

### Test 1: Network Failure Recovery

**Scenario**: App handles network interruptions gracefully

**Test Steps**:

1. Start sending message to large channel list
2. Disconnect network mid-sending
3. Reconnect network
4. Verify proper error handling and recovery

**Expected Results**:

- ✅ App shows "Network error" status
- ✅ Partial results are saved
- ✅ User can retry failed deliveries

### Test 2: Slack API Error Handling

**Scenario**: App handles various Slack API errors

**Test Steps**:

1. Send to channel with restricted permissions
2. Send to archived channel
3. Send with invalid sender
4. Verify error messages are user-friendly

**Expected Results**:

- ✅ Permission errors: "Cannot post to #channel-name: Permission denied"
- ✅ Archived channels: "Cannot post to #channel-name: Channel archived"
- ✅ Invalid sender: "Selected sender no longer has posting permissions"

## Monitoring and Observability

### Test 1: Error Tracking

**Scenario**: All errors are properly logged and trackable

**Test Steps**:

1. Trigger various error conditions
2. Check Firebase Analytics for error events
3. Verify error context is sufficient for debugging

**Expected Results**:

- ✅ All errors logged with proper context
- ✅ User actions tracked for debugging
- ✅ Performance metrics collected

## Success Criteria

**All tests must pass before feature is considered complete:**

- [ ] User story validation: 4/4 scenarios pass
- [ ] Performance validation: 2/2 targets met
- [ ] Security validation: 2/2 tests pass
- [ ] Error recovery: 2/2 scenarios handled
- [ ] Monitoring: 1/1 logging requirements met

**Ready for Production When**:

- All quickstart tests pass consistently
- Performance targets met under load
- Security audit completed
- Error handling verified
- Monitoring dashboard functional

## Troubleshooting Common Issues

### Authentication Issues

- Verify Slack app OAuth scopes include: `channels:read`, `chat:write`, `users:read`
- Check Firebase Auth configuration
- Ensure environment variables are correct

### Channel List Issues

- Verify Firestore security rules allow user data access
- Check channel sync from Slack API
- Ensure proper indexing for performance

### Message Sending Issues

- Verify Slack API rate limiting implementation
- Check Firebase Cloud Functions timeout settings
- Ensure proper error handling for all failure modes

This quickstart guide serves as both a user manual and a comprehensive test suite to validate all functionality works as specified.

# Data Model: Firebase Authentication Only Login

**Date**: September 21, 2025  
**Context**: User entities and authentication data for Google OAuth via Firebase

## Entities

### User Account

Represents a user in the system authenticated via Google through Firebase.

**Fields**:

- `uid: string` - Firebase UID (primary key)
- `email: string` - Google email address (required)
- `displayName: string` - User's display name from Google account
- `avatar?: string` - Profile picture URL from Google account (optional)
- `googleUserId: string` - Google account ID for linking
- `lastLoginAt: Timestamp` - Last authentication timestamp
- `createdAt: Timestamp` - Account creation timestamp
- `updatedAt: Timestamp` - Last profile update timestamp

**Validation Rules** (from FR-008):

- Email must be valid email format
- Display name must be non-empty string
- UID must match Firebase authentication UID
- Timestamps must be valid Firestore Timestamps

**State Transitions**:

- New → Active (on first Google sign-in)
- Active → Active (on subsequent sign-ins, updates lastLoginAt)

### Authentication Session

Represents an active user session with Firebase authentication.

**Fields**:

- `uid: string` - Reference to User Account UID
- `firebaseToken: string` - Firebase authentication token
- `googleAccessToken?: string` - Google OAuth access token (if needed)
- `expiresAt: Timestamp` - Session expiration time
- `createdAt: Timestamp` - Session creation time

**Validation Rules** (from FR-003):

- UID must reference existing User Account
- Firebase token must be valid JWT
- Expiration must be future timestamp

**State Transitions**:

- Created → Active (on successful authentication)
- Active → Expired (on timeout or logout)

### User Profile

Application-specific user data and preferences stored in Firestore.

**Fields**:

- `uid: string` - Reference to User Account UID (primary key)
- `preferences: object` - User application preferences
- `settings: object` - User configuration settings

**Validation Rules** (from FR-008):

- UID must reference existing User Account
- Preferences and settings must be valid JSON objects

**Relationships**:

- User Account 1:1 User Profile (same UID)
- User Account 1:many Authentication Session (via UID)

## Storage Schema

### Firestore Collections

**users** collection:

```typescript
{
  uid: string,
  email: string,
  displayName: string,
  avatar?: string,
  googleUserId: string,
  lastLoginAt: FirebaseFirestore.Timestamp,
  createdAt: FirebaseFirestore.Timestamp,
  updatedAt: FirebaseFirestore.Timestamp,
  preferences?: object,
  settings?: object
}
```

**Security Rules** (existing Firestore rules):

- Users can only read/write their own document (uid matches auth.uid)
- Authenticated users only
- No public access

## Changes from Current Model

### Removed Fields

- `slackUserId` - No longer needed (Slack OAuth removed)
- `slackTeamId` - No longer needed (Slack OAuth removed)
- `slackAccessToken` - No longer needed (Slack OAuth removed)
- `slackScope` - No longer needed (Slack OAuth removed)

### Added Fields

- `googleUserId` - For Google account linking
- Enhanced validation for Google-specific data

### Modified Fields

- `email` - Now comes from Google account instead of Slack
- `displayName` - Now comes from Google account instead of Slack/Firebase
- `avatar` - Now comes from Google profile picture instead of Firebase photoURL

## Implementation Notes

### Firebase Authentication

- Uses Firebase Auth with Google provider
- User documents created in Firestore on first sign-in
- Firebase handles Google OAuth flow
- Firestore security rules enforce user data access

### Data Consistency

- Firebase UID serves as single source of truth for user identity
- Google account data synchronized on each sign-in
- Firestore documents updated with latest Google profile information

### Migration Considerations

- No migration needed (per user requirements)
- Existing Slack users will need to create new accounts with Google
- Clean slate approach for user data

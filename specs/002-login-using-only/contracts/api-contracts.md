# API Contracts: Firebase Authentication Only Login

**Date**: September 21, 2025  
**Context**: API endpoints for Google authentication via Firebase

## Authentication Flow Endpoints

### POST /api/auth/google/signin

Initiates Google authentication flow.

**Request**:

```json
{
  "redirectUrl?": "string"
}
```

**Response** (Success - 200):

```json
{
  "success": true,
  "authUrl": "string",
  "state": "string"
}
```

**Response** (Error - 400/500):

```json
{
  "error": "string",
  "message": "string"
}
```

### GET /api/auth/google/callback

Handles Google OAuth callback.

**Query Parameters**:

- `code: string` - Authorization code from Google
- `state: string` - State parameter for security
- `error?: string` - Error from Google OAuth

**Response** (Success - 200):

```json
{
  "success": true,
  "user": {
    "uid": "string",
    "email": "string",
    "displayName": "string",
    "googleUserId": "string"
  }
}
```

**Response** (Error - 400/500):

```json
{
  "error": "string",
  "message": "string"
}
```

## User Management Endpoints

### GET /api/auth/profile

Gets current user profile.

**Headers**:

- `Authorization: Bearer <firebase-token>`

**Response** (Success - 200):

```json
{
  "uid": "string",
  "email": "string",
  "displayName": "string",
  "avatar": "string",
  "googleUserId": "string",
  "lastLoginAt": "string",
  "createdAt": "string",
  "preferences": "object",
  "settings": "object"
}
```

**Response** (Error - 401/404/500):

```json
{
  "error": "string",
  "message": "string"
}
```

### PUT /api/auth/profile

Updates user profile.

**Headers**:

- `Authorization: Bearer <firebase-token>`

**Request**:

```json
{
  "displayName?": "string",
  "preferences?": "object",
  "settings?": "object"
}
```

**Response** (Success - 200):

```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

**Response** (Error - 400/401/500):

```json
{
  "error": "string",
  "message": "string"
}
```

### POST /api/auth/signout

Signs out the current user.

**Headers**:

- `Authorization: Bearer <firebase-token>`

**Response** (Success - 200):

```json
{
  "success": true,
  "message": "Successfully signed out"
}
```

**Response** (Error - 500):

```json
{
  "error": "string",
  "message": "string"
}
```

## Client-Side Authentication

### Firebase Auth State

Client-side authentication state managed by Firebase SDK.

**Auth State Object**:

```typescript
{
  user: FirebaseUser | null,
  userProfile: User | null,
  isLoading: boolean,
  isAuthenticated: boolean,
  error?: string
}
```

### Authentication Methods

```typescript
// Sign in with Google
signInWithGoogle(): Promise<UserCredential>

// Sign out
signOut(): Promise<void>

// Get current user
getCurrentUser(): FirebaseUser | null

// Get ID token
getIdToken(): Promise<string>
```

## Error Codes

### Authentication Errors

- `AUTH_INVALID_TOKEN` - Invalid or expired Firebase token
- `AUTH_USER_NOT_FOUND` - User not found in Firestore
- `AUTH_GOOGLE_ERROR` - Google OAuth error
- `AUTH_PERMISSION_DENIED` - Insufficient permissions
- `AUTH_NETWORK_ERROR` - Network connectivity issue

### Validation Errors

- `VALIDATION_INVALID_EMAIL` - Invalid email format
- `VALIDATION_MISSING_FIELD` - Required field missing
- `VALIDATION_INVALID_DATA` - Invalid data format

### Server Errors

- `SERVER_INTERNAL_ERROR` - Internal server error
- `SERVER_SERVICE_UNAVAILABLE` - Firebase service unavailable
- `SERVER_RATE_LIMITED` - Too many requests

## Security Considerations

### Authentication

- All protected endpoints require valid Firebase ID token
- Tokens validated server-side using Firebase Admin SDK
- Google OAuth state parameter used for CSRF protection

### Authorization

- Users can only access their own data (UID matching)
- Firestore security rules enforce data access
- No admin endpoints for user management

### Data Privacy

- Google profile data stored with user consent
- No sensitive data logged or exposed
- Profile pictures loaded from Google CDN

# Quickstart: Firebase Authentication Only Login

**Date**: September 21, 2025  
**Goal**: Verify Firebase Google authentication implementation

## Prerequisites

1. Firebase project with Google authentication enabled
2. Next.js development environment running
3. Firebase emulator suite configured
4. Test Google account for authentication

## Test Scenarios

### Scenario 1: New User Registration

**Given** a new user visits the application  
**When** they click "Sign in with Google"  
**Then** they are redirected to Google OAuth  
**And** after successful Google authentication  
**Then** a new user account is created in Firestore  
**And** they are redirected to the main application

**Validation Steps**:

1. Visit `http://localhost:3000`
2. Click "Sign in with Google" button
3. Complete Google OAuth flow in popup/redirect
4. Verify redirect to main application (`/dashboard` or `/`)
5. Check browser developer tools for authentication state
6. Verify user document created in Firestore emulator UI

**Expected Results**:

- User successfully authenticated
- Firebase auth state shows user as logged in
- Firestore contains new user document with Google profile data
- Application shows authenticated UI state

### Scenario 2: Existing User Login

**Given** a user with existing Google-authenticated account  
**When** they sign in with the same Google account  
**Then** they are authenticated successfully  
**And** their last login timestamp is updated  
**And** they access their existing user profile

**Validation Steps**:

1. Use the same Google account from Scenario 1
2. Sign out if currently authenticated
3. Click "Sign in with Google" button again
4. Complete authentication flow
5. Verify user profile data is preserved
6. Check `lastLoginAt` timestamp updated in Firestore

**Expected Results**:

- Existing user authenticated successfully
- User profile data unchanged (except lastLoginAt)
- Application maintains user preferences/settings

### Scenario 3: User Logout

**Given** an authenticated user  
**When** they click "Sign Out"  
**Then** their session is terminated  
**And** they are redirected to login page  
**And** protected routes are no longer accessible

**Validation Steps**:

1. Ensure user is authenticated from previous scenarios
2. Click "Sign Out" button
3. Verify redirect to login page
4. Attempt to access protected route (e.g., `/dashboard`)
5. Verify redirect back to login

**Expected Results**:

- User successfully logged out
- Firebase auth state shows no authenticated user
- Protected routes redirect to login
- No authentication cookies/tokens remain

### Scenario 4: Authentication Error Handling

**Given** Google authentication service issues  
**When** authentication fails or user cancels  
**Then** appropriate error messages are displayed  
**And** user can retry authentication

**Validation Steps**:

1. Start Google authentication flow
2. Cancel/close the Google OAuth popup
3. Verify error message is displayed
4. Attempt to authenticate again
5. Verify user can successfully authenticate after retry

**Expected Results**:

- Clear error message shown for failed authentication
- User can retry authentication
- No broken state or infinite redirects

## Integration Test Validation

### Test File Verification

Ensure these contract tests exist and pass:

1. `tests/contract/auth-google-signin-post.test.ts`
2. `tests/contract/auth-google-callback-get.test.ts`
3. `tests/contract/auth-profile-get.test.ts`
4. `tests/contract/auth-profile-put.test.ts`
5. `tests/contract/auth-signout-post.test.ts`

### Run Test Command

```bash
npm run test:contract
```

**Expected Results**: All contract tests pass with green status

## End-to-End Test Validation

### Test File Verification

Ensure these E2E tests exist and pass:

1. `tests/e2e/google-auth-flow.spec.ts`
2. `tests/e2e/auth-error-scenarios.spec.ts`

### Run E2E Command

```bash
npm run test:e2e
```

**Expected Results**: All E2E tests pass with Google authentication flow working

## Firebase Configuration Validation

### Firebase Console Checks

1. Navigate to Firebase Console
2. Go to Authentication > Sign-in method
3. Verify Google provider is enabled
4. Check authorized domains include localhost and production domain
5. Verify OAuth consent screen is configured

### Firebase Emulator Validation

1. Start Firebase emulator: `npm run dev:firebase`
2. Open emulator UI at `http://localhost:4000`
3. Check Authentication tab shows Google provider
4. Verify Firestore rules allow authenticated user access

## Application State Validation

### Client-Side State

Verify AuthProvider context provides:

- `user: FirebaseUser | null`
- `userProfile: User | null`
- `isAuthenticated: boolean`
- `isLoading: boolean`
- `signOut(): Promise<void>`

### Server-Side Authentication

Verify protected API routes:

- Validate Firebase ID tokens
- Return 401 for unauthenticated requests
- Correctly identify user from token

## Performance Validation

### Authentication Flow Timing

- Google OAuth redirect: < 2 seconds
- Token validation: < 100ms
- User profile loading: < 200ms
- Sign out: < 100ms

### Measurement Commands

```bash
# Check page load performance
npm run test:e2e -- --reporter=json

# Monitor network requests in browser DevTools
```

## Troubleshooting Common Issues

### Authentication Not Working

1. Check Firebase configuration in `.env.local`
2. Verify Google OAuth credentials in Firebase Console
3. Check browser console for JavaScript errors
4. Ensure localhost is in authorized domains

### User Profile Not Loading

1. Check Firestore security rules
2. Verify user document structure in Firestore emulator
3. Check network requests in browser DevTools
4. Verify Firebase Admin SDK configuration

### Tests Failing

1. Ensure Firebase emulator is running
2. Check test environment variables
3. Verify test database is clean between runs
4. Check for port conflicts

## Success Criteria

✅ All manual test scenarios pass  
✅ All contract tests pass  
✅ All E2E tests pass  
✅ Firebase configuration correct  
✅ Performance targets met  
✅ No console errors during auth flow  
✅ User data properly stored in Firestore  
✅ Authentication state consistent across tabs

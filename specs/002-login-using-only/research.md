# Research: Firebase Authentication Only Login

**Date**: September 21, 2025  
**Context**: Replace Slack OAuth with Firebase Google authentication

## Research Tasks Completed

### 1. Firebase Google Authentication Integration

**Decision**: Use Firebase Authentication with Google provider  
**Rationale**:

- Already using Firebase in the project
- Google authentication is well-supported by Firebase
- No additional libraries needed (Firebase SDK already present)
- Integrates seamlessly with existing Firestore user data

**Alternatives considered**:

- Direct Google OAuth 2.0 implementation: Rejected (more complex, reinventing Firebase features)
- Firebase email/password: Rejected (user requested Google specifically)
- Other Firebase providers (GitHub, Facebook): Rejected (user specified Google)

### 2. Existing Authentication Architecture Analysis

**Decision**: Modify existing auth-manager.ts and AuthProvider.tsx  
**Rationale**:

- Existing structure already supports Firebase authentication
- Server-side authentication pattern already implemented
- User profile storage in Firestore already established
- Can reuse existing authentication middleware

**Alternatives considered**:

- Complete rewrite: Rejected (user said "just fix", keep existing structure)
- Third-party auth library: Rejected (user said "no additional libraries")

### 3. User Data Migration Strategy

**Decision**: No migration needed for Slack users  
**Rationale**:

- User explicitly stated "You don't have to care about existing Slack-authenticated users"
- Clean slate approach allows for simpler implementation
- Google authentication will create new user profiles

**Alternatives considered**:

- Data migration from Slack to Google: Rejected (per user requirements)
- Dual authentication support: Rejected (adds complexity, user wants Slack removed)

### 4. Testing Strategy

**Decision**: Use existing test infrastructure with Firebase emulator  
**Rationale**:

- Vitest and Playwright already configured
- Firebase emulator supports Google auth testing
- Integration tests can use real Firebase emulator
- Existing contract test pattern can be reused

**Alternatives considered**:

- Mock Firebase auth: Rejected (constitution requires real dependencies)
- Manual testing only: Rejected (constitution requires TDD)

### 5. Implementation Approach

**Decision**: Modify existing files rather than create new ones  
**Rationale**:

- User said "just fix" - implies working with existing code
- Existing AuthProvider and auth-manager already have Firebase structure
- Minimal changes needed to switch from Slack to Google OAuth
- Preserves existing application flow

**Alternatives considered**:

- New authentication system: Rejected (unnecessary complexity)
- Gradual migration: Rejected (user wants Slack removed completely)

## Technical Implementation Notes

### Files to Modify

- `src/lib/auth-manager.ts`: Remove Slack OAuth methods, update for Google
- `src/components/providers/AuthProvider.tsx`: Update UI for Google sign-in
- `src/pages/api/auth/`: Update API routes for Google OAuth
- Firebase configuration: Ensure Google provider is enabled

### Key Changes Required

1. Replace Slack OAuth state generation with Google OAuth
2. Update user profile structure to use Google account data
3. Modify authentication flow to use Google sign-in button
4. Update error handling for Google-specific auth errors
5. Remove Slack-related API endpoints and functionality

### Dependencies Available

- Firebase SDK v10+ (already in project)
- Firebase Authentication (already configured)
- Firestore (already in use for user data)
- Next.js API routes (already handling auth)

## Risk Assessment

**Low Risk**:

- Firebase Google auth is well-documented and stable
- Existing Firebase infrastructure already in place
- No new dependencies required

**Mitigation**:

- Use Firebase emulator for development testing
- Implement comprehensive error handling
- Follow TDD approach to ensure functionality

## Conclusion

All technical unknowns resolved. Ready to proceed to Phase 1 design with:

- Firebase Google authentication as the auth method
- Modification of existing auth-manager and AuthProvider
- No user migration needed
- Use of existing testing infrastructure
- No additional libraries required

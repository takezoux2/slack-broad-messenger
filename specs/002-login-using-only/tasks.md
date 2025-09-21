# Tasks: Firebase Authentication Only Login

**Input**: Design documents from `/specs/002-login-using-only/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Phase 3.1: Setup

- [x] T001 Verify Firebase project has Google authentication provider enabled
- [x] T002 [P] Update Firebase configuration in src/lib/firebase.ts for Google OAuth
- [x] T003 [P] Configure Firebase emulator for Google auth testing

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] T004 [P] Contract test POST /api/auth/google/signin in tests/contract/auth-google-signin-post.test.ts
- [x] T005 [P] Contract test GET /api/auth/google/callback in tests/contract/auth-google-callback-get.test.ts
- [x] T006 [P] Contract test GET /api/auth/profile in tests/contract/auth-profile-get.test.ts
- [x] T007 [P] Contract test PUT /api/auth/profile in tests/contract/auth-profile-put.test.ts
- [x] T008 [P] Contract test POST /api/auth/signout in tests/contract/auth-signout-post.test.ts
- [x] T009 [P] Integration test Google auth flow in tests/integration/google-auth-flow.test.ts
- [x] T010 [P] Integration test user profile management in tests/integration/user-profile-management.test.ts
- [x] T011 [P] E2E test Google authentication flow in tests/e2e/google-auth-flow.spec.ts
- [x] T012 [P] E2E test authentication error scenarios in tests/e2e/auth-error-scenarios.spec.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Authentication Manager Updates

- [ ] T013 Remove Slack OAuth methods from src/lib/auth-manager.ts
- [ ] T014 Add Google OAuth methods to src/lib/auth-manager.ts
- [ ] T015 Update user profile structure for Google data in src/lib/auth-manager.ts
- [ ] T016 Add Google-specific error handling to src/lib/auth-manager.ts

### API Route Implementation

- [ ] T017 [P] Implement POST /api/auth/google/signin in src/pages/api/auth/google/signin.ts
- [ ] T018 [P] Implement GET /api/auth/google/callback in src/pages/api/auth/google/callback.ts
- [ ] T019 [P] Update GET /api/auth/profile for Google user data in src/pages/api/auth/profile.ts
- [ ] T020 [P] Update PUT /api/auth/profile for Google user fields in src/pages/api/auth/profile.ts
- [ ] T021 [P] Implement POST /api/auth/signout in src/pages/api/auth/signout.ts

### Authentication Provider Updates

- [ ] T022 Update AuthProvider for Google sign-in in src/components/providers/AuthProvider.tsx
- [ ] T023 Add Google sign-in button to authentication UI in src/components/providers/AuthProvider.tsx
- [ ] T024 Remove Slack authentication UI elements from src/components/providers/AuthProvider.tsx
- [ ] T025 Update error handling for Google auth errors in src/components/providers/AuthProvider.tsx

### Server-Side Authentication

- [ ] T026 Update getServerAuth for Google tokens in src/lib/auth-server.ts
- [ ] T027 Update getServerUserProfile for Google user data in src/lib/auth-server.ts
- [ ] T028 Add Google token validation in src/lib/auth-server.ts

## Phase 3.4: Integration

- [ ] T029 Connect Google OAuth to Firestore user creation
- [ ] T030 Update Firestore security rules for Google authenticated users
- [ ] T031 Implement user profile synchronization with Google account data
- [ ] T032 Add authentication middleware validation for Google tokens
- [ ] T033 Update session management for Google authentication

## Phase 3.5: Data Model Updates

- [ ] T034 [P] Remove Slack-related fields from User entity in Firestore
- [ ] T035 [P] Add Google-specific fields to User entity in Firestore
- [ ] T036 [P] Update user validation rules for Google data in src/lib/validation.ts
- [ ] T037 [P] Add Google account linking logic in src/lib/auth-manager.ts

## Phase 3.6: Polish

- [ ] T038 [P] Unit tests for Google OAuth methods in tests/unit/auth-manager.test.ts
- [ ] T039 [P] Unit tests for Google user validation in tests/unit/validation.test.ts
- [ ] T040 [P] Unit tests for AuthProvider Google methods in tests/unit/auth-provider.test.ts
- [ ] T041 Performance tests for authentication flow (<2s Google OAuth)
- [ ] T042 [P] Update docs/api.md with Google authentication endpoints
- [ ] T043 [P] Update README.md with Google authentication setup
- [ ] T044 Remove Slack-related code and comments
- [ ] T045 Run quickstart.md manual testing scenarios

## Dependencies

**Critical Path Dependencies:**

- Tests (T004-T012) before implementation (T013-T037)
- T013-T016 (auth-manager updates) must complete before T017-T021 (API routes)
- T022-T025 (AuthProvider) depends on T013-T016 (auth-manager)
- T029-T033 (integration) depends on T017-T028 (core implementation)
- T034-T037 (data model) can run parallel with T017-T033
- T038-T045 (polish) after all implementation complete

**File-based Dependencies:**

- T013-T016 sequential (same file: auth-manager.ts)
- T022-T025 sequential (same file: AuthProvider.tsx)
- T026-T028 sequential (same file: auth-server.ts)

## Parallel Execution Examples

### Phase 3.2 - Contract Tests (All Parallel)

```bash
# Launch T004-T008 together:
Task: "Contract test POST /api/auth/google/signin in tests/contract/auth-google-signin-post.test.ts"
Task: "Contract test GET /api/auth/google/callback in tests/contract/auth-google-callback-get.test.ts"
Task: "Contract test GET /api/auth/profile in tests/contract/auth-profile-get.test.ts"
Task: "Contract test PUT /api/auth/profile in tests/contract/auth-profile-put.test.ts"
Task: "Contract test POST /api/auth/signout in tests/contract/auth-signout-post.test.ts"
```

### Phase 3.3 - API Routes (Parallel after auth-manager)

```bash
# Launch T017-T021 together (after T013-T016 complete):
Task: "Implement POST /api/auth/google/signin in src/pages/api/auth/google/signin.ts"
Task: "Implement GET /api/auth/google/callback in src/pages/api/auth/google/callback.ts"
Task: "Update GET /api/auth/profile for Google user data in src/pages/api/auth/profile.ts"
Task: "Update PUT /api/auth/profile for Google user fields in src/pages/api/auth/profile.ts"
Task: "Implement POST /api/auth/signout in src/pages/api/auth/signout.ts"
```

### Phase 3.5 - Data Model (All Parallel)

```bash
# Launch T034-T037 together:
Task: "Remove Slack-related fields from User entity in Firestore"
Task: "Add Google-specific fields to User entity in Firestore"
Task: "Update user validation rules for Google data in src/lib/validation.ts"
Task: "Add Google account linking logic in src/lib/auth-manager.ts"
```

## Notes

- [P] tasks target different files and have no dependencies
- Verify all tests fail before implementing corresponding features
- Commit after each task completion
- Firebase emulator must be running for all tests
- Google OAuth requires proper Firebase project configuration

## Validation Checklist

- [x] All contracts (5) have corresponding test tasks (T004-T008)
- [x] All entities (User, AuthSession, UserProfile) have model update tasks
- [x] All tests (T004-T012) come before implementation (T013-T037)
- [x] Parallel tasks ([P]) are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Authentication flow covers sign-in, callback, profile, and sign-out
- [x] Data model migration from Slack to Google included
- [x] Integration and E2E testing included
- [x] Performance and documentation tasks included

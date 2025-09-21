````markdown
# Tasks: Migrate Next.js API from Pages Router to App Router

**Input**: Design documents from `/specs/003-change-next-js/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → Tech stack: TypeScript + Next.js 15+, React 18+, Firebase SDK, Slack SDK
   → Structure: Next.js web application (existing structure maintained)
2. Load design documents:
   → data-model.md: API route entities and patterns
   → contracts/: API endpoint contracts for migration verification
   → research.md: Migration strategy and patterns
3. Generate tasks by category:
   → Setup: App Router structure, dependencies, TypeScript paths
   → Tests: Update contract tests for new route structure
   → Core: Migrate route handlers from Pages Router to App Router
   → Integration: Middleware migration, authentication flows
   → Polish: Cleanup old routes, performance validation
4. Apply task rules:
   → Different route families = mark [P] for parallel
   → Same middleware/auth = sequential (no [P])
   → Contract test updates before route implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Validate completeness: All 18 API routes migrated, tests updated
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different route families, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Migration source**: `src/pages/api/` (existing Pages Router routes)
- **Migration target**: `src/app/api/` (new App Router route handlers)
- **Tests**: `tests/contract/` (existing contract tests to update)

## Phase 3.1: Setup

- [x] T001 Create App Router API directory structure in `src/app/api/`
- [x] T002 Set up Next.js App Router route handler TypeScript configuration
- [x] T003 [P] Create middleware.ts file for App Router authentication middleware

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be updated and MUST initially fail before ANY route implementation**

### Authentication Route Tests

- [x] T004 [P] Update contract test for GET /api/auth/profile in `tests/contract/auth-profile-get.test.ts`
- [x] T005 [P] Update contract test for POST /api/auth/signout in `tests/contract/auth-signout-post.test.ts`
- [x] T006 [P] Update contract test for POST /api/auth/google/signin in `tests/contract/auth-google-signin-post.test.ts`
- [x] T007 [P] Update contract test for GET /api/auth/google/callback in `tests/contract/auth-google-callback-get.test.ts`
- [x] T008 [P] Update contract test for GET /api/auth/slack in `tests/contract/auth-slack-get.test.ts`
- [x] T009 [P] Update contract test for GET /api/auth/slack/callback in `tests/contract/auth-slack-callback-get.test.ts`

### Channel Management Route Tests

- [x] T010 [P] Update contract test for GET /api/channels in `tests/contract/channels-get.test.ts`
- [x] T011 [P] Update contract test for GET /api/channel-lists in `tests/contract/channel-lists-get.test.ts`
- [x] T012 [P] Update contract test for POST /api/channel-lists in `tests/contract/channel-lists-post.test.ts`
- [x] T013 [P] Update contract test for GET /api/channel-lists/[listId] in `tests/contract/channel-lists-get-by-id.test.ts`
- [x] T014 [P] Update contract test for PUT /api/channel-lists/[listId] in `tests/contract/channel-lists-put.test.ts`
- [x] T015 [P] Update contract test for DELETE /api/channel-lists/[listId] in `tests/contract/channel-lists-delete.test.ts`

### Message Management Route Tests

- [x] T016 [P] Update contract test for GET /api/messages in `tests/contract/messages-get.test.ts`
- [x] T017 [P] Update contract test for POST /api/messages in `tests/contract/messages-post.test.ts`
- [x] T018 [P] Update contract test for GET /api/messages/[messageId] in `tests/contract/messages-get-by-id.test.ts`
- [x] T019 [P] Update contract test for GET /api/messages/[messageId]/deliveries in `tests/contract/messages-deliveries-get.test.ts`

### User Management Route Tests

- [x] T020 [P] Update contract test for GET /api/slack-users in `tests/contract/slack-users-get.test.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Simple GET Routes (Low Risk)

- [x] T021 [P] Migrate GET /api/channels from `src/pages/api/channels.ts` to `src/app/api/channels/route.ts`
- [x] T022 [P] Migrate GET /api/slack-users from `src/pages/api/slack-users.ts` to `src/app/api/slack-users/route.ts`
- [x] T023 [P] Migrate GET /api/channel-lists from `src/pages/api/channel-lists.ts` to `src/app/api/channel-lists/route.ts`
- [x] T024 [P] Migrate GET /api/messages from `src/pages/api/messages.ts` to `src/app/api/messages/route.ts`

### Routes with Parameters (Medium Risk)

- [x] T025 Migrate GET /api/channel-lists/[listId] from `src/pages/api/channel-lists/[listId].ts` to `src/app/api/channel-lists/[listId]/route.ts`
- [x] T026 Migrate GET /api/messages/[messageId] from `src/pages/api/messages/[messageId].ts` to `src/app/api/messages/[messageId]/route.ts`
- [x] T027 Migrate GET /api/messages/[messageId]/deliveries from `src/pages/api/messages/[messageId]/deliveries.ts` to `src/app/api/messages/[messageId]/deliveries/route.ts`

### POST/PUT/DELETE Routes (Medium Risk)

- [x] T028 Add POST handler to channel-lists route in `src/app/api/channel-lists/route.ts`
- [x] T029 Add POST handler to messages route in `src/app/api/messages/route.ts`
- [x] T030 Add PUT handler to channel-lists/[listId] route in `src/app/api/channel-lists/[listId]/route.ts`
- [x] T031 Add DELETE handler to channel-lists/[listId] route in `src/app/api/channel-lists/[listId]/route.ts`

### Authentication Routes (High Risk)

- [x] T032 Migrate GET /api/auth/profile from `src/pages/api/auth/profile.ts` to `src/app/api/auth/profile/route.ts`
- [x] T033 Migrate POST /api/auth/signout from `src/pages/api/auth/signout.ts` to `src/app/api/auth/signout/route.ts`
- [x] T034 Migrate POST /api/auth/google/signin from `src/pages/api/auth/google/signin.ts` to `src/app/api/auth/google/signin/route.ts`
- [x] T035 Migrate GET /api/auth/google/callback from `src/pages/api/auth/google/callback.ts` to `src/app/api/auth/google/callback/route.ts`
- [x] T036 Migrate GET /api/auth/slack from `src/pages/api/auth/slack.ts` to `src/app/api/auth/slack/route.ts` (DEPRECATED - returns 410)
- [x] T037 Migrate GET /api/auth/slack/callback from `src/pages/api/auth/slack/callback.ts` to `src/app/api/auth/slack/callback/route.ts` (DEPRECATED - returns 410)

### Legacy Routes

- [x] T038 Migrate POST /api/send-message from `src/pages/api/send-message.ts` to `src/app/api/send-message/route.ts`

## Phase 3.4: Integration

- [x] T039 Implement App Router middleware integration in `middleware.ts`
- [ ] T040 Verify authentication flows work with new middleware pattern
- [ ] T041 Update CORS and security headers for App Router routes
- [ ] T042 Verify error handling produces identical responses to Pages Router

## Phase 3.5: Polish

- [ ] T043 [P] Run full contract test suite to verify identical behavior
- [ ] T044 [P] Run integration tests to validate user flows
- [ ] T045 [P] Performance comparison testing (response times, memory usage)
- [ ] T046 [P] Execute quickstart.md validation scenarios
- [ ] T047 Remove old Pages Router API files from `src/pages/api/`
- [ ] T048 Update TypeScript path mappings if needed
- [ ] T049 [P] Update API documentation if any references to route structure exist

## Dependencies

- Setup (T001-T003) before tests (T004-T020)
- All tests (T004-T020) before implementation (T021-T038)
- Middleware setup (T003, T039) before authentication routes (T032-T037)
- Core routes (T021-T031) before authentication routes (T032-T037)
- Implementation before integration (T039-T042)
- Integration before polish (T043-T049)

## Parallel Example

```bash
# Phase 3.2: Launch contract test updates together
Task: "Update contract test for GET /api/channels in tests/contract/channels-get.test.ts"
Task: "Update contract test for GET /api/slack-users in tests/contract/slack-users-get.test.ts"
Task: "Update contract test for GET /api/channel-lists in tests/contract/channel-lists-get.test.ts"
Task: "Update contract test for GET /api/messages in tests/contract/messages-get.test.ts"

# Phase 3.3: Launch simple GET route migrations together
Task: "Migrate GET /api/channels from src/pages/api/channels.ts to src/app/api/channels/route.ts"
Task: "Migrate GET /api/slack-users from src/pages/api/slack-users.ts to src/app/api/slack-users/route.ts"
Task: "Migrate GET /api/channel-lists from src/pages/api/channel-lists.ts to src/app/api/channel-lists/route.ts"
Task: "Migrate GET /api/messages from src/pages/api/messages.ts to src/app/api/messages/route.ts"
```

## Notes

- [P] tasks target different route families with no shared dependencies
- Contract tests must be updated first to fail, then routes implemented to pass
- Preserve identical request/response behavior during migration
- Authentication middleware requires special attention due to App Router differences
- Keep Pages Router routes until App Router equivalents are fully verified

## Task Generation Rules

_Applied during main() execution_

1. **From Contracts**:
   - Each contract file → contract test update task [P] (different test files)
   - Each endpoint → route migration implementation task

2. **From Data Model**:
   - Each route entity → migration task following App Router patterns
   - Authentication flows → middleware integration tasks

3. **From Research**:
   - Migration strategy → setup and preparation tasks
   - Testing approach → validation and cleanup tasks

4. **Ordering**:
   - Setup → Tests → Simple routes → Complex routes → Auth routes → Polish
   - Risk-based: Low-risk (GET) → Medium-risk (params, CRUD) → High-risk (auth)

## Validation Checklist

_GATE: Checked before marking migration complete_

- [ ] All 18 API routes migrated to App Router structure
- [ ] All contract tests pass with identical behavior
- [ ] Authentication flows work correctly with new middleware
- [ ] Performance metrics show no regression
- [ ] Error responses maintain same format and status codes
- [ ] CORS and security headers preserved
- [ ] Integration tests pass
- [ ] E2E tests confirm user flows work unchanged
- [ ] Old Pages Router files safely removed

## Migration Route Count Summary

- **Authentication routes**: 6 endpoints
- **Channel management**: 6 endpoints
- **Message management**: 4 endpoints
- **User management**: 1 endpoint
- **Legacy routes**: 1 endpoint
- **Total**: 18 API route handlers to migrate
````

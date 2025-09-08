# Tasks: Send a Message to Multiple Channels

**Input**: Design documents from `/specs/001-build-an-app/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: Next.js App Router structure with `src/app/`, `src/lib/`, `src/components/`
- API routes in `src/pages/api/` for Next.js API endpoints
- Tests in `tests/` with contract/, integration/, unit/ subdirectories

## Phase 3.1: Setup

- [x] T001 Initialize Next.js project with TypeScript, Vitest, Playwright, and Firebase SDK
- [ ] T002 [P] Configure ESLint, Prettier, and TypeScript strict mode in project root
- [ ] T003 [P] Setup Firebase emulator configuration in firebase.json
- [ ] T004 [P] Create environment variables template .env.example with Firebase and Slack configs
- [ ] T005 [P] Setup Vitest configuration with React Testing Library in vitest.config.ts
- [ ] T006 [P] Setup Playwright configuration for E2E testing in playwright.config.ts

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (API Endpoints)

- [ ] T007 [P] Contract test GET /api/auth/slack in tests/contract/auth-slack-get.test.ts
- [ ] T008 [P] Contract test GET /api/auth/slack/callback in tests/contract/auth-slack-callback-get.test.ts
- [ ] T009 [P] Contract test GET /api/channels in tests/contract/channels-get.test.ts
- [ ] T010 [P] Contract test GET /api/channel-lists in tests/contract/channel-lists-get.test.ts
- [ ] T011 [P] Contract test POST /api/channel-lists in tests/contract/channel-lists-post.test.ts
- [ ] T012 [P] Contract test GET /api/channel-lists/{listId} in tests/contract/channel-lists-get-by-id.test.ts
- [ ] T013 [P] Contract test PUT /api/channel-lists/{listId} in tests/contract/channel-lists-put.test.ts
- [ ] T014 [P] Contract test DELETE /api/channel-lists/{listId} in tests/contract/channel-lists-delete.test.ts
- [ ] T015 [P] Contract test GET /api/slack-users in tests/contract/slack-users-get.test.ts
- [ ] T016 [P] Contract test GET /api/messages in tests/contract/messages-get.test.ts
- [ ] T017 [P] Contract test POST /api/messages in tests/contract/messages-post.test.ts
- [ ] T018 [P] Contract test GET /api/messages/{messageId} in tests/contract/messages-get-by-id.test.ts
- [ ] T019 [P] Contract test GET /api/messages/{messageId}/deliveries in tests/contract/messages-deliveries-get.test.ts

### Integration Tests (User Stories)

- [ ] T020 [P] Integration test: Create and edit channel lists in tests/integration/channel-list-management.test.ts
- [ ] T021 [P] Integration test: Send message to multiple channels in tests/integration/message-sending.test.ts
- [ ] T022 [P] Integration test: Handle validation errors in tests/integration/validation-errors.test.ts
- [ ] T023 [P] Integration test: Handle partial failures in tests/integration/partial-failures.test.ts
- [ ] T024 [P] Integration test: Slack OAuth authentication flow in tests/integration/oauth-flow.test.ts

## Phase 3.3: Core Libraries (ONLY after tests are failing)

### Data Models and Types

- [ ] T025 [P] User interface and validation in src/lib/types/user.ts
- [ ] T026 [P] SlackUser interface and validation in src/lib/types/slack-user.ts
- [ ] T027 [P] Channel interface and validation in src/lib/types/channel.ts
- [ ] T028 [P] ChannelList interface and validation in src/lib/types/channel-list.ts
- [ ] T029 [P] Message interface and validation in src/lib/types/message.ts
- [ ] T030 [P] MessageDelivery interface and validation in src/lib/types/message-delivery.ts

### Core Libraries

- [ ] T031 [P] Firebase configuration and initialization in src/lib/firebase.ts
- [ ] T032 [P] Slack API client configuration in src/lib/slack.ts
- [ ] T033 [P] Authentication manager library in src/lib/auth-manager.ts
- [ ] T034 [P] Channel manager library for CRUD operations in src/lib/channel-manager.ts
- [ ] T035 [P] Message sender library for batch messaging in src/lib/message-sender.ts

## Phase 3.4: API Endpoints (Sequential - shared middleware)

- [ ] T036 Firebase Auth middleware for API route protection in src/lib/auth-middleware.ts
- [ ] T037 GET /api/auth/slack endpoint in src/pages/api/auth/slack.ts
- [ ] T038 GET /api/auth/slack/callback endpoint in src/pages/api/auth/slack/callback.ts
- [ ] T039 GET /api/channels endpoint in src/pages/api/channels.ts
- [ ] T040 GET /api/channel-lists endpoint in src/pages/api/channel-lists.ts
- [ ] T041 POST /api/channel-lists endpoint (add to existing file)
- [ ] T042 GET /api/channel-lists/[listId] endpoint in src/pages/api/channel-lists/[listId].ts
- [ ] T043 PUT /api/channel-lists/[listId] endpoint (add to existing file)
- [ ] T044 DELETE /api/channel-lists/[listId] endpoint (add to existing file)
- [ ] T045 GET /api/slack-users endpoint in src/pages/api/slack-users.ts
- [ ] T046 GET /api/messages endpoint in src/pages/api/messages.ts
- [ ] T047 POST /api/messages endpoint (add to existing file)
- [ ] T048 GET /api/messages/[messageId] endpoint in src/pages/api/messages/[messageId].ts
- [ ] T049 GET /api/messages/[messageId]/deliveries endpoint in src/pages/api/messages/[messageId]/deliveries.ts

## Phase 3.5: Frontend Components (Parallel - different files)

- [ ] T050 [P] Root layout with Firebase providers in src/app/layout.tsx
- [ ] T051 [P] Dashboard page in src/app/page.tsx
- [ ] T052 [P] Authentication pages in src/app/auth/page.tsx
- [ ] T053 [P] ChannelList management component in src/components/ChannelList.tsx
- [ ] T054 [P] MessageComposer form component in src/components/MessageComposer.tsx
- [ ] T055 [P] DeliveryReport display component in src/components/DeliveryReport.tsx
- [ ] T056 [P] Channel picker component in src/components/ChannelPicker.tsx
- [ ] T057 [P] User selector component in src/components/UserSelector.tsx

## Phase 3.6: Integration & Error Handling

- [ ] T058 Error handling and logging service in src/lib/error-handler.ts
- [ ] T059 Real-time progress updates using Firebase listeners in src/lib/progress-tracker.ts
- [ ] T060 Rate limiting for Slack API calls in src/lib/rate-limiter.ts
- [ ] T061 Firebase Security Rules for Firestore collections in firestore.rules

## Phase 3.7: End-to-End Tests

- [ ] T062 [P] E2E test: Complete authentication flow in tests/e2e/auth-flow.spec.ts
- [ ] T063 [P] E2E test: Create channel list and send message in tests/e2e/message-workflow.spec.ts
- [ ] T064 [P] E2E test: Error handling and edge cases in tests/e2e/error-scenarios.spec.ts

## Phase 3.8: Polish & Performance

- [ ] T065 [P] Unit tests for validation functions in tests/unit/validation.test.ts
- [ ] T066 [P] Unit tests for utility functions in tests/unit/utils.test.ts
- [ ] T067 [P] Performance optimization for large channel lists in src/lib/performance-optimizer.ts
- [ ] T068 [P] API response caching strategy in src/lib/cache-manager.ts
- [ ] T069 [P] Update README.md with setup and usage instructions
- [ ] T070 [P] Create API documentation in docs/api.md
- [ ] T071 Manual testing following quickstart.md scenarios

## Dependencies

- Setup (T001-T006) before all other phases
- Contract tests (T007-T019) before any implementation
- Integration tests (T020-T024) before any implementation
- Data models (T025-T030) before libraries (T031-T035)
- Libraries (T031-T035) before API endpoints (T036-T049)
- Auth middleware (T036) before all API endpoints
- API endpoints before frontend components (T050-T057)
- Core implementation before E2E tests (T062-T064)
- Everything before polish phase (T065-T071)

## Parallel Example

```bash
# Phase 3.2: Launch all contract tests together (T007-T019)
Task: "Contract test GET /api/auth/slack in tests/contract/auth-slack-get.test.ts"
Task: "Contract test GET /api/channels in tests/contract/channels-get.test.ts"
Task: "Contract test POST /api/channel-lists in tests/contract/channel-lists-post.test.ts"
# ... (all contract tests can run in parallel)

# Phase 3.3: Launch all data models together (T025-T030)
Task: "User interface and validation in src/lib/types/user.ts"
Task: "Channel interface and validation in src/lib/types/channel.ts"
Task: "Message interface and validation in src/lib/types/message.ts"
# ... (all models can run in parallel)

# Phase 3.5: Launch all frontend components together (T050-T057)
Task: "ChannelList management component in src/components/ChannelList.tsx"
Task: "MessageComposer form component in src/components/MessageComposer.tsx"
Task: "DeliveryReport display component in src/components/DeliveryReport.tsx"
# ... (all components can run in parallel)
```

## Notes

- [P] tasks = different files, no dependencies
- Verify ALL tests fail before implementing ANY code
- Commit after each task completion
- Follow TDD strictly: RED → GREEN → REFACTOR
- Use Firebase emulator for all local development
- Real Slack API testing with sandbox workspace

## Task Generation Rules

_Applied during main() execution_

1. **From Contracts (api-spec.yaml)**:
   - 13 API endpoints → 13 contract test tasks [P] → 13 implementation tasks
2. **From Data Model**:
   - 6 entities (User, SlackUser, Channel, ChannelList, Message, MessageDelivery) → 6 model tasks [P]
   - 3 core libraries (auth-manager, channel-manager, message-sender) → 3 library tasks [P]
3. **From Quickstart User Stories**:
   - 4 user stories → 4 integration tests [P] + 1 OAuth test [P]
   - Performance, security, error recovery scenarios → 3 E2E tests [P]

4. **Ordering**:
   - Setup → Contract Tests → Integration Tests → Models → Libraries → APIs → Frontend → E2E → Polish
   - Dependencies block parallel execution within phases

## Validation Checklist

_GATE: Checked by main() before returning_

- [x] All 13 API endpoints have corresponding contract tests
- [x] All 6 entities have model creation tasks
- [x] All tests (contract + integration) come before implementation
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [x] TDD workflow enforced (tests fail before implementation)
- [x] Real dependencies used (Firebase emulator, Slack sandbox)

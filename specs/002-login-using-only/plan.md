# Implementation Plan: Firebase Authentication Only Login

**Branch**: `002-login-using-only` | **Date**: September 21, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-login-using-only/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Replace current Slack OAuth authentication with Firebase Google authentication. Users will authenticate using their Google accounts via Firebase, eliminating the dependency on Slack OAuth. The system will maintain user profiles in Firestore with Google account data (email, display name, profile picture) and provide standard auth features (login, logout, account recovery).

## Technical Context

**Language/Version**: TypeScript (latest stable)  
**Primary Dependencies**: Next.js 15+, React 18+, Firebase SDK v10+  
**Storage**: Firebase Firestore  
**Testing**: Vitest with React Testing Library, Playwright for E2E  
**Target Platform**: Web browser (modern browsers supporting ES2020+)
**Project Type**: web - Next.js application with frontend + backend API routes  
**Performance Goals**: <300ms auth flow, <100ms token validation  
**Constraints**: Must work with existing Firebase project, no additional libraries per user requirement  
**Scale/Scope**: Replace existing Slack OAuth with Google OAuth, maintain existing user data structure

**User Requirements**: "just fix. You don't have to use additional libraries."

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Simplicity**:

- Projects: 1 (Next.js web app with API routes) ✓
- Using framework directly? Yes (Firebase SDK directly, no wrappers) ✓
- Single data model? Yes (User entity with Google auth fields) ✓
- Avoiding patterns? Yes (direct Firebase usage, no auth abstractions) ✓

**Architecture**:

- EVERY feature as library? N/A (web app modification, not library)
- Libraries listed: N/A (using existing Firebase auth-manager)
- CLI per library: N/A (web application)
- Library docs: N/A (web application)

**Testing (NON-NEGOTIABLE)**:

- RED-GREEN-Refactor cycle enforced? ✓ (will write failing tests first)
- Git commits show tests before implementation? ✓ (planned approach)
- Order: Contract→Integration→E2E→Unit strictly followed? ✓
- Real dependencies used? ✓ (Firebase emulator for testing)
- Integration tests for: auth flow changes, Google OAuth integration ✓
- FORBIDDEN: Implementation before test ✓

**Observability**:

- Structured logging included? ✓ (console.error with context)
- Frontend logs → backend? ✓ (existing error handling)
- Error context sufficient? ✓ (Firebase auth errors)

**Versioning**:

- Version number assigned? N/A (feature modification)
- BUILD increments on every change? N/A (not a library)
- Breaking changes handled? ✓ (replacing auth method)

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2: Web application (existing Next.js structure with src/app/, src/components/, src/lib/, src/pages/api/)

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `/scripts/update-agent-context.sh [claude|gemini|copilot]` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/\*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Contract tests for each API endpoint (5 contract test tasks) [P]
- User model modifications for Google auth data [P]
- AuthProvider updates for Google sign-in UI [P]
- Firebase configuration for Google OAuth provider [P]
- Integration tests for complete auth flow
- E2E tests for user scenarios from quickstart.md

**Ordering Strategy**:

- TDD order: Contract tests → Integration tests → Implementation → E2E tests
- Dependency order: Firebase config → User model → Auth manager → UI → API routes
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 15-20 numbered, ordered tasks in tasks.md

**Key Task Categories**:

1. **Setup** (1-3): Firebase Google provider configuration
2. **Models** (4-6): Update user data model for Google auth
3. **Contract Tests** (7-11): API endpoint contract tests [P]
4. **Auth Core** (12-14): Update auth-manager.ts for Google OAuth
5. **UI Updates** (15-17): AuthProvider and sign-in components
6. **Integration** (18-19): End-to-end authentication flow tests
7. **Validation** (20): Quickstart verification

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A - no deviations)

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_

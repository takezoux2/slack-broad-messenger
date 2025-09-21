# Implementation Plan: Migrate Next.js API from Pages Router to App Router

**Branch**: `003-change-next-js` | **Date**: September 21, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-change-next-js/spec.md`

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

Migrate all existing Next.js API routes from Pages Router (`src/pages/api/`) to App Router (`src/app/api/`) architecture while maintaining identical functionality, authentication, middleware, and response formats. This migration enables better TypeScript support, improved performance, and access to newer Next.js features while ensuring zero disruption to API consumers.

## Technical Context

**Language/Version**: TypeScript (latest stable) + Next.js 15+  
**Primary Dependencies**: React 18+, Firebase SDK, Slack SDK  
**Storage**: Firebase Firestore for application data  
**Testing**: Vitest with React Testing Library, Playwright for E2E  
**Target Platform**: Web application (Node.js runtime)
**Project Type**: web (Next.js frontend + API routes as backend)  
**Performance Goals**: Maintain current API response times  
**Constraints**: Zero downtime migration acceptable with maintenance window  
**Scale/Scope**: Existing API endpoints in src/pages/api/ directory

**User Input Context**: "just migrate" - indicates straightforward migration without additional features

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Simplicity**:

- Projects: 1 (web application with API routes)
- Using framework directly? ✅ (Direct Next.js App Router usage)
- Single data model? ✅ (Migration preserves existing data structures)
- Avoiding patterns? ✅ (No additional wrapper patterns introduced)

**Architecture**:

- EVERY feature as library? ✅ (Existing lib/ structure maintained)
- Libraries listed: auth-manager, channel-manager, message-sender, slack.ts + purpose preserved
- CLI per library: N/A (web application context)
- Library docs: Existing documentation structure maintained

**Testing (NON-NEGOTIABLE)**:

- RED-GREEN-Refactor cycle enforced? ✅ (Contract tests fail before migration)
- Git commits show tests before implementation? ✅ (Will update existing contract tests first)
- Order: Contract→Integration→E2E→Unit strictly followed? ✅ (Following existing test structure)
- Real dependencies used? ✅ (Existing Firebase emulator and real deps)
- Integration tests for: contract changes (API route structure changes)
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:

- Structured logging included? ✅ (Preserved from existing implementation)
- Frontend logs → backend? ✅ (Maintained through existing architecture)
- Error context sufficient? ✅ (Same error handling patterns preserved)

**Versioning**:

- Version number assigned? N/A (Internal migration, not external API change)
- BUILD increments on every change? ✅ (Following existing CI/CD)
- Breaking changes handled? ✅ (Zero breaking changes - identical API behavior)

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

**Structure Decision**: Next.js web application (existing structure maintained with App Router migration)

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
- Generate migration tasks for each API route identified in contracts/api-contracts.md
- Each route family → contract test verification task [P]
- Each route → migration implementation task following quickstart.md patterns
- Authentication routes require special middleware migration tasks
- Cleanup tasks to remove old Pages Router files

**Ordering Strategy**:

- TDD order: Update contract tests to work with new routes first, then migrate
- Dependency order: Simple GET routes → parameterized routes → POST/PUT/DELETE → auth routes
- Risk order: Low-risk routes first (channels, messages) → medium-risk (CRUD) → high-risk (auth)
- Mark [P] for parallel execution (independent route families)

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md covering:

- Pre-migration setup (3-5 tasks)
- Route migrations by category (25-30 tasks)
- Testing and validation (5-7 tasks)
- Cleanup and finalization (3-5 tasks)

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
- [x] Complexity deviations documented (none required)

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_

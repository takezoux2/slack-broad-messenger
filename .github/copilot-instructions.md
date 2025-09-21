# Slack Broad Messenger - GitHub Copilot Context

**Last updated**: September 21, 2025
**Current Feature**: 003-change-next-js

## Active Technologies

- TypeScript (latest stable) + Next.js 15+, React 18+, Firebase SDK (002-login-using-only)
- Firebase Firestore for application data, Firebase Authentication with Google OAuth (002-login-using-only)
- Vitest with React Testing Library, Playwright for E2E (001-build-an-app)

## Project Structure

```
src/app/                # Next.js App Router
  layout.tsx           # Root layout with Firebase providers
  page.tsx             # Dashboard page
  auth/                # Authentication pages
    slack/             # Slack OAuth callback
src/lib/               # Core libraries
  firebase.ts          # Firebase configuration
  slack.ts             # Slack API client
  channel-manager.ts   # Channel CRUD operations
  message-sender.ts    # Batch messaging logic
  auth-manager.ts      # Authentication utilities
src/components/        # React components
  ChannelList.tsx      # Channel list management
  MessageComposer.tsx  # Message creation form
  DeliveryReport.tsx   # Message status display
src/pages/api/         # Next.js API routes
  auth/                # Authentication endpoints
  channels.ts          # Channel management
  channel-lists.ts     # Channel list CRUD
  messages.ts          # Message sending
  slack-users.ts       # User management
tests/                 # Test files
  contract/            # API contract tests
  integration/         # Integration tests
  unit/                # Unit tests
```

## Commands

```bash
npm run dev           # Start development server
npm run test          # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e      # End-to-end tests with Playwright
npm run lint          # ESLint + TypeScript check
npm run build         # Production build
npm run dev:firebase  # Start Firebase emulator
```

## Code Style

- TypeScript: Strict mode, proper typing for all functions
- React: Functional components with hooks, proper error boundaries
- Next.js: App Router, server/client component separation
- Firebase: Direct SDK usage, security rules for data validation
- Testing: TDD workflow, contract-first API development

## Development Workflow

1. Write failing tests first (RED phase)
2. Implement minimal code to pass (GREEN phase)
3. Refactor with proper types and error handling
4. All commits must show tests before implementation
5. Use Firebase emulator for local development
6. Real dependencies in integration tests (no mocks)

## Feature Requirements

- Send messages to up to 100 channels simultaneously
- Real-time progress updates during sending
- Detailed error reporting with channel names and reasons
- Automatic handling of deleted channels (skip and notify)
- Firebase Authentication with Slack OAuth integration
- Comprehensive validation and error handling

## Recent Changes

- 003-change-next-js: Migrate API routes from Pages Router to App Router architecture
- 002-login-using-only: Replace Slack OAuth with Firebase Google authentication
- 001-build-an-app: Added TypeScript + Next.js 15+, React 18+, Firebase SDK, Slack SDK

## Progress Checklist

- [x] Verify that the copilot-instructions.md file in the .github directory is created.
- [x] Clarify Project Requirements
- [x] Scaffold the Project
- [x] Implementation Plan Created
- [ ] Customize the Project
- [ ] Install Required Extensions
- [ ] Compile the Project
- [ ] Create and Run Task
- [ ] Launch the Project
- [ ] Ensure Documentation is Complete

<!-- MANUAL ADDITIONS START -->
<!-- Add any manual customizations here -->
<!-- MANUAL ADDITIONS END -->

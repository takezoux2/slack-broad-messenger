# E2E Testing with Playwright

This directory contains end-to-end tests for the Slack Broad Messenger application.

## Setup

Playwright is configured to run E2E tests in the following browsers:

- Desktop Chrome (Chromium)
- Desktop Firefox
- Desktop Safari (WebKit)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (visible browser)
npx playwright test --headed

# Run tests in a specific browser
npx playwright test --project=chromium

# Run a specific test file
npx playwright test smoke.spec.ts

# Debug a test
npx playwright test --debug
```

## Prerequisites

1. **Firebase Emulators**: Start Firebase emulators before running tests:

   ```bash
   npm run dev:firebase
   ```

2. **Next.js Development Server**: The Playwright config will automatically start the dev server, but you can also start it manually:
   ```bash
   npm run dev
   ```

## Test Structure

- `global-setup.ts` - Runs once before all tests (setup Firebase, verify app is ready)
- `global-teardown.ts` - Runs once after all tests (cleanup)
- `*.spec.ts` - Individual test files

## Test Artifacts

Test artifacts are saved to `test-results/`:

- Screenshots on failure
- Videos on failure
- HTML reports
- Traces for debugging

## Environment Variables

- `PLAYWRIGHT_BASE_URL` - Base URL for the application (default: http://localhost:3000)
- `CI` - Set to enable CI-specific configurations

## Future Test Files

The following E2E test files will be implemented in later tasks:

- `auth-flow.spec.ts` - Complete authentication flow
- `message-workflow.spec.ts` - Create channel list and send message
- `error-scenarios.spec.ts` - Error handling and edge cases

import type { FullConfig } from '@playwright/test';

/**
 * Global teardown for E2E tests
 * This runs once after all tests across all workers
 */
async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...');

  // Cleanup operations would go here
  // For example:
  // - Clear test data from Firebase emulator
  // - Reset any global state
  // - Clean up temporary files

  // Note: Firebase emulators will be stopped automatically when the process ends
  // No need to explicitly stop them here

  console.log('✅ Global teardown completed');
}

export default globalTeardown;

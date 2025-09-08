import { chromium, type FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests
 * This runs once before all tests across all workers
 */
async function globalSetup(_config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');

  // Start Firebase emulators if not already running
  if (!process.env.CI) {
    console.log('🔥 Firebase emulators should be running locally');
    console.log('   Run: npm run dev:firebase');
  }

  // Ensure Next.js development server is ready
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  console.log(`🌐 Waiting for Next.js server at ${baseURL}`);

  // Create a browser instance for authentication setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the application to be ready
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    console.log('✅ Application is ready for testing');
  } catch (error) {
    console.error('❌ Failed to connect to application:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global setup completed');
}

export default globalSetup;

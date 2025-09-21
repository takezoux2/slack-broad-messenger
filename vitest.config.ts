import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    env: {
      NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:test-app-id',
      NEXT_PUBLIC_FIREBASE_USE_EMULATOR: 'true',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    },
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/e2e/**',
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/coverage/**',
        '**/dist/**',
        '**/.next/**',
      ],
    },
    // Mock Firebase for tests
    alias: {
      '@': resolve(__dirname, './src'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/components': resolve(__dirname, './src/components'),
      '@/types': resolve(__dirname, './src/lib/types'),
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/components': resolve(__dirname, './src/components'),
      '@/types': resolve(__dirname, './src/lib/types'),
    },
  },
});

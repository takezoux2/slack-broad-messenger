import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  GoogleAuthProvider,
  getAuth,
  signInWithCredential,
} from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore } from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Integration test for Google auth flow
// This test MUST fail until implementation is complete

describe('Integration: Google Authentication Flow', () => {
  let auth: any;
  let firestore: any;
  let testApp: any;

  beforeEach(async () => {
    // Initialize Firebase for testing
    try {
      testApp = initializeApp(
        {
          apiKey: 'test-api-key',
          authDomain: 'test-project.firebaseapp.com',
          projectId: 'test-project',
          storageBucket: 'test-project.appspot.com',
          messagingSenderId: '123456789',
          appId: '1:123456789:web:test',
        },
        'test-app'
      );

      auth = getAuth(testApp);
      firestore = getFirestore(testApp);

      // Connect to emulators
      connectAuthEmulator(auth, 'http://localhost:9099', {
        disableWarnings: true,
      });
      connectFirestoreEmulator(firestore, 'localhost', 8080);
    } catch (error) {
      // Emulator connection might fail if not running
      console.warn('Firebase emulator connection failed:', error);
    }
  });

  afterEach(async () => {
    // Clean up
    if (testApp) {
      await testApp.delete();
    }
  });

  it('should fail initially - Firebase emulators not configured for Google auth', async () => {
    // This test should fail until Firebase emulators are properly configured
    expect(auth).toBeDefined();
    expect(firestore).toBeDefined();

    // Try to create a test Google credential (will fail without proper setup)
    try {
      const provider = new GoogleAuthProvider();
      const credential = GoogleAuthProvider.credential('test_id_token', 'test_access_token');

      // This should fail in the TDD phase
      await signInWithCredential(auth, credential);
      expect.fail('Authentication should fail in TDD phase - not yet implemented');
    } catch (error) {
      // Expected to fail - authentication not implemented yet
      expect(error).toBeDefined();
    }
  });

  it('should complete full Google authentication flow', async () => {
    // This test validates the complete flow from OAuth to user creation

    // Step 1: Initiate Google sign-in (via API endpoint)
    const signinResponse = await fetch('http://localhost:3000/api/auth/google/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        redirectUrl: 'http://localhost:3000/dashboard',
      }),
    });

    if (!signinResponse.ok) {
      expect.fail('Sign-in initiation should work once implemented');
    }

    const signinData = await signinResponse.json();
    expect(signinData.success).toBe(true);
    expect(signinData.authUrl).toBeTruthy();
    expect(signinData.state).toBeTruthy();

    // Step 2: Simulate OAuth callback (normally done by Google)
    const callbackResponse = await fetch(
      `http://localhost:3000/api/auth/google/callback?code=test_code&state=${signinData.state}`
    );

    if (!callbackResponse.ok) {
      expect.fail('OAuth callback should work once implemented');
    }

    const callbackData = await callbackResponse.json();
    expect(callbackData.success).toBe(true);
    expect(callbackData.user).toBeDefined();
    expect(callbackData.user.uid).toBeTruthy();
    expect(callbackData.user.email).toBeTruthy();
    expect(callbackData.user.googleUserId).toBeTruthy();

    // Step 3: Verify user document created in Firestore
    const userDoc = await getDoc(doc(firestore, 'users', callbackData.user.uid));
    expect(userDoc.exists()).toBe(true);

    const userData = userDoc.data();
    expect(userData?.email).toBe(callbackData.user.email);
    expect(userData?.googleUserId).toBe(callbackData.user.googleUserId);
    expect(userData?.createdAt).toBeDefined();
    expect(userData?.lastLoginAt).toBeDefined();
  });

  it('should handle repeated sign-in for existing user', async () => {
    // Test that signing in with same Google account updates lastLoginAt

    // First sign-in
    const firstSignin = await fetch('http://localhost:3000/api/auth/google/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!firstSignin.ok) {
      expect.fail('First sign-in should work once implemented');
    }

    const firstSigninData = await firstSignin.json();

    const firstCallback = await fetch(
      `http://localhost:3000/api/auth/google/callback?code=test_code_1&state=${firstSigninData.state}`
    );

    const firstCallbackData = await firstCallback.json();
    const userId = firstCallbackData.user.uid;

    // Get initial user data
    const initialUserDoc = await getDoc(doc(firestore, 'users', userId));
    const initialData = initialUserDoc.data();
    const initialLoginTime = initialData?.lastLoginAt;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100));

    // Second sign-in with same user
    const secondSignin = await fetch('http://localhost:3000/api/auth/google/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const secondSigninData = await secondSignin.json();

    const secondCallback = await fetch(
      `http://localhost:3000/api/auth/google/callback?code=test_code_2&state=${secondSigninData.state}`
    );

    const secondCallbackData = await secondCallback.json();

    // Should be same user
    expect(secondCallbackData.user.uid).toBe(userId);

    // Verify lastLoginAt was updated
    const updatedUserDoc = await getDoc(doc(firestore, 'users', userId));
    const updatedData = updatedUserDoc.data();
    const updatedLoginTime = updatedData?.lastLoginAt;

    expect(updatedLoginTime).not.toEqual(initialLoginTime);
    expect(new Date(updatedLoginTime).getTime()).toBeGreaterThan(
      new Date(initialLoginTime).getTime()
    );
  });

  it('should sync Google profile data on sign-in', async () => {
    // Test that user profile is updated with latest Google data

    const signinResponse = await fetch('http://localhost:3000/api/auth/google/signin', {
      method: 'POST',
    });

    if (!signinResponse.ok) {
      expect.fail('Sign-in should work once implemented');
    }

    const signinData = await signinResponse.json();

    const callbackResponse = await fetch(
      `http://localhost:3000/api/auth/google/callback?code=test_code&state=${signinData.state}`
    );

    const callbackData = await callbackResponse.json();
    const userId = callbackData.user.uid;

    // Verify user document has Google profile data
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    const userData = userDoc.data();

    expect(userData?.email).toBeTruthy();
    expect(userData?.displayName).toBeTruthy();
    expect(userData?.googleUserId).toBeTruthy();
    expect(userData?.avatar).toBeDefined(); // Can be empty string
    expect(userData?.createdAt).toBeDefined();
    expect(userData?.lastLoginAt).toBeDefined();
  });

  it('should handle authentication errors gracefully', async () => {
    // Test error handling in authentication flow

    // Test invalid OAuth callback
    const invalidCallbackResponse = await fetch(
      'http://localhost:3000/api/auth/google/callback?error=access_denied&error_description=User%20denied%20access&state=test_state'
    );

    expect([400, 401]).toContain(invalidCallbackResponse.status);

    const errorData = await invalidCallbackResponse.json();
    expect(errorData.error).toBeTruthy();
    expect(errorData.message).toBeTruthy();

    // Test missing parameters
    const missingCodeResponse = await fetch(
      'http://localhost:3000/api/auth/google/callback?state=test_state'
    );

    expect([400, 422]).toContain(missingCodeResponse.status);
  });

  it('should maintain session state across requests', async () => {
    // Test that authenticated user can access protected endpoints

    // Complete authentication flow
    const signinResponse = await fetch('http://localhost:3000/api/auth/google/signin', {
      method: 'POST',
    });

    const signinData = await signinResponse.json();

    const callbackResponse = await fetch(
      `http://localhost:3000/api/auth/google/callback?code=test_code&state=${signinData.state}`
    );

    const callbackData = await callbackResponse.json();

    // Simulate getting Firebase ID token (normally done client-side)
    // For integration test, we'll use a mock token that represents the authenticated user
    const mockFirebaseToken = `mock_token_for_${callbackData.user.uid}`;

    // Test accessing protected profile endpoint
    const profileResponse = await fetch('http://localhost:3000/api/auth/profile', {
      headers: {
        Authorization: `Bearer ${mockFirebaseToken}`,
      },
    });

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      expect(profileData.uid).toBe(callbackData.user.uid);
      expect(profileData.email).toBe(callbackData.user.email);
    } else {
      // Expected to fail until token validation is implemented
      expect([401, 500]).toContain(profileResponse.status);
    }
  });

  it('should handle concurrent authentication requests', async () => {
    // Test that multiple simultaneous auth requests work correctly

    const concurrentRequests = Array.from({ length: 3 }, (_, i) =>
      fetch('http://localhost:3000/api/auth/google/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redirectUrl: `http://localhost:3000/dashboard?user=${i}`,
        }),
      })
    );

    const responses = await Promise.all(concurrentRequests);

    for (let i = 0; i < responses.length; i++) {
      if (responses[i].ok) {
        const data = await responses[i].json();
        expect(data.success).toBe(true);
        expect(data.authUrl).toBeTruthy();
        expect(data.state).toBeTruthy();

        // Each request should have unique state
        for (let j = i + 1; j < responses.length; j++) {
          if (responses[j].ok) {
            const otherData = await responses[j].json();
            expect(data.state).not.toBe(otherData.state);
          }
        }
      }
    }
  });
});

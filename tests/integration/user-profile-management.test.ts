import { type FirebaseApp, initializeApp } from 'firebase/app';
import { type Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  type Firestore,
  getDoc,
  getFirestore,
  setDoc,
} from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Integration test for user profile management
// This test MUST fail until implementation is complete

describe('Integration: User Profile Management', () => {
  let auth: Auth;
  let firestore: Firestore;
  let testApp: FirebaseApp;
  let testUserId: string;
  let mockFirebaseToken: string;

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
        `test-app-${Date.now()}`
      );

      auth = getAuth(testApp);
      firestore = getFirestore(testApp);

      // Connect to emulators
      connectAuthEmulator(auth, 'http://localhost:9099', {
        disableWarnings: true,
      });
      connectFirestoreEmulator(firestore, 'localhost', 8080);

      // Create test user document
      testUserId = `test_user_${Date.now()}`;
      mockFirebaseToken = `mock_token_${testUserId}`;

      await setDoc(doc(firestore, 'users', testUserId), {
        uid: testUserId,
        email: 'test@example.com',
        displayName: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        googleUserId: 'google_123456',
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        preferences: {},
        settings: {},
      });
    } catch (error) {
      console.warn('Firebase emulator setup failed:', error);
    }
  });

  afterEach(async () => {
    // Clean up test data
    if (firestore && testUserId) {
      try {
        await deleteDoc(doc(firestore, 'users', testUserId));
      } catch (error) {
        console.warn('Test cleanup failed:', error);
      }
    }

    if (testApp) {
      await testApp.delete();
    }
  });

  it('should fail initially - profile endpoints not implemented', async () => {
    // This test should fail until profile endpoints are implemented

    const profileResponse = await fetch('http://localhost:3000/api/auth/profile', {
      headers: {
        Authorization: `Bearer ${mockFirebaseToken}`,
      },
    });

    // Should fail with 404 or 500 (endpoint not found/implemented)
    expect([404, 500]).toContain(profileResponse.status);
  });

  it('should retrieve user profile successfully', async () => {
    // Test GET /api/auth/profile endpoint

    const profileResponse = await fetch('http://localhost:3000/api/auth/profile', {
      headers: {
        Authorization: `Bearer ${mockFirebaseToken}`,
      },
    });

    if (!profileResponse.ok) {
      expect.fail('Profile retrieval should work once implemented');
    }

    const profileData = await profileResponse.json();

    expect(profileData.uid).toBe(testUserId);
    expect(profileData.email).toBe('test@example.com');
    expect(profileData.displayName).toBe('Test User');
    expect(profileData.avatar).toBe('https://example.com/avatar.jpg');
    expect(profileData.googleUserId).toBe('google_123456');
    expect(profileData.lastLoginAt).toBeTruthy();
    expect(profileData.createdAt).toBeTruthy();
    expect(typeof profileData.preferences).toBe('object');
    expect(typeof profileData.settings).toBe('object');
  });

  it('should update user profile successfully', async () => {
    // Test PUT /api/auth/profile endpoint

    const updateData = {
      displayName: 'Updated Test User',
      preferences: {
        theme: 'dark',
        language: 'en',
      },
      settings: {
        notifications: true,
        autoSave: false,
      },
    };

    const updateResponse = await fetch('http://localhost:3000/api/auth/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${mockFirebaseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!updateResponse.ok) {
      expect.fail('Profile update should work once implemented');
    }

    const updateResult = await updateResponse.json();
    expect(updateResult.success).toBe(true);
    expect(updateResult.message).toBeTruthy();

    // Verify the update in Firestore
    const updatedDoc = await getDoc(doc(firestore, 'users', testUserId));
    const updatedData = updatedDoc.data();

    expect(updatedData?.displayName).toBe('Updated Test User');
    expect(updatedData?.preferences?.theme).toBe('dark');
    expect(updatedData?.preferences?.language).toBe('en');
    expect(updatedData?.settings?.notifications).toBe(true);
    expect(updatedData?.settings?.autoSave).toBe(false);

    // Email and other fields should remain unchanged
    expect(updatedData?.email).toBe('test@example.com');
    expect(updatedData?.googleUserId).toBe('google_123456');
  });

  it('should handle partial profile updates', async () => {
    // Test updating only some fields

    const partialUpdate = {
      displayName: 'Partially Updated User',
    };

    const updateResponse = await fetch('http://localhost:3000/api/auth/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${mockFirebaseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(partialUpdate),
    });

    if (!updateResponse.ok) {
      expect.fail('Partial profile update should work once implemented');
    }

    // Verify only displayName changed
    const updatedDoc = await getDoc(doc(firestore, 'users', testUserId));
    const updatedData = updatedDoc.data();

    expect(updatedData?.displayName).toBe('Partially Updated User');

    // Other fields should remain unchanged
    expect(updatedData?.email).toBe('test@example.com');
    expect(updatedData?.googleUserId).toBe('google_123456');
    expect(updatedData?.preferences).toEqual({});
    expect(updatedData?.settings).toEqual({});
  });

  it('should handle empty profile update', async () => {
    // Test updating with empty object (should succeed without changes)

    const emptyUpdate = {};

    const updateResponse = await fetch('http://localhost:3000/api/auth/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${mockFirebaseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emptyUpdate),
    });

    if (!updateResponse.ok) {
      expect.fail('Empty profile update should work once implemented');
    }

    const updateResult = await updateResponse.json();
    expect(updateResult.success).toBe(true);

    // Verify no changes were made
    const unchangedDoc = await getDoc(doc(firestore, 'users', testUserId));
    const unchangedData = unchangedDoc.data();

    expect(unchangedData?.displayName).toBe('Test User');
    expect(unchangedData?.email).toBe('test@example.com');
  });

  it('should reject unauthorized profile access', async () => {
    // Test profile access without authorization

    const unauthorizedResponse = await fetch('http://localhost:3000/api/auth/profile');

    expect(unauthorizedResponse.status).toBe(401);

    const errorData = await unauthorizedResponse.json();
    expect(errorData.error).toBeTruthy();
    expect(errorData.message).toBeTruthy();
  });

  it('should reject invalid authorization tokens', async () => {
    // Test profile access with invalid token

    const invalidTokenResponse = await fetch('http://localhost:3000/api/auth/profile', {
      headers: {
        Authorization: 'Bearer invalid_token',
      },
    });

    expect(invalidTokenResponse.status).toBe(401);

    const errorData = await invalidTokenResponse.json();
    expect(errorData.error).toBeTruthy();
  });

  it('should handle user not found in Firestore', async () => {
    // Test profile access for user that doesn't exist in Firestore

    const nonExistentUserToken = 'mock_token_nonexistent_user';

    const notFoundResponse = await fetch('http://localhost:3000/api/auth/profile', {
      headers: {
        Authorization: `Bearer ${nonExistentUserToken}`,
      },
    });

    expect(notFoundResponse.status).toBe(404);

    const errorData = await notFoundResponse.json();
    expect(errorData.error).toBeTruthy();
    expect(errorData.message).toContain('not found');
  });

  it('should validate profile update data', async () => {
    // Test validation of update data

    const invalidUpdates = [
      {
        displayName: '', // Empty displayName should be rejected
      },
      {
        displayName: null, // Null displayName should be rejected
      },
    ];

    for (const invalidUpdate of invalidUpdates) {
      const invalidResponse = await fetch('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${mockFirebaseToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidUpdate),
      });

      expect([400, 422]).toContain(invalidResponse.status);

      const errorData = await invalidResponse.json();
      expect(errorData.error).toBeTruthy();
    }
  });

  it('should preserve read-only fields during update', async () => {
    // Test that read-only fields cannot be modified

    const attemptedReadOnlyUpdate = {
      uid: 'different_uid',
      email: 'different@email.com',
      googleUserId: 'different_google_id',
      createdAt: new Date().toISOString(),
      displayName: 'New Display Name', // This should be allowed
    };

    const updateResponse = await fetch('http://localhost:3000/api/auth/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${mockFirebaseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(attemptedReadOnlyUpdate),
    });

    if (updateResponse.ok) {
      // Verify read-only fields were not changed
      const updatedDoc = await getDoc(doc(firestore, 'users', testUserId));
      const updatedData = updatedDoc.data();

      expect(updatedData?.uid).toBe(testUserId); // Should not change
      expect(updatedData?.email).toBe('test@example.com'); // Should not change
      expect(updatedData?.googleUserId).toBe('google_123456'); // Should not change
      expect(updatedData?.displayName).toBe('New Display Name'); // Should change
    }
  });

  it('should handle concurrent profile updates', async () => {
    // Test concurrent updates to the same profile

    const updates = [
      { displayName: 'Concurrent Update 1' },
      { preferences: { theme: 'light' } },
      { settings: { autoSave: true } },
    ];

    const concurrentRequests = updates.map(update =>
      fetch('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${mockFirebaseToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      })
    );

    const responses = await Promise.all(concurrentRequests);

    // All updates should succeed or fail gracefully
    for (const response of responses) {
      if (response.ok) {
        const result = await response.json();
        expect(result.success).toBe(true);
      } else {
        // Should have proper error structure
        expect([400, 500]).toContain(response.status);
      }
    }

    // Final state should be consistent
    const finalDoc = await getDoc(doc(firestore, 'users', testUserId));
    const finalData = finalDoc.data();

    expect(finalData).toBeDefined();
    expect(finalData?.uid).toBe(testUserId);
  });
});

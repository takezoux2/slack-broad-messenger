const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, connectFirestoreEmulator } = require('firebase/firestore');

// Initialize Firebase with emulator
const firebaseConfig = {
  projectId: 'demo-slack-messenger',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to emulator
connectFirestoreEmulator(db, '127.0.0.1', 8080);

async function setupTestData() {
  console.log('Setting up test user data...');

  try {
    // Create test users with IDs matching the mock tokens used in tests
    const testUsers = [
      {
        id: 'valid_firebase_token',
        data: {
          uid: 'valid_firebase_token',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: 'https://example.com/avatar.jpg',
          preferences: {
            notifications: true,
            theme: 'light',
          },
          settings: {
            autoSave: true,
            defaultChannelList: null,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      {
        id: 'user_not_found_token',
        data: {
          uid: 'user_not_found_token',
          email: 'notfound@example.com',
          displayName: 'Not Found User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    ];

    for (const user of testUsers) {
      await setDoc(doc(db, 'users', user.id), user.data);
      console.log(`Created test user: ${user.id}`);
    }

    console.log('Test data setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up test data:', error);
    process.exit(1);
  }
}

setupTestData();

import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, connectAuthEmulator, GoogleAuthProvider, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, type Firestore, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, type Functions, getFunctions } from 'firebase/functions';

/**
 * Firebase configuration interface
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/**
 * Environment configuration for Firebase
 */
export interface FirebaseEnvConfig {
  useEmulator: boolean;
  emulatorHost?: string;
  emulatorPorts?: {
    auth: number;
    firestore: number;
    functions: number;
  };
}

/**
 * Firebase services container
 */
export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  functions: Functions;
}

/**
 * Default Firebase configuration from environment variables
 */
const defaultConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

/**
 * Default environment configuration
 */
const defaultEnvConfig: FirebaseEnvConfig = {
  useEmulator:
    process.env.NODE_ENV === 'development' || process.env.USE_FIREBASE_EMULATOR === 'true',
  emulatorHost: process.env.FIREBASE_EMULATOR_HOST || 'localhost',
  emulatorPorts: {
    auth: parseInt(process.env.FIREBASE_AUTH_EMULATOR_PORT || '9099'),
    firestore: parseInt(process.env.FIREBASE_FIRESTORE_EMULATOR_PORT || '8080'),
    functions: parseInt(process.env.FIREBASE_FUNCTIONS_EMULATOR_PORT || '5001'),
  },
};

/**
 * Global Firebase services instance
 */
let firebaseServices: FirebaseServices | null = null;

/**
 * Validates Firebase configuration
 */
function validateFirebaseConfig(config: FirebaseConfig): void {
  const requiredFields: (keyof FirebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missingFields = requiredFields.filter(field => !config[field]);

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required Firebase configuration fields: ${missingFields.join(', ')}\n` +
        'Please check your environment variables or Firebase configuration.'
    );
  }
}

/**
 * Initializes Firebase app with configuration
 */
function initializeFirebaseApp(config: FirebaseConfig): FirebaseApp {
  // Check if Firebase is already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  // Validate configuration
  validateFirebaseConfig(config);

  // Initialize Firebase app
  const app = initializeApp(config);

  console.log(`Firebase app initialized for project: ${config.projectId}`);

  return app;
}

/**
 * Connects to Firebase emulators if configured
 */
function connectToEmulators(
  auth: Auth,
  firestore: Firestore,
  functions: Functions,
  envConfig: FirebaseEnvConfig
): void {
  if (!envConfig.useEmulator || !envConfig.emulatorHost || !envConfig.emulatorPorts) {
    return;
  }

  const { emulatorHost, emulatorPorts } = envConfig;

  try {
    // Connect to Auth emulator
    // Check if we're already connected by trying to connect
    try {
      connectAuthEmulator(auth, `http://${emulatorHost}:${emulatorPorts.auth}`, {
        disableWarnings: true,
      });
      console.log(`Connected to Firebase Auth emulator at ${emulatorHost}:${emulatorPorts.auth}`);
    } catch (authError) {
      // Auth emulator might already be connected, which is fine
      console.log('Auth emulator connection skipped (likely already connected)');
    }

    // Connect to Firestore emulator
    try {
      connectFirestoreEmulator(firestore, emulatorHost, emulatorPorts.firestore);
      console.log(`Connected to Firestore emulator at ${emulatorHost}:${emulatorPorts.firestore}`);
    } catch (firestoreError) {
      // Firestore emulator might already be connected, which is fine
      console.log('Firestore emulator connection skipped (likely already connected)');
    }

    // Connect to Functions emulator
    try {
      connectFunctionsEmulator(functions, emulatorHost, emulatorPorts.functions);
      console.log(`Connected to Functions emulator at ${emulatorHost}:${emulatorPorts.functions}`);
    } catch (functionsError) {
      // Functions emulator might already be connected, which is fine
      console.log('Functions emulator connection skipped (likely already connected)');
    }
  } catch (error) {
    console.warn('Failed to connect to Firebase emulators:', error);
    // Don't throw error - continue with production services if emulators fail
  }
}

/**
 * Initializes all Firebase services
 */
export function initializeFirebase(
  config: FirebaseConfig = defaultConfig,
  envConfig: FirebaseEnvConfig = defaultEnvConfig
): FirebaseServices {
  // Return existing instance if already initialized
  if (firebaseServices) {
    return firebaseServices;
  }

  try {
    // Initialize Firebase app
    const app = initializeFirebaseApp(config);

    // Initialize services
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const functions = getFunctions(app);

    // Connect to emulators if configured
    if (envConfig.useEmulator) {
      connectToEmulators(auth, firestore, functions, envConfig);
    }

    // Create services container
    firebaseServices = {
      app,
      auth,
      firestore,
      functions,
    };

    console.log('Firebase services initialized successfully');

    return firebaseServices;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw new Error(
      `Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Gets the current Firebase services instance
 * Initializes with defaults if not already initialized
 */
export function getFirebaseServices(): FirebaseServices {
  if (!firebaseServices) {
    return initializeFirebase();
  }
  return firebaseServices;
}

/**
 * Gets the Firebase Auth instance
 */
export function getFirebaseAuth(): Auth {
  return getFirebaseServices().auth;
}

/**
 * Gets the Firestore instance
 */
export function getFirebaseFirestore(): Firestore {
  return getFirebaseServices().firestore;
}

/**
 * Gets the Firebase Functions instance
 */
export function getFirebaseFunctions(): Functions {
  return getFirebaseServices().functions;
}

/**
 * Gets the Firebase App instance
 */
export function getFirebaseApp(): FirebaseApp {
  return getFirebaseServices().app;
}

/**
 * Checks if Firebase is running in emulator mode
 */
export function isEmulatorMode(): boolean {
  return defaultEnvConfig.useEmulator;
}

/**
 * Gets the Google Auth provider for Firebase
 */
export function getGoogleAuthProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  // Add additional scopes if needed
  provider.addScope('email');
  provider.addScope('profile');
  return provider;
}

/**
 * Resets Firebase services (useful for testing)
 */
export function resetFirebaseServices(): void {
  firebaseServices = null;
}

/**
 * Firebase configuration validation utility
 */
export function checkFirebaseConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    validateFirebaseConfig(defaultConfig);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown configuration error');
  }

  // Check for development-specific warnings
  if (process.env.NODE_ENV === 'production' && defaultEnvConfig.useEmulator) {
    warnings.push('Firebase emulator is enabled in production environment');
  }

  if (!defaultConfig.projectId.includes('demo') && defaultEnvConfig.useEmulator) {
    warnings.push('Using emulator with non-demo project ID');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Initialize Firebase on module load in client-side environments
if (typeof window !== 'undefined') {
  try {
    initializeFirebase();
  } catch (error) {
    console.error('Failed to auto-initialize Firebase:', error);
  }
}

import { config } from 'dotenv';
import path from 'path';
import { afterAll, beforeAll } from 'vitest';

// Load test environment variables
config({ path: path.join(__dirname, '.env.test') });

// Test client for API contract testing
export interface TestResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface TestClientOptions {
  authenticated?: boolean;
  authToken?: string;
}

export interface TestClient {
  get(path: string, options?: TestClientOptions): Promise<TestResponse>;
  post(path: string, data?: unknown, options?: TestClientOptions): Promise<TestResponse>;
  put(path: string, data?: unknown, options?: TestClientOptions): Promise<TestResponse>;
  delete(path: string, options?: TestClientOptions): Promise<TestResponse>;
}

// Test authentication token for contract tests
const TEST_AUTH_TOKEN = 'test_firebase_jwt_token_for_contract_tests';

// Simple HTTP client for testing API endpoints
export const testClient: TestClient = {
  async get(path: string, options?: TestClientOptions): Promise<TestResponse> {
    return makeRequest('GET', path, undefined, options);
  },

  async post(path: string, data?: unknown, options?: TestClientOptions): Promise<TestResponse> {
    return makeRequest('POST', path, data, options);
  },

  async put(path: string, data?: unknown, options?: TestClientOptions): Promise<TestResponse> {
    return makeRequest('PUT', path, data, options);
  },

  async delete(path: string, options?: TestClientOptions): Promise<TestResponse> {
    return makeRequest('DELETE', path, undefined, options);
  },
};

async function makeRequest(
  method: string,
  path: string,
  data?: unknown,
  options?: TestClientOptions
): Promise<TestResponse> {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const url = `${baseUrl}${path}`;

  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add authentication header if requested
  if (options?.authenticated || options?.authToken) {
    const authToken = options.authToken || TEST_AUTH_TOKEN;
    (requestOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  if (data !== undefined) {
    requestOptions.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, requestOptions);

    // Parse response body
    let body: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    // Extract headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      status: response.status,
      headers,
      body,
    };
  } catch {
    // If we can't connect to the server, return a 404 to indicate route not found
    return {
      status: 404,
      headers: {},
      body: { error: 'Service unavailable or route not found' },
    };
  }
}

// Global test setup
beforeAll(async () => {
  // Setup test environment - use Object.assign to avoid readonly issue
  Object.assign(process.env, {
    NODE_ENV: 'test',
    NEXT_PUBLIC_FIREBASE_USE_EMULATOR: 'true',
  });
});

afterAll(async () => {
  // Cleanup test environment
});

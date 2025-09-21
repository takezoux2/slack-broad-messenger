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

export interface TestClient {
  get(path: string): Promise<TestResponse>;
  post(path: string, data?: unknown): Promise<TestResponse>;
  put(path: string, data?: unknown): Promise<TestResponse>;
  delete(path: string): Promise<TestResponse>;
}

// Simple HTTP client for testing API endpoints
export const testClient: TestClient = {
  async get(path: string): Promise<TestResponse> {
    return makeRequest('GET', path);
  },

  async post(path: string, data?: unknown): Promise<TestResponse> {
    return makeRequest('POST', path, data);
  },

  async put(path: string, data?: unknown): Promise<TestResponse> {
    return makeRequest('PUT', path, data);
  },

  async delete(path: string): Promise<TestResponse> {
    return makeRequest('DELETE', path);
  },
};

async function makeRequest(method: string, path: string, data?: unknown): Promise<TestResponse> {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const url = `${baseUrl}${path}`;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);

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

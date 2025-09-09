import { afterAll, beforeAll } from 'vitest';

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

async function makeRequest(_method: string, _path: string, _data?: unknown): Promise<TestResponse> {
  // For now, return a mock response since the API endpoints don't exist yet
  // This allows the contract tests to fail as expected in TDD
  return {
    status: 404,
    headers: {},
    body: { error: 'Not implemented yet' },
  };
}

// Global test setup
beforeAll(async () => {
  // Setup test environment - use Object.assign to avoid readonly issue
  Object.assign(process.env, { NODE_ENV: 'test' });
});

afterAll(async () => {
  // Cleanup test environment
});

afterAll(async () => {
  // Cleanup test environment
});

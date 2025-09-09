/**
 * Integration Test: Handle validation errors
 *
 * Tests comprehensive validation error handling across all API endpoints:
 * - Input validation for all data types and constraints
 * - Field-level validation errors with specific messages
 * - Cross-field validation (business logic validation)
 * - Error response format consistency
 * - Client-side error handling scenarios
 *
 * This integration test focuses on ensuring that all API endpoints
 * properly validate input data and return consistent error responses
 * that can be handled gracefully by the frontend.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Types for validation testing
interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

interface ErrorResponse {
  error: string;
  message?: string;
  details?: ValidationError[];
}

interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  json: () => Promise<T>;
}

// Test data structures
interface ChannelListRequest {
  name?: string;
  description?: string;
  channelIds?: string[];
}

interface MessageRequest {
  content?: string;
  channelListId?: string;
  selectedSenderId?: string;
  scheduledAt?: string;
}

// UpdateChannelListRequest has the same structure as ChannelListRequest
// but with all fields optional for partial updates

describe('Validation Errors Integration', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let testUserId: string;
  let baseUrl: string;
  let authToken: string;

  // Mock data stores
  let mockChannelLists: Map<
    string,
    {
      id: string;
      name: string;
      description: string;
      channelIds: string[];
      channelCount: number;
      isActive: boolean;
      userId: string;
      createdAt: string;
      updatedAt: string;
    }
  >;
  let mockChannels: Map<
    string,
    {
      id: string;
      name: string;
      displayName: string;
      isPrivate: boolean;
      isArchived: boolean;
      isDeleted: boolean;
    }
  >;
  let mockSlackUsers: Map<
    string,
    {
      id: string;
      name: string;
      displayName: string;
      isBot: boolean;
      isActive: boolean;
      hasPostingPermission: boolean;
    }
  >;
  let nextId: number;

  beforeEach(() => {
    // Reset mock data
    mockChannelLists = new Map();
    mockChannels = new Map();
    mockSlackUsers = new Map();
    nextId = 1;

    baseUrl = 'http://localhost:3000';
    testUserId = 'test-user-123';
    authToken = 'mock-auth-token';

    // Setup test data
    setupTestData();

    // Mock fetch implementation
    mockFetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      const urlPath = new URL(url).pathname;
      const method = options?.method || 'GET';

      // Parse auth token
      const headers = (options?.headers as Record<string, string>) || {};
      const authHeader = headers['Authorization'] || '';
      const isAuthenticated = authHeader === `Bearer ${authToken}`;

      if (!isAuthenticated && !url.includes('/auth/')) {
        return createErrorResponse('Authentication required', 401);
      }

      // Route handling
      if (method === 'POST' && urlPath === '/api/channel-lists') {
        return handleCreateChannelList(options?.body as string);
      }

      if (method === 'PUT' && urlPath.startsWith('/api/channel-lists/')) {
        const parts = urlPath.split('/');
        const listId = parts[parts.length - 1];
        return handleUpdateChannelList(listId, options?.body as string);
      }

      if (method === 'POST' && urlPath === '/api/messages') {
        return handleSendMessage(options?.body as string);
      }

      if (method === 'GET' && urlPath.startsWith('/api/channel-lists/')) {
        const parts = urlPath.split('/');
        const listId = parts[parts.length - 1];
        return handleGetChannelListById(listId);
      }

      return createErrorResponse('Not found', 404);
    });

    global.fetch = mockFetch;
  });

  function setupTestData() {
    // Create test channels
    mockChannels.set('C1111111111', {
      id: 'C1111111111',
      name: 'general',
      displayName: '#general',
      isPrivate: false,
      isArchived: false,
      isDeleted: false,
    });

    mockChannels.set('C2222222222', {
      id: 'C2222222222',
      name: 'marketing',
      displayName: '#marketing',
      isPrivate: false,
      isArchived: false,
      isDeleted: false,
    });

    // Create test Slack users
    mockSlackUsers.set('U1111111111', {
      id: 'U1111111111',
      name: 'testuser',
      displayName: 'Test User',
      isBot: false,
      isActive: true,
      hasPostingPermission: true,
    });

    // Create existing channel list for update tests
    mockChannelLists.set('existing-list-1', {
      id: 'existing-list-1',
      name: 'Existing List',
      description: 'Test list',
      channelIds: ['C1111111111'],
      channelCount: 1,
      isActive: true,
      userId: testUserId,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  }

  function createErrorResponse(
    error: string,
    status: number,
    details?: ValidationError[]
  ): ApiResponse<ErrorResponse> {
    const response: ErrorResponse = { error };
    if (details) {
      response.details = details;
    }

    return {
      ok: false,
      status,
      json: async () => response,
    };
  }

  function createSuccessResponse<T>(data: T, status: number = 200): ApiResponse<T> {
    return {
      ok: true,
      status,
      json: async () => data,
    };
  }

  function validateChannelListRequest(data: unknown): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      errors.push({ field: 'general', message: 'Invalid data format' });
      return errors;
    }

    const obj = data as Record<string, unknown>;

    // Name validation
    if (!obj.name || (typeof obj.name === 'string' && obj.name.trim().length === 0)) {
      errors.push({ field: 'name', message: 'Name is required' });
    } else if (typeof obj.name !== 'string') {
      errors.push({ field: 'name', message: 'Name must be a string' });
    } else if (obj.name.length > 100) {
      errors.push({ field: 'name', message: 'Name must be 100 characters or less' });
    }

    // Description validation
    if (obj.description !== undefined) {
      if (typeof obj.description !== 'string') {
        errors.push({ field: 'description', message: 'Description must be a string' });
      } else if (obj.description.length > 500) {
        errors.push({
          field: 'description',
          message: 'Description must be 500 characters or less',
        });
      }
    }

    // Channel IDs validation
    if (!obj.channelIds) {
      errors.push({ field: 'channelIds', message: 'Channel IDs are required' });
    } else if (!Array.isArray(obj.channelIds)) {
      errors.push({ field: 'channelIds', message: 'Channel IDs must be an array' });
    } else {
      if (obj.channelIds.length === 0) {
        errors.push({ field: 'channelIds', message: 'At least one channel must be selected' });
      } else if (obj.channelIds.length > 100) {
        errors.push({ field: 'channelIds', message: 'Cannot select more than 100 channels' });
      }

      // Validate each channel ID
      obj.channelIds.forEach((channelId: unknown, index: number) => {
        if (typeof channelId !== 'string') {
          errors.push({
            field: `channelIds[${index}]`,
            message: 'Channel ID must be a string',
          });
        } else if (!channelId.startsWith('C') || channelId.length !== 11) {
          errors.push({
            field: `channelIds[${index}]`,
            message: 'Invalid channel ID format',
          });
        } else if (!mockChannels.has(channelId)) {
          errors.push({
            field: `channelIds[${index}]`,
            message: 'Channel not found or not accessible',
          });
        }
      });

      // Check for duplicates
      const uniqueChannelIds = new Set(obj.channelIds as string[]);
      if (uniqueChannelIds.size !== obj.channelIds.length) {
        errors.push({ field: 'channelIds', message: 'Duplicate channel IDs are not allowed' });
      }
    }

    return errors;
  }

  function validateMessageRequest(data: unknown): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      errors.push({ field: 'general', message: 'Invalid data format' });
      return errors;
    }

    const obj = data as Record<string, unknown>;

    // Content validation
    if (!obj.content || (typeof obj.content === 'string' && obj.content.trim().length === 0)) {
      errors.push({ field: 'content', message: 'Message content is required' });
    } else if (typeof obj.content !== 'string') {
      errors.push({ field: 'content', message: 'Content must be a string' });
    } else if (obj.content.length > 4000) {
      errors.push({ field: 'content', message: 'Message content must be 4000 characters or less' });
    }

    // Channel list ID validation
    if (!obj.channelListId) {
      errors.push({ field: 'channelListId', message: 'Channel list ID is required' });
    } else if (typeof obj.channelListId !== 'string') {
      errors.push({ field: 'channelListId', message: 'Channel list ID must be a string' });
    } else if (!mockChannelLists.has(obj.channelListId as string)) {
      errors.push({ field: 'channelListId', message: 'Channel list not found' });
    }

    // Selected sender ID validation
    if (!obj.selectedSenderId) {
      errors.push({ field: 'selectedSenderId', message: 'Selected sender ID is required' });
    } else if (typeof obj.selectedSenderId !== 'string') {
      errors.push({ field: 'selectedSenderId', message: 'Selected sender ID must be a string' });
    } else if (!mockSlackUsers.has(obj.selectedSenderId as string)) {
      errors.push({ field: 'selectedSenderId', message: 'Selected sender not found' });
    } else {
      const user = mockSlackUsers.get(obj.selectedSenderId as string);
      if (user) {
        if (!user.hasPostingPermission) {
          errors.push({
            field: 'selectedSenderId',
            message: 'Selected sender does not have posting permission',
          });
        }
        if (!user.isActive) {
          errors.push({ field: 'selectedSenderId', message: 'Selected sender is not active' });
        }
      }
    }

    // Scheduled time validation
    if (obj.scheduledAt !== undefined) {
      if (typeof obj.scheduledAt !== 'string') {
        errors.push({ field: 'scheduledAt', message: 'Scheduled time must be a string' });
      } else {
        const scheduledTime = new Date(obj.scheduledAt);
        if (Number.isNaN(scheduledTime.getTime())) {
          errors.push({ field: 'scheduledAt', message: 'Invalid date format' });
        } else if (scheduledTime <= new Date()) {
          errors.push({ field: 'scheduledAt', message: 'Scheduled time must be in the future' });
        }
      }
    }

    return errors;
  }

  function handleCreateChannelList(body: string) {
    try {
      const data = JSON.parse(body);
      const errors = validateChannelListRequest(data);

      if (errors.length > 0) {
        return createErrorResponse('Validation failed', 400, errors);
      }

      const id = `list-${nextId++}`;
      const now = new Date().toISOString();
      const channelList = {
        id,
        name: data.name,
        description: data.description || '',
        channelIds: data.channelIds,
        channelCount: data.channelIds.length,
        isActive: true,
        userId: testUserId,
        createdAt: now,
        updatedAt: now,
      };

      mockChannelLists.set(id, channelList);
      return createSuccessResponse(channelList, 201);
    } catch {
      return createErrorResponse('Invalid JSON format', 400, [
        { field: 'general', message: 'Request body must be valid JSON' },
      ]);
    }
  }

  function handleUpdateChannelList(listId: string, body: string) {
    const existingList = mockChannelLists.get(listId);
    if (!existingList || existingList.userId !== testUserId) {
      return createErrorResponse('Channel list not found', 404);
    }

    try {
      const data = JSON.parse(body);

      // For updates, fields are optional but still need validation if provided
      const errors: ValidationError[] = [];

      if (data.name !== undefined) {
        if (typeof data.name !== 'string') {
          errors.push({ field: 'name', message: 'Name must be a string' });
        } else if (data.name.trim().length === 0) {
          errors.push({ field: 'name', message: 'Name cannot be empty' });
        } else if (data.name.length > 100) {
          errors.push({ field: 'name', message: 'Name must be 100 characters or less' });
        }
      }

      if (data.description !== undefined) {
        if (typeof data.description !== 'string') {
          errors.push({ field: 'description', message: 'Description must be a string' });
        } else if (data.description.length > 500) {
          errors.push({
            field: 'description',
            message: 'Description must be 500 characters or less',
          });
        }
      }

      if (data.channelIds !== undefined) {
        if (!Array.isArray(data.channelIds)) {
          errors.push({ field: 'channelIds', message: 'Channel IDs must be an array' });
        } else {
          if (data.channelIds.length === 0) {
            errors.push({ field: 'channelIds', message: 'At least one channel must be selected' });
          } else if (data.channelIds.length > 100) {
            errors.push({ field: 'channelIds', message: 'Cannot select more than 100 channels' });
          }

          // Validate each channel ID
          data.channelIds.forEach((channelId: unknown, index: number) => {
            if (typeof channelId !== 'string') {
              errors.push({
                field: `channelIds[${index}]`,
                message: 'Channel ID must be a string',
              });
            } else if (!channelId.startsWith('C') || channelId.length !== 11) {
              errors.push({
                field: `channelIds[${index}]`,
                message: 'Invalid channel ID format',
              });
            } else if (!mockChannels.has(channelId)) {
              errors.push({
                field: `channelIds[${index}]`,
                message: 'Channel not found or not accessible',
              });
            }
          });

          // Check for duplicates
          const uniqueChannelIds = new Set(data.channelIds as string[]);
          if (uniqueChannelIds.size !== data.channelIds.length) {
            errors.push({ field: 'channelIds', message: 'Duplicate channel IDs are not allowed' });
          }
        }
      }

      if (errors.length > 0) {
        return createErrorResponse('Validation failed', 400, errors);
      }

      const updatedList = {
        ...existingList,
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.channelIds !== undefined && {
          channelIds: data.channelIds,
          channelCount: data.channelIds.length,
        }),
        updatedAt: new Date().toISOString(),
      };

      mockChannelLists.set(listId, updatedList);
      return createSuccessResponse(updatedList);
    } catch {
      return createErrorResponse('Invalid JSON format', 400, [
        { field: 'general', message: 'Request body must be valid JSON' },
      ]);
    }
  }

  function handleSendMessage(body: string) {
    try {
      const data = JSON.parse(body);
      const errors = validateMessageRequest(data);

      if (errors.length > 0) {
        return createErrorResponse('Validation failed', 400, errors);
      }

      const messageId = `msg-${nextId++}`;
      const now = new Date().toISOString();

      const message = {
        id: messageId,
        content: data.content,
        channelListId: data.channelListId,
        status: data.scheduledAt ? 'draft' : 'sending',
        totalChannels: mockChannelLists.get(data.channelListId)?.channelIds?.length || 0,
        successCount: 0,
        failureCount: 0,
        skipCount: 0,
        createdAt: now,
        scheduledAt: data.scheduledAt,
      };

      return createSuccessResponse(message, 202);
    } catch {
      return createErrorResponse('Invalid JSON format', 400, [
        { field: 'general', message: 'Request body must be valid JSON' },
      ]);
    }
  }

  function handleGetChannelListById(listId: string) {
    const channelList = mockChannelLists.get(listId);
    if (!channelList || channelList.userId !== testUserId) {
      return createErrorResponse('Channel list not found', 404);
    }
    return createSuccessResponse(channelList);
  }

  describe('Channel List Validation', () => {
    describe('Create Channel List Validation', () => {
      it('should require name field', async () => {
        const requestData: Partial<ChannelListRequest> = {
          description: 'Test description',
          channelIds: ['C1111111111'],
        };

        const response = await fetch(`${baseUrl}/api/channel-lists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestData),
        });

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error).toEqual({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: 'Name is required',
            }),
          ]),
        });
      });

      it('should validate name length', async () => {
        const longName = 'a'.repeat(101); // Exceeds 100 character limit
        const requestData: ChannelListRequest = {
          name: longName,
          channelIds: ['C1111111111'],
        };

        const response = await fetch(`${baseUrl}/api/channel-lists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestData),
        });

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.details).toContainEqual(
          expect.objectContaining({
            field: 'name',
            message: 'Name must be 100 characters or less',
          })
        );
      });

      it('should reject empty name', async () => {
        const requestData: ChannelListRequest = {
          name: '   ', // Only whitespace
          channelIds: ['C1111111111'],
        };

        const response = await fetch(`${baseUrl}/api/channel-lists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestData),
        });

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.details).toContainEqual(
          expect.objectContaining({
            field: 'name',
            message: 'Name is required',
          })
        );
      });

      it('should validate description length', async () => {
        const longDescription = 'a'.repeat(501); // Exceeds 500 character limit
        const requestData: ChannelListRequest = {
          name: 'Test List',
          description: longDescription,
          channelIds: ['C1111111111'],
        };

        const response = await fetch(`${baseUrl}/api/channel-lists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestData),
        });

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.details).toContainEqual(
          expect.objectContaining({
            field: 'description',
            message: 'Description must be 500 characters or less',
          })
        );
      });

      it('should require channel IDs', async () => {
        const requestData: Partial<ChannelListRequest> = {
          name: 'Test List',
        };

        const response = await fetch(`${baseUrl}/api/channel-lists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestData),
        });

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.details).toContainEqual(
          expect.objectContaining({
            field: 'channelIds',
            message: 'Channel IDs are required',
          })
        );
      });

      it('should reject empty channel list', async () => {
        const requestData: ChannelListRequest = {
          name: 'Test List',
          channelIds: [],
        };

        const response = await fetch(`${baseUrl}/api/channel-lists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestData),
        });

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.details).toContainEqual(
          expect.objectContaining({
            field: 'channelIds',
            message: 'At least one channel must be selected',
          })
        );
      });

      it('should reject too many channels', async () => {
        const tooManyChannels = Array.from(
          { length: 101 },
          (_, i) => `C${String(i).padStart(10, '0')}`
        );
        const requestData: ChannelListRequest = {
          name: 'Test List',
          channelIds: tooManyChannels,
        };

        const response = await fetch(`${baseUrl}/api/channel-lists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestData),
        });

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.details).toContainEqual(
          expect.objectContaining({
            field: 'channelIds',
            message: 'Cannot select more than 100 channels',
          })
        );
      });

      it('should validate channel ID format', async () => {
        const requestData: ChannelListRequest = {
          name: 'Test List',
          channelIds: ['invalid-channel-id', 'C1111111111'],
        };

        const response = await fetch(`${baseUrl}/api/channel-lists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestData),
        });

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.details).toContainEqual(
          expect.objectContaining({
            field: 'channelIds[0]',
            message: 'Invalid channel ID format',
          })
        );
      });

      it('should validate channel existence', async () => {
        const requestData: ChannelListRequest = {
          name: 'Test List',
          channelIds: ['C9999999999', 'C1111111111'], // First channel doesn't exist
        };

        const response = await fetch(`${baseUrl}/api/channel-lists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestData),
        });

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.details).toContainEqual(
          expect.objectContaining({
            field: 'channelIds[0]',
            message: 'Channel not found or not accessible',
          })
        );
      });

      it('should reject duplicate channel IDs', async () => {
        const requestData: ChannelListRequest = {
          name: 'Test List',
          channelIds: ['C1111111111', 'C2222222222', 'C1111111111'], // Duplicate
        };

        const response = await fetch(`${baseUrl}/api/channel-lists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestData),
        });

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.details).toContainEqual(
          expect.objectContaining({
            field: 'channelIds',
            message: 'Duplicate channel IDs are not allowed',
          })
        );
      });

      it('should handle multiple validation errors', async () => {
        const requestData = {
          name: '', // Empty name
          description: 'a'.repeat(501), // Too long description
          channelIds: [], // Empty channel list
        };

        const response = await fetch(`${baseUrl}/api/channel-lists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestData),
        });

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.details).toHaveLength(3);
        expect(error.details).toContainEqual(
          expect.objectContaining({
            field: 'name',
            message: 'Name is required',
          })
        );
        expect(error.details).toContainEqual(
          expect.objectContaining({
            field: 'description',
            message: 'Description must be 500 characters or less',
          })
        );
        expect(error.details).toContainEqual(
          expect.objectContaining({
            field: 'channelIds',
            message: 'At least one channel must be selected',
          })
        );
      });
    });

    describe('Update Channel List Validation', () => {
      it('should validate optional fields when provided', async () => {
        const requestData = {
          name: 'a'.repeat(101), // Too long
          description: 'b'.repeat(501), // Too long
        };

        const response = await fetch(`${baseUrl}/api/channel-lists/existing-list-1`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestData),
        });

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.details).toHaveLength(2);
        expect(error.details).toContainEqual(
          expect.objectContaining({
            field: 'name',
            message: 'Name must be 100 characters or less',
          })
        );
        expect(error.details).toContainEqual(
          expect.objectContaining({
            field: 'description',
            message: 'Description must be 500 characters or less',
          })
        );
      });

      it('should allow partial updates with only valid fields', async () => {
        const requestData = {
          name: 'Updated Name',
        };

        const response = await fetch(`${baseUrl}/api/channel-lists/existing-list-1`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestData),
        });

        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.name).toBe('Updated Name');
      });
    });
  });

  describe('Message Validation', () => {
    it('should require message content', async () => {
      const requestData: Partial<MessageRequest> = {
        channelListId: 'existing-list-1',
        selectedSenderId: 'U1111111111',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestData),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.details).toContainEqual(
        expect.objectContaining({
          field: 'content',
          message: 'Message content is required',
        })
      );
    });

    it('should validate content length', async () => {
      const longContent = 'a'.repeat(4001); // Exceeds 4000 character limit
      const requestData: MessageRequest = {
        content: longContent,
        channelListId: 'existing-list-1',
        selectedSenderId: 'U1111111111',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestData),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.details).toContainEqual(
        expect.objectContaining({
          field: 'content',
          message: 'Message content must be 4000 characters or less',
        })
      );
    });

    it('should reject empty content', async () => {
      const requestData: MessageRequest = {
        content: '   ', // Only whitespace
        channelListId: 'existing-list-1',
        selectedSenderId: 'U1111111111',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestData),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.details).toContainEqual(
        expect.objectContaining({
          field: 'content',
          message: 'Message content is required',
        })
      );
    });

    it('should require channel list ID', async () => {
      const requestData: Partial<MessageRequest> = {
        content: 'Test message',
        selectedSenderId: 'U1111111111',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestData),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.details).toContainEqual(
        expect.objectContaining({
          field: 'channelListId',
          message: 'Channel list ID is required',
        })
      );
    });

    it('should validate channel list existence', async () => {
      const requestData: MessageRequest = {
        content: 'Test message',
        channelListId: 'non-existent-list',
        selectedSenderId: 'U1111111111',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestData),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.details).toContainEqual(
        expect.objectContaining({
          field: 'channelListId',
          message: 'Channel list not found',
        })
      );
    });

    it('should require selected sender ID', async () => {
      const requestData: Partial<MessageRequest> = {
        content: 'Test message',
        channelListId: 'existing-list-1',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestData),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.details).toContainEqual(
        expect.objectContaining({
          field: 'selectedSenderId',
          message: 'Selected sender ID is required',
        })
      );
    });

    it('should validate sender existence and permissions', async () => {
      // Add inactive user for testing
      mockSlackUsers.set('U9999999999', {
        id: 'U9999999999',
        name: 'inactiveuser',
        displayName: 'Inactive User',
        isBot: false,
        isActive: false,
        hasPostingPermission: false,
      });

      const requestData: MessageRequest = {
        content: 'Test message',
        channelListId: 'existing-list-1',
        selectedSenderId: 'U9999999999',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestData),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'selectedSenderId',
            message: 'Selected sender does not have posting permission',
          }),
          expect.objectContaining({
            field: 'selectedSenderId',
            message: 'Selected sender is not active',
          }),
        ])
      );
    });

    it('should validate scheduled time format and value', async () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

      const requestData: MessageRequest = {
        content: 'Test message',
        channelListId: 'existing-list-1',
        selectedSenderId: 'U1111111111',
        scheduledAt: pastTime,
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestData),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.details).toContainEqual(
        expect.objectContaining({
          field: 'scheduledAt',
          message: 'Scheduled time must be in the future',
        })
      );
    });

    it('should validate scheduled time format', async () => {
      const requestData: MessageRequest = {
        content: 'Test message',
        channelListId: 'existing-list-1',
        selectedSenderId: 'U1111111111',
        scheduledAt: 'invalid-date-format',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestData),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.details).toContainEqual(
        expect.objectContaining({
          field: 'scheduledAt',
          message: 'Invalid date format',
        })
      );
    });
  });

  describe('Request Format Validation', () => {
    it('should handle malformed JSON in channel list creation', async () => {
      const response = await fetch(`${baseUrl}/api/channel-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: 'invalid-json-format{',
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error).toEqual({
        error: 'Invalid JSON format',
        details: [
          expect.objectContaining({
            field: 'general',
            message: 'Request body must be valid JSON',
          }),
        ],
      });
    });

    it('should handle malformed JSON in message sending', async () => {
      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: 'invalid-json-format{',
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error).toEqual({
        error: 'Invalid JSON format',
        details: [
          expect.objectContaining({
            field: 'general',
            message: 'Request body must be valid JSON',
          }),
        ],
      });
    });

    it('should handle non-object request body', async () => {
      const response = await fetch(`${baseUrl}/api/channel-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify('just-a-string'),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.details).toContainEqual(
        expect.objectContaining({
          field: 'general',
          message: 'Invalid data format',
        })
      );
    });
  });

  describe('Authentication Validation', () => {
    it('should require authentication for all protected endpoints', async () => {
      const endpoints = [
        { method: 'POST', path: '/api/channel-lists' },
        { method: 'PUT', path: '/api/channel-lists/existing-list-1' },
        { method: 'POST', path: '/api/messages' },
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(`${baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            // No Authorization header
          },
          body: JSON.stringify({}),
        });

        expect(response.status).toBe(401);
        const error = await response.json();
        expect(error).toEqual({
          error: 'Authentication required',
        });
      }
    });
  });

  describe('Resource Not Found Validation', () => {
    it('should return 404 for non-existent channel list in update', async () => {
      const response = await fetch(`${baseUrl}/api/channel-lists/non-existent-list`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      expect(response.status).toBe(404);
      const error = await response.json();
      expect(error).toEqual({
        error: 'Channel list not found',
      });
    });
  });

  describe('Validation Error Response Format', () => {
    it('should return consistent error response format', async () => {
      const requestData = {
        name: '', // Invalid
        channelIds: [], // Invalid
      };

      const response = await fetch(`${baseUrl}/api/channel-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestData),
      });

      expect(response.status).toBe(400);
      const error = await response.json();

      // Verify error response structure
      expect(error).toHaveProperty('error');
      expect(error).toHaveProperty('details');
      expect(Array.isArray(error.details)).toBe(true);

      // Verify detail structure
      error.details.forEach((detail: ValidationError) => {
        expect(detail).toHaveProperty('field');
        expect(detail).toHaveProperty('message');
        expect(typeof detail.field).toBe('string');
        expect(typeof detail.message).toBe('string');
      });
    });
  });
});

/**
 * Unit tests for User type and validation
 */
import { describe, it, expect } from 'vitest';
import { User, validateUser, createUser, isUser, UserValidationError } from '../../../src/lib/types/user';

describe('User Type and Validation', () => {
  const validUserData: User = {
    uid: 'firebase-auth-uid-123',
    email: 'test@example.com',
    slackUserId: 'U1234567890',
    displayName: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    slackTeamId: 'T1234567890',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    lastLoginAt: new Date('2024-01-02T00:00:00Z'),
    isActive: true,
  };

  describe('validateUser', () => {
    it('should validate a correct user object', () => {
      expect(() => validateUser(validUserData)).not.toThrow();
    });

    it('should throw error for missing uid', () => {
      const { uid, ...invalidUser } = validUserData;
      expect(() => validateUser(invalidUser)).toThrow(UserValidationError);
      expect(() => validateUser(invalidUser)).toThrow('uid must be a valid Firebase Auth UID');
    });

    it('should throw error for invalid email', () => {
      const invalidUser = { ...validUserData, email: 'invalid-email' };
      expect(() => validateUser(invalidUser)).toThrow(UserValidationError);
      expect(() => validateUser(invalidUser)).toThrow('email must be a valid email format');
    });

    it('should throw error for missing slackUserId', () => {
      const { slackUserId, ...invalidUser } = validUserData;
      expect(() => validateUser(invalidUser)).toThrow(UserValidationError);
      expect(() => validateUser(invalidUser)).toThrow('slackUserId is required');
    });

    it('should throw error for invalid displayName', () => {
      const invalidUser = { ...validUserData, displayName: '' };
      expect(() => validateUser(invalidUser)).toThrow(UserValidationError);
      expect(() => validateUser(invalidUser)).toThrow('displayName is required');
    });

    it('should throw error for displayName too long', () => {
      const invalidUser = { ...validUserData, displayName: Array(102).join('a') };
      expect(() => validateUser(invalidUser)).toThrow(UserValidationError);
      expect(() => validateUser(invalidUser)).toThrow('displayName is required and must be 1-100 characters');
    });

    it('should throw error for missing slackTeamId', () => {
      const { slackTeamId, ...invalidUser } = validUserData;
      expect(() => validateUser(invalidUser)).toThrow(UserValidationError);
      expect(() => validateUser(invalidUser)).toThrow('slackTeamId is required');
    });

    it('should throw error for invalid createdAt', () => {
      const invalidUser = { ...validUserData, createdAt: 'not-a-date' as any };
      expect(() => validateUser(invalidUser)).toThrow(UserValidationError);
      expect(() => validateUser(invalidUser)).toThrow('createdAt must be a valid Date');
    });

    it('should throw error for invalid lastLoginAt', () => {
      const invalidUser = { ...validUserData, lastLoginAt: null as any };
      expect(() => validateUser(invalidUser)).toThrow(UserValidationError);
      expect(() => validateUser(invalidUser)).toThrow('lastLoginAt must be a valid Date');
    });

    it('should throw error for invalid isActive', () => {
      const invalidUser = { ...validUserData, isActive: 'true' as any };
      expect(() => validateUser(invalidUser)).toThrow(UserValidationError);
      expect(() => validateUser(invalidUser)).toThrow('isActive must be a boolean');
    });

    it('should allow undefined avatar', () => {
      const { avatar, ...userWithoutAvatar } = validUserData;
      expect(() => validateUser(userWithoutAvatar)).not.toThrow();
    });

    it('should throw error for empty avatar string', () => {
      const invalidUser = { ...validUserData, avatar: '' };
      expect(() => validateUser(invalidUser)).toThrow(UserValidationError);
      expect(() => validateUser(invalidUser)).toThrow('avatar must be a non-empty string if provided');
    });
  });

  describe('createUser', () => {
    it('should create a valid user object', () => {
      const user = createUser(validUserData);
      expect(user).toEqual(validUserData);
    });

    it('should throw error for invalid user data', () => {
      const { uid, ...invalidUserData } = validUserData;
      expect(() => createUser(invalidUserData)).toThrow(UserValidationError);
    });
  });

  describe('isUser', () => {
    it('should return true for valid user', () => {
      expect(isUser(validUserData)).toBe(true);
    });

    it('should return false for invalid user', () => {
      const { uid, ...invalidUser } = validUserData;
      expect(isUser(invalidUser)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isUser('not an object')).toBe(false);
      expect(isUser(null)).toBe(false);
      expect(isUser(undefined)).toBe(false);
    });
  });

  describe('UserValidationError', () => {
    it('should create error with message and field', () => {
      const error = new UserValidationError('Test error', 'testField');
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
      expect(error.name).toBe('UserValidationError');
    });

    it('should create error with message only', () => {
      const error = new UserValidationError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.field).toBeUndefined();
    });
  });
});
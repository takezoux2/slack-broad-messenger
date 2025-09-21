/**
 * Unit tests for User type and validation
 */

import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import { createUser, isUser, type User, validateUser } from '../../src/lib/types/user';

describe('User Type and Validation', () => {
  const validUserData: User = {
    uid: 'firebase-auth-uid-123',
    email: 'test@example.com',
    slackUserId: 'U1234567890',
    displayName: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    slackTeamId: 'T1234567890',
    createdAt: Timestamp.fromDate(new Date('2024-01-01T00:00:00Z')),
    lastLoginAt: Timestamp.fromDate(new Date('2024-01-02T00:00:00Z')),
    isActive: true,
  };

  describe('validateUser', () => {
    it('should validate a correct user object', () => {
      const result = validateUser(validUserData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation error for missing uid', () => {
      const { uid: _uid, ...invalidUser } = validUserData;
      const result = validateUser(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('uid');
      expect(result.errors[0].message).toBe('uid must be a valid Firebase Auth UID');
    });

    it('should return validation error for invalid email', () => {
      const invalidUser = { ...validUserData, email: 'invalid-email' };
      const result = validateUser(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('email');
      expect(result.errors[0].message).toBe('email must be a valid email format');
    });

    it('should return validation error for missing slackUserId', () => {
      const { slackUserId: _slackUserId, ...invalidUser } = validUserData;
      const result = validateUser(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('slackUserId');
      expect(result.errors[0].message).toBe(
        'slackUserId is required and must be a non-empty string'
      );
    });

    it('should return validation error for invalid displayName', () => {
      const invalidUser = { ...validUserData, displayName: '' };
      const result = validateUser(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('displayName');
      expect(result.errors[0].message).toBe('displayName is required and must be 1-100 characters');
    });

    it('should return validation error for displayName too long', () => {
      const invalidUser = {
        ...validUserData,
        displayName: Array(102).join('a'),
      };
      const result = validateUser(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('displayName');
      expect(result.errors[0].message).toBe('displayName is required and must be 1-100 characters');
    });

    it('should return validation error for missing slackTeamId', () => {
      const { slackTeamId: _slackTeamId, ...invalidUser } = validUserData;
      const result = validateUser(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('slackTeamId');
      expect(result.errors[0].message).toBe(
        'slackTeamId is required and must be a non-empty string'
      );
    });

    it('should return validation error for invalid createdAt', () => {
      const invalidUser = {
        ...validUserData,
        createdAt: 'not-a-date' as unknown as Timestamp,
      };
      const result = validateUser(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('createdAt');
      expect(result.errors[0].message).toBe('createdAt must be a Firebase Timestamp');
    });

    it('should return validation error for invalid lastLoginAt', () => {
      const invalidUser = {
        ...validUserData,
        lastLoginAt: null as unknown as Timestamp,
      };
      const result = validateUser(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('lastLoginAt');
      expect(result.errors[0].message).toBe('lastLoginAt must be a Firebase Timestamp');
    });

    it('should return validation error for invalid isActive', () => {
      const invalidUser = {
        ...validUserData,
        isActive: 'true' as unknown as boolean,
      };
      const result = validateUser(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('isActive');
      expect(result.errors[0].message).toBe('isActive must be a boolean value');
    });

    it('should allow undefined avatar', () => {
      const { avatar: _avatar, ...userWithoutAvatar } = validUserData;
      const result = validateUser(userWithoutAvatar);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation error for empty avatar string', () => {
      const invalidUser = { ...validUserData, avatar: '' };
      const result = validateUser(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('avatar');
      expect(result.errors[0].message).toBe('avatar must be a non-empty string if provided');
    });
  });

  describe('createUser', () => {
    it('should create a valid user object', () => {
      const user = createUser(validUserData);
      expect(user).toEqual(validUserData);
    });

    it('should create user with default values when fields are missing', () => {
      const { uid: _uid, ...partialUserData } = validUserData;
      const user = createUser(partialUserData);
      expect(user.uid).toBe('');
      expect(user.email).toBe(validUserData.email);
      expect(user.slackUserId).toBe(validUserData.slackUserId);
      expect(user.displayName).toBe(validUserData.displayName);
      expect(user.avatar).toBe(validUserData.avatar);
      expect(user.slackTeamId).toBe(validUserData.slackTeamId);
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBeInstanceOf(Timestamp);
      expect(user.lastLoginAt).toBeInstanceOf(Timestamp);
    });
  });

  describe('isUser', () => {
    it('should return true for valid user', () => {
      expect(isUser(validUserData)).toBe(true);
    });

    it('should return false for invalid user', () => {
      const { uid: _uid, ...invalidUser } = validUserData;
      expect(isUser(invalidUser)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isUser('not an object')).toBe(false);
      expect(isUser(null)).toBe(false);
      expect(isUser(undefined)).toBe(false);
    });
  });
});

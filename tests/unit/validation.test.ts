import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import {
  isValidEmail,
  isValidSlackChannelId,
  isValidSlackUserId,
  sanitizeChannelName,
  validateChannelList,
  validateMessage,
  validateMessageContent,
  validateMessageDelivery,
  validateUser,
} from '../../src/lib/validation';

/**
 * Unit tests for validation functions
 * Tests all validation logic used throughout the application
 */

describe('Email Validation', () => {
  it('should validate correct email formats', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
    expect(isValidEmail('test123@gmail.com')).toBe(true);
  });

  it('should reject invalid email formats', () => {
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('test..test@example.com')).toBe(false);
  });
});

describe('Slack ID Validation', () => {
  it('should validate correct Slack channel IDs', () => {
    expect(isValidSlackChannelId('C1234567890')).toBe(true);
    expect(isValidSlackChannelId('C0ABC123DEF')).toBe(true);
    expect(isValidSlackChannelId('CABCDEFGHIJ')).toBe(true);
  });

  it('should reject invalid Slack channel IDs', () => {
    expect(isValidSlackChannelId('D1234567890')).toBe(false); // Direct message
    expect(isValidSlackChannelId('1234567890')).toBe(false); // No prefix
    expect(isValidSlackChannelId('C123')).toBe(false); // Too short
    expect(isValidSlackChannelId('')).toBe(false);
    expect(isValidSlackChannelId('c1234567890')).toBe(false); // Lowercase
  });

  it('should validate correct Slack user IDs', () => {
    expect(isValidSlackUserId('U1234567890')).toBe(true);
    expect(isValidSlackUserId('U0ABC123DEF')).toBe(true);
    expect(isValidSlackUserId('UABCDEFGHIJ')).toBe(true);
  });

  it('should reject invalid Slack user IDs', () => {
    expect(isValidSlackUserId('C1234567890')).toBe(false); // Channel ID
    expect(isValidSlackUserId('1234567890')).toBe(false); // No prefix
    expect(isValidSlackUserId('U123')).toBe(false); // Too short
    expect(isValidSlackUserId('')).toBe(false);
    expect(isValidSlackUserId('u1234567890')).toBe(false); // Lowercase
  });
});

describe('Channel Name Sanitization', () => {
  it('should sanitize channel names correctly', () => {
    expect(sanitizeChannelName('#general')).toBe('general');
    expect(sanitizeChannelName('general')).toBe('general');
    expect(sanitizeChannelName('#random-chat')).toBe('random-chat');
    expect(sanitizeChannelName('test_channel')).toBe('test_channel');
  });

  it('should handle edge cases in channel names', () => {
    expect(sanitizeChannelName('')).toBe('');
    expect(sanitizeChannelName('#')).toBe('');
    expect(sanitizeChannelName('##double-hash')).toBe('#double-hash');
  });
});

describe('Message Content Validation', () => {
  it('should validate correct message content', () => {
    const result1 = validateMessageContent('Hello world!');
    expect(result1.isValid).toBe(true);
    expect(result1.errors).toHaveLength(0);

    const result2 = validateMessageContent('A'.repeat(4000));
    expect(result2.isValid).toBe(true);
    expect(result2.errors).toHaveLength(0);
  });

  it('should reject empty message content', () => {
    const result = validateMessageContent('');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Message content is required');
  });

  it('should reject message content that is too long', () => {
    const result = validateMessageContent('A'.repeat(4001));
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Message content must not exceed 4000 characters');
  });

  it('should reject message content with only whitespace', () => {
    const result = validateMessageContent('   \n\t   ');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Message content cannot be only whitespace');
  });
});

describe('User Validation', () => {
  const validUser = {
    uid: 'test_user_123',
    email: 'test@example.com',
    slackUserId: 'U1234567890',
    displayName: 'Test User',
    slackTeamId: 'T1234567890',
    createdAt: Timestamp.now(),
    lastLoginAt: Timestamp.now(),
    isActive: true,
  };

  it('should validate correct user data', () => {
    const result = validateUser(validUser);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject user with invalid email', () => {
    const invalidUser = { ...validUser, email: 'invalid-email' };
    const result = validateUser(invalidUser);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'email')).toBe(true);
  });

  it('should reject user with invalid Slack user ID', () => {
    const invalidUser = { ...validUser, slackUserId: 'invalid-id' };
    const result = validateUser(invalidUser);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'slackUserId')).toBe(true);
  });

  it('should reject user with missing required fields', () => {
    const invalidUser = { ...validUser, displayName: undefined };
    const result = validateUser(invalidUser);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'displayName')).toBe(true);
  });
});

describe('Channel List Validation', () => {
  const validChannelList = {
    id: 'list_123',
    ownerId: 'user_123',
    name: 'Marketing Channels',
    description: 'Channels for marketing team',
    channelIds: ['C1234567890', 'C0987654321'],
    channelCount: 2,
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  it('should validate correct channel list data', () => {
    const result = validateChannelList(validChannelList);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject channel list with empty name', () => {
    const invalidList = { ...validChannelList, name: '' };
    const result = validateChannelList(invalidList);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'name')).toBe(true);
  });

  it('should reject channel list with too many channels', () => {
    const tooManyChannels = Array(101).fill('C1234567890');
    const invalidList = {
      ...validChannelList,
      channelIds: tooManyChannels,
      channelCount: 101,
    };
    const result = validateChannelList(invalidList);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'channelIds')).toBe(true);
  });

  it('should reject channel list with mismatched channel count', () => {
    const invalidList = { ...validChannelList, channelCount: 5 };
    const result = validateChannelList(invalidList);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'channelCount')).toBe(true);
  });

  it('should reject channel list with invalid channel IDs', () => {
    const invalidList = {
      ...validChannelList,
      channelIds: ['invalid-id', 'C1234567890'],
    };
    const result = validateChannelList(invalidList);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'channelIds')).toBe(true);
  });
});

describe('Message Validation', () => {
  const validMessage = {
    id: 'msg_123',
    senderId: 'user_123',
    selectedSenderId: 'U1234567890',
    channelListId: 'list_123',
    content: 'Hello team! Weekly update: All projects on track.',
    status: 'draft' as const,
    totalChannels: 3,
    successCount: 0,
    failureCount: 0,
    skipCount: 0,
    createdAt: Timestamp.now(),
  };

  it('should validate correct message data', () => {
    const result = validateMessage(validMessage);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject message with invalid content', () => {
    const invalidMessage = { ...validMessage, content: '' };
    const result = validateMessage(invalidMessage);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'content')).toBe(true);
  });

  it('should reject message with invalid status', () => {
    const invalidMessage = { ...validMessage, status: 'invalid-status' as any };
    const result = validateMessage(invalidMessage);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'status')).toBe(true);
  });

  it('should reject message with negative counts', () => {
    const invalidMessage = { ...validMessage, failureCount: -1 };
    const result = validateMessage(invalidMessage);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'failureCount')).toBe(true);
  });

  it('should validate count consistency', () => {
    const invalidMessage = {
      ...validMessage,
      totalChannels: 3,
      successCount: 2,
      failureCount: 2, // 2 + 2 > 3
      skipCount: 0,
    };
    const result = validateMessage(invalidMessage);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.message.includes('exceed total channels'))).toBe(true);
  });
});

describe('Message Delivery Validation', () => {
  const validDelivery = {
    id: 'delivery_123',
    messageId: 'msg_123',
    channelId: 'C1234567890',
    channelName: 'general',
    status: 'pending' as const,
    retryCount: 0,
  };

  it('should validate correct delivery data', () => {
    const result = validateMessageDelivery(validDelivery);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject delivery with invalid channel ID', () => {
    const invalidDelivery = { ...validDelivery, channelId: 'invalid-id' };
    const result = validateMessageDelivery(invalidDelivery);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'channelId')).toBe(true);
  });

  it('should reject delivery with invalid status', () => {
    const invalidDelivery = {
      ...validDelivery,
      status: 'invalid-status' as any,
    };
    const result = validateMessageDelivery(invalidDelivery);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'status')).toBe(true);
  });

  it('should require slack message ID for successful deliveries', () => {
    const successfulDelivery = {
      ...validDelivery,
      status: 'success' as const,
      completedAt: Timestamp.now(),
    };
    const result = validateMessageDelivery(successfulDelivery);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'slackMessageId')).toBe(true);
  });

  it('should require error message for failed deliveries', () => {
    const failedDelivery = {
      ...validDelivery,
      status: 'failed' as const,
      completedAt: Timestamp.now(),
    };
    const result = validateMessageDelivery(failedDelivery);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'errorMessage')).toBe(true);
  });

  it('should validate timestamp sequences', () => {
    const now = Timestamp.now();
    const later = Timestamp.fromMillis(now.toMillis() + 1000);
    const earlier = Timestamp.fromMillis(now.toMillis() - 1000);

    const invalidDelivery = {
      ...validDelivery,
      sentAt: later,
      completedAt: earlier, // Completed before sent
    };
    const result = validateMessageDelivery(invalidDelivery);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'completedAt')).toBe(true);
  });
});

describe('Edge Cases and Boundary Testing', () => {
  it('should handle null and undefined inputs gracefully', () => {
    expect(validateUser(null).isValid).toBe(false);
    expect(validateUser(undefined).isValid).toBe(false);
    expect(validateChannelList({}).isValid).toBe(false);
    expect(validateMessage({}).isValid).toBe(false);
  });

  it('should handle boundary values for string lengths', () => {
    // Channel list name at maximum length
    const maxLengthName = 'A'.repeat(100);
    const validList = {
      id: 'test',
      ownerId: 'user',
      name: maxLengthName,
      channelIds: ['C1234567890'],
      channelCount: 1,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    expect(validateChannelList(validList).isValid).toBe(true);

    // Channel list name over maximum length
    const tooLongName = 'A'.repeat(101);
    const invalidList = { ...validList, name: tooLongName };
    expect(validateChannelList(invalidList).isValid).toBe(false);
  });

  it('should handle boundary values for array lengths', () => {
    // Maximum channels (100)
    const maxChannels = Array(100).fill('C1234567890');
    const validList = {
      id: 'test',
      ownerId: 'user',
      name: 'Max Channels',
      channelIds: maxChannels,
      channelCount: 100,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    expect(validateChannelList(validList).isValid).toBe(true);

    // Over maximum channels (101)
    const tooManyChannels = Array(101).fill('C1234567890');
    const invalidList = {
      ...validList,
      channelIds: tooManyChannels,
      channelCount: 101,
    };
    expect(validateChannelList(invalidList).isValid).toBe(false);
  });

  it('should handle special characters in content', () => {
    const specialCharContent = '🎉 Hello! @channel 👋 #announcement 🚀';
    const result = validateMessageContent(specialCharContent);
    expect(result.isValid).toBe(true);

    // Test with newlines and tabs
    const multilineContent = 'Line 1\nLine 2\n\tIndented line';
    const result2 = validateMessageContent(multilineContent);
    expect(result2.isValid).toBe(true);
  });
});

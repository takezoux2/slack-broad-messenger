/**
 * Real-time progress updates using Firebase listeners
 * Tracks message sending progress and provides live updates
 */

import React from 'react';
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase';
import { Message, MessageStatus } from './types/message';
import { MessageDelivery, DeliveryStatus } from './types/message-delivery';

export interface ProgressUpdate {
  messageId: string;
  status: MessageStatus;
  totalChannels: number;
  successCount: number;
  failureCount: number;
  skipCount: number;
  pendingCount: number;
  completedChannels: number;
  progressPercentage: number;
  currentChannel?: string;
  lastUpdated: Date;
}

export interface DeliveryUpdate {
  deliveryId: string;
  channelId: string;
  channelName: string;
  status: DeliveryStatus;
  errorMessage?: string;
  timestamp: Date;
}

export type ProgressCallback = (progress: ProgressUpdate) => void;
export type DeliveryCallback = (delivery: DeliveryUpdate) => void;

export class ProgressTracker {
  private messageListeners: Map<string, () => void> = new Map();
  private deliveryListeners: Map<string, () => void> = new Map();
  private db = getFirebaseFirestore();

  /**
   * Subscribe to real-time message progress updates
   */
  subscribeToMessageProgress(messageId: string, callback: ProgressCallback): () => void {
    const messageRef = doc(this.db, 'messages', messageId);

    const unsubscribe = onSnapshot(messageRef, doc => {
      if (doc.exists()) {
        const message = doc.data() as Message;
        const progress = this.calculateProgress(message);
        callback(progress);
      }
    });

    this.messageListeners.set(messageId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to real-time delivery updates for a message
   */
  subscribeToDeliveryUpdates(messageId: string, callback: DeliveryCallback): () => void {
    const deliveriesRef = collection(this.db, 'messages', messageId, 'deliveries');

    const unsubscribe = onSnapshot(deliveriesRef, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'modified') {
          const delivery = change.doc.data() as MessageDelivery;
          const update: DeliveryUpdate = {
            deliveryId: change.doc.id,
            channelId: delivery.channelId,
            channelName: delivery.channelName,
            status: delivery.status,
            errorMessage: delivery.errorMessage,
            timestamp: new Date(),
          };
          callback(update);
        }
      });
    });

    this.deliveryListeners.set(messageId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to all messages for a user
   */
  subscribeToUserMessages(userId: string, callback: (messages: Message[]) => void): () => void {
    const messagesRef = collection(this.db, 'messages');
    const q = query(messagesRef, where('senderId', '==', userId));

    return onSnapshot(q, snapshot => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      callback(messages);
    });
  }

  /**
   * Update message progress in Firestore
   */
  async updateMessageProgress(
    messageId: string,
    updates: Partial<{
      status: MessageStatus;
      successCount: number;
      failureCount: number;
      skipCount: number;
      completedAt: Date;
    }>
  ): Promise<void> {
    const messageRef = doc(this.db, 'messages', messageId);
    const firestoreUpdates: any = { ...updates };

    // Convert Date to Firestore Timestamp
    if (updates.completedAt) {
      firestoreUpdates.completedAt = Timestamp.fromDate(updates.completedAt);
    }

    await updateDoc(messageRef, firestoreUpdates);
  }

  /**
   * Update delivery status in Firestore
   */
  async updateDeliveryStatus(
    messageId: string,
    deliveryId: string,
    status: DeliveryStatus,
    updates: Partial<{
      slackMessageId: string;
      errorCode: string;
      errorMessage: string;
      completedAt: Date;
    }> = {}
  ): Promise<void> {
    const deliveryRef = doc(this.db, 'messages', messageId, 'deliveries', deliveryId);
    const firestoreUpdates: any = {
      status,
      ...updates,
    };

    // Convert Date to Firestore Timestamp
    if (updates.completedAt) {
      firestoreUpdates.completedAt = Timestamp.fromDate(updates.completedAt);
    }

    await updateDoc(deliveryRef, firestoreUpdates);
  }

  /**
   * Calculate progress from message data
   */
  private calculateProgress(message: Message): ProgressUpdate {
    const completedChannels = message.successCount + message.failureCount + message.skipCount;
    const pendingCount = message.totalChannels - completedChannels;
    const progressPercentage =
      message.totalChannels > 0 ? Math.round((completedChannels / message.totalChannels) * 100) : 0;

    return {
      messageId: message.id,
      status: message.status,
      totalChannels: message.totalChannels,
      successCount: message.successCount,
      failureCount: message.failureCount,
      skipCount: message.skipCount,
      pendingCount,
      completedChannels,
      progressPercentage,
      lastUpdated: new Date(),
    };
  }

  /**
   * Clean up listeners for a message
   */
  unsubscribeFromMessage(messageId: string): void {
    const messageUnsubscribe = this.messageListeners.get(messageId);
    if (messageUnsubscribe) {
      messageUnsubscribe();
      this.messageListeners.delete(messageId);
    }

    const deliveryUnsubscribe = this.deliveryListeners.get(messageId);
    if (deliveryUnsubscribe) {
      deliveryUnsubscribe();
      this.deliveryListeners.delete(messageId);
    }
  }

  /**
   * Clean up all listeners
   */
  unsubscribeAll(): void {
    this.messageListeners.forEach(unsubscribe => unsubscribe());
    this.deliveryListeners.forEach(unsubscribe => unsubscribe());
    this.messageListeners.clear();
    this.deliveryListeners.clear();
  }
}

/**
 * Singleton progress tracker instance
 */
export const progressTracker = new ProgressTracker();

/**
 * React hook for message progress
 */
export function useMessageProgress(messageId: string | null) {
  const [progress, setProgress] = React.useState<ProgressUpdate | null>(null);

  React.useEffect(() => {
    if (!messageId) {
      setProgress(null);
      return;
    }

    const unsubscribe = progressTracker.subscribeToMessageProgress(messageId, setProgress);

    return unsubscribe;
  }, [messageId]);

  return progress;
}

/**
 * React hook for delivery updates
 */
export function useDeliveryUpdates(messageId: string | null) {
  const [deliveries, setDeliveries] = React.useState<DeliveryUpdate[]>([]);

  React.useEffect(() => {
    if (!messageId) {
      setDeliveries([]);
      return;
    }

    const unsubscribe = progressTracker.subscribeToDeliveryUpdates(messageId, delivery => {
      setDeliveries(prev => {
        const index = prev.findIndex(d => d.deliveryId === delivery.deliveryId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = delivery;
          return updated;
        } else {
          return [...prev, delivery];
        }
      });
    });

    return unsubscribe;
  }, [messageId]);

  return deliveries;
}

/**
 * React hook for user messages
 */
export function useUserMessages(userId: string | null) {
  const [messages, setMessages] = React.useState<Message[]>([]);

  React.useEffect(() => {
    if (!userId) {
      setMessages([]);
      return;
    }

    const unsubscribe = progressTracker.subscribeToUserMessages(userId, setMessages);

    return unsubscribe;
  }, [userId]);

  return messages;
}

/**
 * Utility function to format progress for display
 */
export function formatProgress(progress: ProgressUpdate): string {
  const { successCount, failureCount, skipCount, totalChannels } = progress;

  if (progress.status === MessageStatus.COMPLETED) {
    return `Completed: ${successCount} successful, ${failureCount} failed, ${skipCount} skipped`;
  }

  if (progress.status === MessageStatus.SENDING) {
    return `Sending... ${progress.completedChannels}/${totalChannels} (${progress.progressPercentage}%)`;
  }

  return `Status: ${progress.status}`;
}

/**
 * Utility function to get status color for UI
 */
export function getStatusColor(status: MessageStatus | DeliveryStatus): string {
  switch (status) {
    case MessageStatus.COMPLETED:
    case DeliveryStatus.SUCCESS:
      return 'green';
    case MessageStatus.FAILED:
    case DeliveryStatus.FAILED:
      return 'red';
    case MessageStatus.SENDING:
    case DeliveryStatus.PENDING:
      return 'blue';
    case DeliveryStatus.SKIPPED:
      return 'gray';
    default:
      return 'gray';
  }
}

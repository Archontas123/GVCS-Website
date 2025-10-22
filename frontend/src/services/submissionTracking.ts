/**
 * Submission Tracking Service
 * Handles submission status polling with exponential backoff and push notifications
 */

import apiService from './api';

const TEAM_TOKEN_KEY = 'programming_contest_token';

const getTeamToken = (): string | null => {
  try {
    return localStorage.getItem(TEAM_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to access localStorage for auth token:', error);
    return null;
  }
};

export interface SubmissionStatus {
  submissionId: number;
  problemLetter?: string;
  problemTitle?: string;
  language?: string;
  status: string;
  result?: string;
  verdict?: string;
  submissionTime?: string;
  judgedAt?: string;
  executionTime?: number;
  memoryUsed?: number;
  testCasesPassed?: number;
  totalTestCases?: number;
  pointsEarned?: number;
  judgeOutput?: {
    testCases?: Array<{
      testCase?: string;
      passed?: boolean;
      error?: string;
      output?: string;
      expectedOutput?: string;
      executionTime?: number;
      memoryUsed?: number;
    }>;
    compilationTime?: number;
    testCasesRun?: number;
    testCasesPassed?: number;
    verdict?: string;
  };
  queueInfo?: {
    position: string | number;
    estimatedWaitTime: string;
    activeWorkers: number;
    queueLength: number;
  };
}

class SubmissionTrackingService {
  private pollingIntervals: Map<number, NodeJS.Timeout> = new Map();
  private etags: Map<number, string> = new Map();

  /**
   * Check if a status is final (no more polling needed)
   */
  isFinalStatus(status: string): boolean {
    return ['accepted', 'wrong_answer', 'time_limit_exceeded',
            'runtime_error', 'compilation_error', 'memory_limit_exceeded',
            'Accepted', 'Wrong Answer', 'Time Limit Exceeded',
            'Runtime Error', 'Compilation Error', 'Memory Limit Exceeded']
      .includes(status);
  }

  /**
   * Track a submission with intelligent polling
   */
  async trackSubmission(
    submissionId: number,
    onUpdate: (status: SubmissionStatus) => void,
    onComplete: (status: SubmissionStatus) => void
  ): Promise<() => void> {
    let delay = 1000; // Start with 1 second
    const maxDelay = 10000; // Max 10 seconds
    let consecutiveNoChanges = 0;
    let isPolling = true;

    const poll = async () => {
      if (!isPolling) return;

      try {
        const token = getTeamToken();
        const headers: Record<string, string> = {
          'If-None-Match': this.etags.get(submissionId) || '',
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`/api/submissions/${submissionId}/status`, {
          headers,
        });

        if (response.status === 304) {
          // No changes
          consecutiveNoChanges++;
          // Exponential backoff: 1s → 1.5s → 2.25s → 3.4s → 5s → 7.5s → 10s
          delay = Math.min(maxDelay, delay * 1.5);
        } else if (response.ok) {
          const data = await response.json();
          const etag = response.headers.get('ETag');

          if (etag) {
            this.etags.set(submissionId, etag);
          }

          consecutiveNoChanges = 0;
          delay = 1000; // Reset to normal

          // Call update callback
          onUpdate(data.data);

          // Check if submission is final
          if (this.isFinalStatus(data.data.status)) {
            isPolling = false;
            this.stopTracking(submissionId);
            onComplete(data.data);

            // Send browser notification if enabled
            this.sendBrowserNotification(data.data);
            return;
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        // On error, slow down polling
        delay = Math.min(maxDelay, delay * 2);
      }

      // Schedule next poll
      if (isPolling) {
        const timeout = setTimeout(poll, delay);
        this.pollingIntervals.set(submissionId, timeout);
      }
    };

    // Start polling
    poll();

    // Return stop function
    return () => {
      isPolling = false;
      this.stopTracking(submissionId);
    };
  }

  /**
   * Stop tracking a submission
   */
  stopTracking(submissionId: number): void {
    const interval = this.pollingIntervals.get(submissionId);
    if (interval) {
      clearTimeout(interval);
      this.pollingIntervals.delete(submissionId);
    }
    this.etags.delete(submissionId);
  }

  /**
   * Stop all tracking
   */
  stopAll(): void {
    this.pollingIntervals.forEach((interval) => clearTimeout(interval));
    this.pollingIntervals.clear();
    this.etags.clear();
  }

  /**
   * Get current submission status (one-time query)
   */
  async getSubmissionStatus(submissionId: number): Promise<SubmissionStatus | null> {
    try {
      const response = await apiService.getSubmissionStatus(submissionId);
      if (response.success) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting submission status:', error);
      return null;
    }
  }

  /**
   * Send browser notification
   */
  private sendBrowserNotification(submission: SubmissionStatus): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const isAccepted = submission.status === 'accepted' || submission.status === 'Accepted';

      new Notification('Submission Complete', {
        body: `${submission.verdict || submission.status} - Problem ${submission.problemLetter || submission.submissionId}`,
        icon: isAccepted ? '/icon-success.png' : '/icon-error.png',
        badge: '/badge.png',
        tag: `submission-${submission.submissionId}`, // Prevents duplicates
      });
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPushNotifications(): Promise<boolean> {
    try {
      // Check if push notifications are supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifications not supported');
        return false;
      }

      // Request notification permission
      const permission = await this.requestNotificationPermission();
      if (permission !== 'granted') {
        return false;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Get VAPID public key
      const keyResponse = await fetch('/api/submissions/notifications/vapid-public-key');
      if (!keyResponse.ok) {
        console.log('VAPID key not available');
        return false;
      }

      const { publicKey } = await keyResponse.json();

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      const token = getTeamToken();
      const response = await fetch('/api/submissions/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ subscription })
      });

      return response.ok;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export default new SubmissionTrackingService();

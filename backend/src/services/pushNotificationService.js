/**
 * Push Notification Service
 * Handles browser push notifications for submission updates
 */

const webPush = require('web-push');
const { db } = require('../utils/db');

// VAPID keys for web push (you should generate these and store in env vars)
// Generate with: npx web-push generate-vapid-keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webPush.setVapidDetails(
    'mailto:your-email@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

class PushNotificationService {
  /**
   * Save a push subscription for a team
   */
  async saveSubscription(teamId, subscription) {
    try {
      // Check if subscription already exists
      const existing = await db('push_subscriptions')
        .where('endpoint', subscription.endpoint)
        .first();

      if (existing) {
        // Update existing subscription
        await db('push_subscriptions')
          .where('endpoint', subscription.endpoint)
          .update({
            team_id: teamId,
            keys: JSON.stringify(subscription.keys),
            updated_at: new Date()
          });
      } else {
        // Insert new subscription
        await db('push_subscriptions').insert({
          team_id: teamId,
          endpoint: subscription.endpoint,
          keys: JSON.stringify(subscription.keys),
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error saving push subscription:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all push subscriptions for a team
   */
  async getSubscriptions(teamId) {
    try {
      const subscriptions = await db('push_subscriptions')
        .where('team_id', teamId)
        .select('*');

      return subscriptions.map(sub => ({
        endpoint: sub.endpoint,
        keys: JSON.parse(sub.keys)
      }));
    } catch (error) {
      console.error('Error getting push subscriptions:', error);
      return [];
    }
  }

  /**
   * Remove a push subscription
   */
  async removeSubscription(endpoint) {
    try {
      await db('push_subscriptions')
        .where('endpoint', endpoint)
        .delete();

      return { success: true };
    } catch (error) {
      console.error('Error removing push subscription:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to a team about submission result
   */
  async notifySubmissionComplete(submission) {
    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      console.log('Push notifications not configured (missing VAPID keys)');
      return;
    }

    try {
      const subscriptions = await this.getSubscriptions(submission.teamId || submission.team_id);

      if (subscriptions.length === 0) {
        return; // No subscriptions for this team
      }

      const payload = JSON.stringify({
        title: 'Submission Complete',
        body: `${submission.verdict || submission.result || submission.status} - Problem ${submission.problemLetter || submission.problemId}`,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: {
          submissionId: submission.submissionId || submission.id,
          problemId: submission.problemId || submission.problem_id,
          verdict: submission.verdict || submission.result || submission.status,
          url: `/problem/${submission.problemId || submission.problem_id}`
        }
      });

      const sendPromises = subscriptions.map(async (subscription) => {
        try {
          await webPush.sendNotification(subscription, payload);
        } catch (error) {
          // If subscription is invalid (410), remove it
          if (error.statusCode === 410) {
            console.log(`Removing invalid subscription: ${subscription.endpoint}`);
            await this.removeSubscription(subscription.endpoint);
          } else {
            console.error('Error sending push notification:', error);
          }
        }
      });

      await Promise.all(sendPromises);
      console.log(`Sent push notifications to ${subscriptions.length} device(s) for team ${submission.teamId || submission.team_id}`);
    } catch (error) {
      console.error('Error in notifySubmissionComplete:', error);
    }
  }
}

module.exports = new PushNotificationService();

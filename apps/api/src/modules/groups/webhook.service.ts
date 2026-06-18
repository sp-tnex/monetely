import { groupRepository } from './group.repository';
import crypto from 'crypto';
import logger from '../../utils/logger';

export class WebhookService {
  async triggerWebhook(groupId: string, event: string, message: string, data?: Record<string, any>) {
    try {
      const group = await groupRepository.findById(groupId);
      if (!group) {
        logger.warn(`Webhook dispatch skipped: Group ${groupId} not found`);
        return;
      }

      if (!group.webhookEnabled || !group.webhookUrl) {
        return;
      }

      const payload = {
        event,
        groupId,
        message,
        data: data || {},
        timestamp: new Date().toISOString()
      };

      const payloadString = JSON.stringify(payload);
      const secret = group.webhookSecret || 'default_secret';
      const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

      logger.info(`Sending webhook for event '${event}' to ${group.webhookUrl}`);

      fetch(group.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Monetely-Signature': signature,
          'User-Agent': 'Monetely-Webhook-Service/1.0'
        },
        body: payloadString
      })
      .then(async (res) => {
        if (!res.ok) {
          logger.error(`Webhook endpoint returned error status ${res.status} for event ${event}`);
        } else {
          logger.info(`Webhook event '${event}' successfully delivered to ${group.webhookUrl}`);
        }
      })
      .catch((err: any) => {
        logger.error(`Failed to send webhook to ${group.webhookUrl} for event ${event}:`, err.message || err);
      });
    } catch (err: any) {
      logger.error(`Error in webhook dispatch service:`, err.message || err);
    }
  }
}

export const webhookService = new WebhookService();

import { Group } from '../../modules/groups/group.model';
import { GroupMember } from '../../modules/groups/group.model';
import { settlementService } from '../../modules/settlements/settlement.service';
import { userRepository } from '../../modules/users/user.repository';
import { notificationService } from '../../modules/notifications/notification.service';
import { webhookService } from '../../modules/groups/webhook.service';
import logger from '../../utils/logger';

export class ReminderJob {
  private shouldRunToday(schedule: string, day: number): boolean {
    const today = new Date();
    
    if (schedule === 'weekly') {
      // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      return today.getDay() === day;
    }

    if (schedule === 'monthly' || schedule === 'custom') {
      const todayDate = today.getDate();
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

      // If the target day is 31 and today is the last day of the month (e.g. Feb 28), it should trigger
      if (day >= lastDayOfMonth && todayDate === lastDayOfMonth) {
        return true;
      }
      return todayDate === day;
    }

    return false;
  }

  async runReminders() {
    logger.info('Starting automated Settlement Reminder Job...');
    try {
      const groups = await Group.find({ settlementRemindersEnabled: true });

      for (const group of groups) {
        const schedule = group.reminderSchedule || 'monthly';
        const day = group.reminderDay !== undefined ? group.reminderDay : 1;

        if (this.shouldRunToday(schedule, day)) {
          logger.info(`Triggering automated reminders for Group: ${group.name} (${group._id})`);
          
          const transactions = await settlementService.calculateSettlements(
            group._id.toString(),
            group.createdBy.toString()
          );

          if (transactions.length === 0) {
            logger.info(`Group ${group.name} is fully settled. No reminders needed.`);
            continue;
          }

          await webhookService.triggerWebhook(
            group._id.toString(),
            'monthly.reminder',
            `Automated monthly reminder for group ${group.name}. Please settle your pending balances.`,
            { transactionsCount: transactions.length }
          );

          for (const tx of transactions) {
            try {
              const debtor = await userRepository.findById(tx.from);
              const creditor = await userRepository.findById(tx.to);

              if (debtor && creditor) {
                const upiInfo = creditor.upiId ? ` via UPI (${creditor.upiId})` : '';
                const message = `${debtor.username}, you owe ${group.currency} ${tx.amount.toFixed(2)} to ${creditor.username}. Pay now${upiInfo}.`;

                await notificationService.notifyUser(
                  tx.from,
                  message,
                  'SETTLEMENT_RECORDED',
                  {
                    type: 'SETTLEMENT_REMINDER',
                    groupId: group._id.toString(),
                    amount: tx.amount,
                    creditorId: tx.to,
                    creditorUpiId: creditor.upiId || null
                  }
                );
              }
            } catch (err: any) {
              logger.error(`Failed to send personalized reminder for transaction from ${tx.from} to ${tx.to} in group ${group.name}:`, err.message);
            }
          }
        }
      }
    } catch (error: any) {
      logger.error('Error in automated Settlement Reminder Job:', error.message || error);
    }
    logger.info('Automated Settlement Reminder Job finished.');
  }

  startScheduler() {
    setInterval(() => {
      this.runReminders().catch((err) => logger.error('Error in periodic reminders job runner:', err));
    }, 24 * 60 * 60 * 1000);
    setTimeout(() => {
      this.runReminders().catch((err) => logger.error('Error in startup reminders job runner:', err));
    }, 10000);
  }
}

export const reminderJob = new ReminderJob();

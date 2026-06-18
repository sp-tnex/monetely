import mongoose from 'mongoose';
import { User } from '../../modules/users/user.model';
import { Expense } from '../../modules/expenses/expense.model';
import { DeletionWarning } from '../../modules/retention/retention.model';
import { notificationService } from '../../modules/notifications/notification.service';
import { ChatRoom, Message } from '../../modules/chat/chat.model';
import logger from '../../utils/logger';

export class CleanupJob {
  private getCutoffDate(policy: string): Date | null {
    const now = new Date();
    switch (policy) {
      case 'SIX_MONTHS':
        return new Date(now.setMonth(now.getMonth() - 6));
      case 'ONE_YEAR':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      case 'TWO_YEARS':
        return new Date(now.setFullYear(now.getFullYear() - 2));
      case 'FIVE_YEARS':
        return new Date(now.setFullYear(now.getFullYear() - 5));
      default:
        return null;
    }
  }

  private getArchiveCutoffDate(policy: string): Date | null {
    // Archival is typically half the retention policy time
    const now = new Date();
    switch (policy) {
      case 'SIX_MONTHS':
        return new Date(now.setMonth(now.getMonth() - 3)); // Archive after 3 months
      case 'ONE_YEAR':
        return new Date(now.setMonth(now.getMonth() - 6)); // Archive after 6 months
      case 'TWO_YEARS':
        return new Date(now.setFullYear(now.getFullYear() - 1)); // Archive after 1 year
      case 'FIVE_YEARS':
        return new Date(now.setFullYear(now.getFullYear() - 2)); // Archive after 2 years
      default:
        return null;
    }
  }

  async runCleanup() {
    logger.info('Starting scheduled Data Retention Cleanup Job...');
    const users = await User.find({ retentionPolicy: { $ne: 'FOREVER' } });

    for (const user of users) {
      try {
        const policy = user.retentionPolicy;
        const archiveCutoff = this.getArchiveCutoffDate(policy);
        const deletionCutoff = this.getCutoffDate(policy);

        const userId = user._id;

        // 1. Process Auto-Archiving
        if (user.autoArchiveEnabled && archiveCutoff) {
          const archiveResult = await Expense.updateMany(
            {
              paidBy: userId,
              status: 'ACTIVE',
              date: { $lt: archiveCutoff },
            },
            { status: 'ARCHIVED' }
          );

          if (archiveResult.modifiedCount > 0) {
            logger.info(`Auto-archived ${archiveResult.modifiedCount} expenses for user ${user.username}`);
          }
        }

        // 2. Process Deletion Warning & Scheduling
        if (deletionCutoff) {
          // Find active or archived expenses older than retention policy
          const pendingExpensesCount = await Expense.countDocuments({
            paidBy: userId,
            status: { $in: ['ACTIVE', 'ARCHIVED'] },
            date: { $lt: deletionCutoff },
          });

          if (pendingExpensesCount > 0) {
            // Check if warning has been scheduled for this month/year target
            const targetMonth = deletionCutoff.getMonth() + 1;
            const targetYear = deletionCutoff.getFullYear();

            const existingWarning = await DeletionWarning.findOne({
              user: userId,
              targetMonth,
              targetYear,
              status: 'PENDING',
            });

            if (!existingWarning && user.notifyBeforeDeletion) {
              const scheduledDate = new Date();
              scheduledDate.setDate(scheduledDate.getDate() + 7); // 7 days grace period

              await DeletionWarning.create({
                user: userId,
                scheduledDeletionDate: scheduledDate,
                targetMonth,
                targetYear,
                expenseCount: pendingExpensesCount,
                status: 'PENDING',
              });

              // Send system notification
              await notificationService.notifyUser(
                userId.toString(),
                `${pendingExpensesCount} expenses from ${targetMonth}/${targetYear} are scheduled for permanent deletion in 7 days.`,
                'EXPENSE_ADDED', // Standard fallbacks
                { type: 'DELETION_WARNING', scheduledDate }
              );

              logger.info(`Scheduled deletion warning for user ${user.username} - ${pendingExpensesCount} items`);
            }
          }
        }

        // 3. Process Permanent Deletion for matured warnings
        const warningCandidates = await DeletionWarning.find({
          user: userId,
          scheduledDeletionDate: { $lte: new Date() },
          status: { $in: ['PENDING', 'APPROVED'] },
        });

        for (const warning of warningCandidates) {
          if (!user.allowPermanentDeletion) {
            logger.info(`Permanent deletion skipped for user ${user.username} as allowPermanentDeletion is false. Keeping in ARCHIVED.`);
            warning.status = 'CANCELLED';
            await warning.save();
            continue;
          }

          // If allowed, mark target expenses as DELETED
          const targetStart = new Date(warning.targetYear, warning.targetMonth - 1, 1);
          const targetEnd = new Date(warning.targetYear, warning.targetMonth, 0, 23, 59, 59, 999);

          const deleteResult = await Expense.updateMany(
            {
              paidBy: userId,
              status: { $in: ['ACTIVE', 'ARCHIVED'] },
              date: { $gte: targetStart, $lte: targetEnd },
            },
            { status: 'DELETED' }
          );

          warning.status = 'APPROVED'; // Mark complete/resolved
          await warning.save();

          logger.info(`Permanently deleted (soft deleted lifecycle) ${deleteResult.modifiedCount} expenses for user ${user.username} from ${warning.targetMonth}/${warning.targetYear}`);
        }
      } catch (err: any) {
        logger.error(`Error processing cleanup for user ${user.username}:`, err.message);
      }
    }

    try {
      await this.runChatCleanup();
    } catch (err: any) {
      logger.error('Error running chat cleanup job:', err.message);
    }

    logger.info('Data Retention Cleanup Job finished.');
  }

  private getChatCutoffDate(policy: string, customDays?: number): Date | null {
    const now = new Date();
    switch (policy) {
      case '30_DAYS':
        return new Date(now.setDate(now.getDate() - 30));
      case '90_DAYS':
        return new Date(now.setDate(now.getDate() - 90));
      case '1_YEAR':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      case 'CUSTOM':
        return customDays ? new Date(now.setDate(now.getDate() - customDays)) : null;
      default:
        return null;
    }
  }

  private getChatArchiveCutoffDate(policy: string, customDays?: number): Date | null {
    const now = new Date();
    switch (policy) {
      case '30_DAYS':
        return new Date(now.setDate(now.getDate() - 15));
      case '90_DAYS':
        return new Date(now.setDate(now.getDate() - 45));
      case '1_YEAR':
        return new Date(now.setMonth(now.getMonth() - 6));
      case 'CUSTOM':
        return customDays ? new Date(now.setDate(now.getDate() - Math.floor(customDays / 2))) : null;
      default:
        return null;
    }
  }

  async runChatCleanup() {
    logger.info('Starting scheduled Chat History Retention Cleanup Job...');
    const rooms = await ChatRoom.find({ 'retentionSettings.policy': { $ne: 'FOREVER' } });

    for (const room of rooms) {
      try {
        const { policy, customDays, autoArchiveEnabled, autoDeleteEnabled, notifyBeforeCleanup } = room.retentionSettings;
        const archiveCutoff = this.getChatArchiveCutoffDate(policy, customDays);
        const deletionCutoff = this.getChatCutoffDate(policy, customDays);
        const roomId = room._id;

        if (autoArchiveEnabled && archiveCutoff) {
          const archiveResult = await Message.updateMany(
            {
              roomId,
              status: 'ACTIVE',
              createdAt: { $lt: archiveCutoff }
            },
            { status: 'ARCHIVED' }
          );
          if (archiveResult.modifiedCount > 0) {
            logger.info(`Auto-archived ${archiveResult.modifiedCount} messages for room ${roomId}`);
          }
        }

        if (autoDeleteEnabled && deletionCutoff) {
          const pendingDeleteCount = await Message.countDocuments({
            roomId,
            status: { $in: ['ACTIVE', 'ARCHIVED'] },
            createdAt: { $lt: deletionCutoff }
          });

          if (pendingDeleteCount > 0) {
            if (notifyBeforeCleanup) {
              await notificationService.notifyGroup(
                room.groupId.toString(),
                `${pendingDeleteCount} messages in group chat are scheduled for automated cleanup.`,
                'EXPENSE_ADDED',
                { type: 'CHAT_CLEANUP_WARNING', roomId }
              );
            }

            const deleteResult = await Message.updateMany(
              {
                roomId,
                status: { $in: ['ACTIVE', 'ARCHIVED'] },
                createdAt: { $lt: deletionCutoff }
              },
              {
                deleted: true,
                deletedAt: new Date(),
                content: 'This message was automatically deleted by retention policy.',
                attachments: [],
                referenceId: undefined,
                status: 'DELETED'
              }
            );

            if (deleteResult.modifiedCount > 0) {
              logger.info(`Auto-deleted ${deleteResult.modifiedCount} messages for room ${roomId}`);
            }
          }
        }
      } catch (err: any) {
        logger.error(`Error processing chat cleanup for room ${room._id}:`, err.message);
      }
    }
    logger.info('Chat History Retention Cleanup Job finished.');
  }

  // Setup periodic job trigger
  startScheduler() {
    // Run cleanup once every 24 hours in background
    setInterval(() => {
      this.runCleanup().catch((err) => logger.error('Error in daily cleanup job runner:', err));
    }, 24 * 60 * 60 * 1000);

    // Run once immediately on startup
    setTimeout(() => {
      this.runCleanup().catch((err) => logger.error('Error in startup cleanup job runner:', err));
    }, 5000);
  }
}

export const cleanupJob = new CleanupJob();

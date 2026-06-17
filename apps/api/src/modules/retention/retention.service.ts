import mongoose from 'mongoose';
import { User } from '../users/user.model';
import { Expense } from '../expenses/expense.model';
import { DeletionWarning } from './retention.model';
import { AppError } from '../../core/errors/AppError';
import logger from '../../utils/logger';

export class RetentionService {
  async getSettings(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    return {
      retentionPolicy: user.retentionPolicy || 'FOREVER',
      autoArchiveEnabled: user.autoArchiveEnabled ?? true,
      notifyBeforeDeletion: user.notifyBeforeDeletion ?? true,
      exportBeforeDeletion: user.exportBeforeDeletion ?? true,
      allowPermanentDeletion: user.allowPermanentDeletion ?? false,
      monthlyBudget: user.monthlyBudget ?? 0,
    };
  }

  async updateSettings(userId: string, data: any) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    if (data.retentionPolicy !== undefined) user.retentionPolicy = data.retentionPolicy;
    if (data.autoArchiveEnabled !== undefined) user.autoArchiveEnabled = data.autoArchiveEnabled;
    if (data.notifyBeforeDeletion !== undefined) user.notifyBeforeDeletion = data.notifyBeforeDeletion;
    if (data.exportBeforeDeletion !== undefined) user.exportBeforeDeletion = data.exportBeforeDeletion;
    if (data.allowPermanentDeletion !== undefined) user.allowPermanentDeletion = data.allowPermanentDeletion;
    if (data.monthlyBudget !== undefined) user.monthlyBudget = data.monthlyBudget;

    await user.save();
    return this.getSettings(userId);
  }

  async archiveData(userId: string, olderThanDate: Date) {
    const result = await Expense.updateMany(
      {
        paidBy: new mongoose.Types.ObjectId(userId),
        date: { $lt: olderThanDate },
        status: 'ACTIVE',
      },
      { status: 'ARCHIVED' }
    );

    logger.info(`Manually archived ${result.modifiedCount} active expenses for user ${userId} older than ${olderThanDate}`);
    return { count: result.modifiedCount };
  }

  async restoreData(userId: string) {
    const result = await Expense.updateMany(
      {
        paidBy: new mongoose.Types.ObjectId(userId),
        status: 'ARCHIVED',
      },
      { status: 'ACTIVE' }
    );

    logger.info(`Restored ${result.modifiedCount} archived expenses for user ${userId}`);
    return { count: result.modifiedCount };
  }

  async deleteArchivedData(userId: string) {
    const result = await Expense.updateMany(
      {
        paidBy: new mongoose.Types.ObjectId(userId),
        status: 'ARCHIVED',
      },
      { status: 'DELETED' }
    );

    logger.info(`Soft deleted ${result.modifiedCount} archived expenses for user ${userId}`);
    return { count: result.modifiedCount };
  }

  async getWarnings(userId: string) {
    return await DeletionWarning.find({ user: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 });
  }

  async handleWarningAction(warningId: string, userId: string, action: 'APPROVE' | 'CANCEL' | 'EXTEND') {
    const warning = await DeletionWarning.findOne({ _id: warningId, user: userId });
    if (!warning) throw new AppError('Warning notification not found', 404);

    if (action === 'APPROVE') {
      warning.status = 'APPROVED';
    } else if (action === 'CANCEL') {
      warning.status = 'CANCELLED';
    } else if (action === 'EXTEND') {
      warning.status = 'EXTENDED';
      warning.extendedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      warning.scheduledDeletionDate = new Date(warning.scheduledDeletionDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    await warning.save();
    return warning;
  }

  async exportUserData(userId: string, format: 'json' | 'csv' | 'html') {
    const expenses = await Expense.find({
      $or: [
        { paidBy: new mongoose.Types.ObjectId(userId) },
        { 'splits.user': new mongoose.Types.ObjectId(userId) },
      ],
      status: { $ne: 'DELETED' },
    }).populate('paidBy', 'username email');

    if (format === 'json') {
      return {
        contentType: 'application/json',
        filename: `monetely_backup_${userId}.json`,
        content: JSON.stringify(expenses, null, 2),
      };
    }

    if (format === 'csv') {
      let csv = 'ID,Date,Description,Category,Amount,PaidBy,OwedAmount,Status\n';
      expenses.forEach((e) => {
        const userSplit = e.splits.find((s) => s.user.toString() === userId);
        const owed = userSplit ? userSplit.amountOwed : 0;
        const paidByUsername = (e.paidBy as any)?.username || 'Unknown';
        
        const desc = e.description.replace(/"/g, '""');

        csv += `"${e._id}","${e.date.toISOString()}","${desc}","${e.category}",${e.amount},"${paidByUsername}",${owed},"${e.status}"\n`;
      });

      return {
        contentType: 'text/csv',
        filename: `monetely_backup_${userId}.csv`,
        content: csv,
      };
    }

    if (format === 'html') {
      let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monetely Expense Export Summary</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; background: #f8fafc; }
          h1 { color: #0f172a; margin-bottom: 5px; }
          .meta { font-size: 14px; color: #64748b; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
          th, td { padding: 14px 20px; text-align: left; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
          th { background-color: #f1f5f9; font-weight: 600; color: #475569; }
          tr:last-child td { border-bottom: none; }
          .badge { padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .badge-active { background: #dcfce7; color: #15803d; }
          .badge-archived { background: #fef9c3; color: #a16207; }
        </style>
      </head>
      <body>
        <h1>Monetely Spending Records</h1>
        <p class="meta">Export generated on: ${new Date().toLocaleString()} for User ID: ${userId}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Total Amount</th>
              <th>Paid By</th>
              <th>Your Share</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
      `;

      expenses.forEach((e) => {
        const userSplit = e.splits.find((s) => s.user.toString() === userId);
        const owed = userSplit ? userSplit.amountOwed : 0;
        const paidByUsername = (e.paidBy as any)?.username || 'Unknown';
        const dateStr = new Date(e.date).toLocaleDateString();
        const badgeClass = e.status === 'ACTIVE' ? 'badge-active' : 'badge-archived';

        html += `
          <tr>
            <td>${dateStr}</td>
            <td><strong>${e.description}</strong></td>
            <td style="text-transform: capitalize;">${e.category}</td>
            <td>₹${e.amount.toFixed(2)}</td>
            <td>${paidByUsername}</td>
            <td>₹${owed.toFixed(2)}</td>
            <td><span class="badge ${badgeClass}">${e.status}</span></td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
      </body>
      </html>
      `;

      return {
        contentType: 'text/html',
        filename: `monetely_backup_${userId}.html`,
        content: html,
      };
    }

    throw new AppError('Unsupported format', 400);
  }
}

export const retentionService = new RetentionService();

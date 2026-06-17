import { analyticsService } from '../analytics.service';
import { Expense } from '../../expenses/expense.model';
import { Group } from '../../groups/group.model';
import { User } from '../../users/user.model';
import { MonthClosing, MonthlySnapshot } from '../analytics.model';
import mongoose from 'mongoose';

jest.mock('../../expenses/expense.model', () => ({
  Expense: {
    aggregate: jest.fn(),
    find: jest.fn(),
  }
}));

jest.mock('../analytics.model', () => ({
  MonthClosing: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
  MonthlySnapshot: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  }
}));

jest.mock('../../groups/group.model', () => ({
  Group: {
    findById: jest.fn(),
  }
}));

jest.mock('../../users/user.model', () => ({
  User: {
    findById: jest.fn(),
    find: jest.fn(),
  }
}));

describe('AnalyticsService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMonthlySummary', () => {
    it('should aggregate monthly expenses correctly and compute growth and utilization', async () => {
      const groupId = new mongoose.Types.ObjectId().toString();
      (Group.findById as jest.Mock).mockResolvedValue({ _id: groupId, monthlyBudget: 1000 });
      (User.findById as jest.Mock).mockResolvedValue({ _id: 'usr123', username: 'Rahul' });

      (Expense.aggregate as jest.Mock)
        .mockResolvedValueOnce([
          {
            totals: [{ totalSpent: 250, totalExpenses: 5 }],
            categoryBreakdown: [{ _id: 'food', amount: 250 }],
            spenderBreakdown: [{ _id: 'usr123', amount: 250 }]
          }
        ])
        .mockResolvedValueOnce([
          { total: 200 }
        ]);

      const summary = await analyticsService.getMonthlySummary(groupId, 2026, 6);

      expect(summary.totalSpent).toBe(250);
      expect(summary.totalExpenses).toBe(5);
      expect(summary.budgetUtilization).toBe(25);
      expect(summary.growthPercentage).toBe(25);
    });
  });

  describe('closeMonth', () => {
    it('should lock month accounts and generate an immutable ledger snapshot', async () => {
      const groupId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();

      (Group.findById as jest.Mock).mockResolvedValue({ _id: groupId, monthlyBudget: 1000 });
      (User.find as jest.Mock).mockResolvedValue([{ _id: userId, username: 'Rahul' }]);
      (Expense.find as jest.Mock).mockResolvedValue([]);
      (Expense.aggregate as jest.Mock).mockResolvedValue([]);
      
      const result = await analyticsService.closeMonth(groupId, 2026, 6, userId);

      expect(result.success).toBe(true);
      expect(MonthClosing.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('reopenMonth', () => {
    it('should reopen a closed month and delete its snapshot', async () => {
      const groupId = new mongoose.Types.ObjectId().toString();
      const mockSave = jest.fn();
      
      (MonthClosing.findOne as jest.Mock).mockResolvedValue({
        status: 'CLOSED',
        save: mockSave,
      });

      const result = await analyticsService.reopenMonth(groupId, 2026, 6);

      expect(result.success).toBe(true);
      expect(mockSave).toHaveBeenCalled();
      expect(MonthlySnapshot.deleteOne).toHaveBeenCalledWith({
        group: expect.any(mongoose.Types.ObjectId),
        month: 6,
        year: 2026,
      });
    });
  });
});

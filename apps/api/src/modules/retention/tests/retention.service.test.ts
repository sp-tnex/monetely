import { retentionService } from '../retention.service';
import { User } from '../../users/user.model';
import { Expense } from '../../expenses/expense.model';
import { DeletionWarning } from '../retention.model';
import mongoose from 'mongoose';

jest.mock('../../users/user.model', () => ({
  User: {
    findById: jest.fn(),
  }
}));

jest.mock('../../expenses/expense.model', () => ({
  Expense: {
    updateMany: jest.fn(),
    find: jest.fn(),
  }
}));

jest.mock('../retention.model', () => ({
  DeletionWarning: {
    find: jest.fn(),
    findOne: jest.fn(),
  }
}));

describe('RetentionService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return retention settings for a user', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const mockUser = {
        _id: userId,
        retentionPolicy: 'ONE_YEAR',
        autoArchiveEnabled: true,
        notifyBeforeDeletion: true,
        exportBeforeDeletion: true,
        allowPermanentDeletion: false,
        monthlyBudget: 500,
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await retentionService.getSettings(userId);

      expect(result.retentionPolicy).toBe('ONE_YEAR');
      expect(result.autoArchiveEnabled).toBe(true);
      expect(result.monthlyBudget).toBe(500);
    });
  });

  describe('archiveData', () => {
    it('should invoke status updates to ARCHIVED for old items', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const date = new Date();

      (Expense.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 42 });

      const result = await retentionService.archiveData(userId, date);

      expect(Expense.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          paidBy: new mongoose.Types.ObjectId(userId),
          status: 'ACTIVE',
        }),
        { status: 'ARCHIVED' }
      );
      expect(result.count).toBe(42);
    });
  });

  describe('exportUserData', () => {
    it('should return CSV representation formatting properly', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const mockExpenses = [
        {
          _id: 'exp1',
          date: new Date('2026-06-01T00:00:00.000Z'),
          description: 'Team Lunch',
          category: 'food',
          amount: 100,
          paidBy: { username: 'Rahul' },
          status: 'ACTIVE',
          splits: [{ user: userId, amountOwed: 50 }],
        }
      ];

      (Expense.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockExpenses)
      });

      const result = await retentionService.exportUserData(userId, 'csv');

      expect(result.contentType).toBe('text/csv');
      expect(result.content).toContain('Team Lunch');
      expect(result.content).toContain('100');
    });
  });
});

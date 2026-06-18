import { exportService } from '../export.service';
import { Group, GroupMember } from '../../groups/group.model';
import { User } from '../../users/user.model';
import { Expense } from '../../expenses/expense.model';
import { Settlement } from '../../settlements/settlement.model';
import mongoose from 'mongoose';
import { Response } from 'express';

// Mock models
jest.mock('../../groups/group.model', () => ({
  Group: {
    findById: jest.fn(),
  },
  GroupMember: {
    find: jest.fn(),
  },
}));

jest.mock('../../users/user.model', () => ({
  User: {
    findById: jest.fn(),
  },
}));

jest.mock('../../expenses/expense.model', () => ({
  Expense: {
    find: jest.fn(),
  },
}));

jest.mock('../../settlements/settlement.model', () => ({
  Settlement: {
    find: jest.fn(),
  },
}));

const createMockResponse = () => {
  const res = {} as any;
  res.writeBuffer = '';
  res.write = jest.fn().mockImplementation((chunk) => {
    res.writeBuffer += chunk.toString();
    return true;
  });
  res.end = jest.fn();
  res.setHeader = jest.fn();
  res.on = jest.fn();
  res.once = jest.fn();
  res.emit = jest.fn();
  return res as Response & { writeBuffer: string };
};

describe('ExportService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportGroupCSV', () => {
    it('should generate a CSV format with Group information, Members, Expenses, and Settlements', async () => {
      const gId = new mongoose.Types.ObjectId().toString();
      const res = createMockResponse();

      (Group.findById as jest.Mock).mockResolvedValue({
        name: 'Trip to Paris',
        description: 'French vacation sharing',
        currency: 'EUR',
        monthlyBudget: 1500,
      });

      (GroupMember.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          { user: { username: 'satya', email: 'satya@example.com' }, role: 'OWNER' },
          { user: { username: 'john', email: 'john@example.com' }, role: 'MEMBER' },
        ]),
      });

      const mockExpenseCursor = {
        next: jest.fn()
          .mockResolvedValueOnce({
            date: new Date('2026-06-17T00:00:00.000Z'),
            description: 'Eiffel Tower Ticket',
            category: 'sightseeing',
            amount: 50,
            paidBy: { username: 'satya' },
            status: 'ACTIVE',
          })
          .mockResolvedValueOnce(null),
      };

      const mockSettlementCursor = {
        next: jest.fn()
          .mockResolvedValueOnce({
            date: new Date('2026-06-18T00:00:00.000Z'),
            payer: { username: 'john' },
            recipient: { username: 'satya' },
            amount: 25,
            notes: 'Settled ticket',
          })
          .mockResolvedValueOnce(null),
      };

      (Expense.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          cursor: jest.fn().mockReturnValue(mockExpenseCursor),
        }),
      });

      (Settlement.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            cursor: jest.fn().mockReturnValue(mockSettlementCursor),
          }),
        }),
      });

      await exportService.exportGroupCSV(res, gId);

      expect(res.write).toHaveBeenCalled();
      expect(res.writeBuffer).toContain('Trip to Paris');
      expect(res.writeBuffer).toContain('French vacation sharing');
      expect(res.writeBuffer).toContain('EUR');
      expect(res.writeBuffer).toContain('satya');
      expect(res.writeBuffer).toContain('john');
      expect(res.writeBuffer).toContain('Eiffel Tower Ticket');
      expect(res.writeBuffer).toContain('Settled ticket');
    });
  });

  describe('exportUserCSV', () => {
    it('should generate a user CSV containing profile details, groups involved, expenses, and settlements', async () => {
      const uId = new mongoose.Types.ObjectId().toString();
      const res = createMockResponse();

      (User.findById as jest.Mock).mockResolvedValue({
        username: 'satya',
        email: 'satya@example.com',
        defaultCurrency: 'INR',
        timezone: 'Asia/Kolkata',
      });

      (GroupMember.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          { group: { _id: 'g1', name: 'Paris Trip', description: 'vacation', currency: 'EUR' }, role: 'OWNER' },
        ]),
      });

      const mockExpenseCursor = {
        next: jest.fn()
          .mockResolvedValueOnce({
            date: new Date('2026-06-17T00:00:00.000Z'),
            description: 'Lunch',
            category: 'food',
            amount: 60,
            group: { name: 'Paris Trip' },
            paidBy: { username: 'satya' },
            status: 'ACTIVE',
            splits: [{ user: uId, amountOwed: 30 }],
          })
          .mockResolvedValueOnce(null),
      };

      const mockSettlementCursor = {
        next: jest.fn()
          .mockResolvedValueOnce({
            date: new Date('2026-06-18T00:00:00.000Z'),
            group: { name: 'Paris Trip' },
            payer: { username: 'john' },
            recipient: { username: 'satya' },
            amount: 30,
            notes: 'Lunch settlement',
          })
          .mockResolvedValueOnce(null),
      };

      (Expense.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            cursor: jest.fn().mockReturnValue(mockExpenseCursor),
          }),
        }),
      });

      (Settlement.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              cursor: jest.fn().mockReturnValue(mockSettlementCursor),
            }),
          }),
        }),
      });

      await exportService.exportUserCSV(res, uId);

      expect(res.write).toHaveBeenCalled();
      expect(res.writeBuffer).toContain('satya');
      expect(res.writeBuffer).toContain('satya@example.com');
      expect(res.writeBuffer).toContain('Paris Trip');
      expect(res.writeBuffer).toContain('Lunch');
      expect(res.writeBuffer).toContain('Lunch settlement');
    });
  });
});

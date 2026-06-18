import { settlementService } from '../settlement.service';
import { expenseRepository } from '../../expenses/expense.repository';
import { settlementRepository } from '../settlement.repository';
import { groupMemberRepository, groupRepository } from '../../groups/group.repository';
import { userRepository } from '../../users/user.repository';
import mongoose from 'mongoose';

jest.mock('../../expenses/expense.repository', () => ({
  expenseRepository: {
    find: jest.fn(),
  }
}));

jest.mock('../settlement.repository', () => ({
  settlementRepository: {
    find: jest.fn(),
    create: jest.fn(),
  }
}));

jest.mock('../../groups/group.repository', () => ({
  groupMemberRepository: {
    findOne: jest.fn(),
    find: jest.fn(),
  },
  groupRepository: {
    findById: jest.fn(),
  }
}));

jest.mock('../../users/user.repository', () => ({
  userRepository: {
    findById: jest.fn(),
  }
}));

describe('SettlementService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateSettlements', () => {
    it('should simplify debts correctly for group members', async () => {
      const gId = new mongoose.Types.ObjectId().toString();
      const u1 = new mongoose.Types.ObjectId().toString();
      const u2 = new mongoose.Types.ObjectId().toString();
      const u3 = new mongoose.Types.ObjectId().toString();

      (groupMemberRepository.findOne as jest.Mock).mockResolvedValue({ group: gId, user: u1 });
      (groupRepository.findById as jest.Mock).mockResolvedValue({
        _id: gId,
        allowUpiSharing: true,
        showUpiToMembers: true
      });
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      (expenseRepository.find as jest.Mock).mockResolvedValue([
        {
          paidBy: u1,
          amount: 90,
          splits: [
            { user: u1, amountOwed: 30 },
            { user: u2, amountOwed: 30 },
            { user: u3, amountOwed: 30 }
          ]
        }
      ]);

      const mockQuery = {
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([])
        })
      };

      // Mock Settlement.find which is called in calculateSettlements
      const { Settlement } = require('../settlement.model');
      jest.spyOn(Settlement, 'find').mockReturnValue([] as any);

      const result = await settlementService.calculateSettlements(gId, u1);

      expect(result).toEqual([
        { from: u2, to: u1, amount: 30, recipientUpi: undefined },
        { from: u3, to: u1, amount: 30, recipientUpi: undefined }
      ]);
    });
  });

  describe('getVisibleUpi', () => {
    it('should return undefined if UPI sharing is disabled', async () => {
      const group = { allowUpiSharing: false, showUpiToMembers: true };
      const result = await settlementService.getVisibleUpi('user1', 'user2', group);
      expect(result).toBeUndefined();
    });

    it('should return undefined if show UPI is disabled', async () => {
      const group = { allowUpiSharing: true, showUpiToMembers: false };
      const result = await settlementService.getVisibleUpi('user1', 'user2', group);
      expect(result).toBeUndefined();
    });

    it('should return undefined if target user has Hidden visibility', async () => {
      const group = { allowUpiSharing: true, showUpiToMembers: true };
      (userRepository.findById as jest.Mock).mockResolvedValue({
        upiId: 'test@ybl',
        upiVisibility: 'Hidden',
        username: 'testuser'
      });
      const result = await settlementService.getVisibleUpi('user1', 'user2', group);
      expect(result).toBeUndefined();
    });

    it('should return UPI details if visible to everyone', async () => {
      const group = { allowUpiSharing: true, showUpiToMembers: true };
      (userRepository.findById as jest.Mock).mockResolvedValue({
        upiId: 'test@ybl',
        upiVisibility: 'Visible To Everyone',
        upiName: 'Test Name',
        upiInstructions: 'Send proof',
        username: 'testuser'
      });
      const result = await settlementService.getVisibleUpi('user1', 'user2', group);
      expect(result).toEqual({
        upiId: 'test@ybl',
        upiName: 'Test Name',
        upiInstructions: 'Send proof',
        upiQrUrl: ''
      });
    });
  });
});

import { settlementService } from '../settlement.service';
import { expenseRepository } from '../../expenses/expense.repository';
import { settlementRepository } from '../settlement.repository';
import { groupMemberRepository } from '../../groups/group.repository';
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

      (settlementRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await settlementService.calculateSettlements(gId, u1);

      expect(result).toEqual([
        { from: u2, to: u1, amount: 30 },
        { from: u3, to: u1, amount: 30 }
      ]);
    });
  });
});

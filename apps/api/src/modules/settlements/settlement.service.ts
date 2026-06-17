import { expenseRepository } from '../expenses/expense.repository';
import { groupMemberRepository, groupRepository } from '../groups/group.repository';
import { settlementRepository } from './settlement.repository';
import { userRepository } from '../users/user.repository';
import { AppError } from '../../core/errors/AppError';
import { notificationService } from '../notifications/notification.service';
import { activityService } from '../groups/activity.service';
import mongoose from 'mongoose';

export class SettlementService {
  async calculateSettlements(groupId: string, userId: string) {
    const isMember = await groupMemberRepository.findOne({ group: groupId, user: userId });
    if (!isMember) {
      throw new AppError('You are not a member of this group', 403);
    }

    const expenses = await expenseRepository.find({ group: groupId }, 0, Number.MAX_SAFE_INTEGER);
    const settlements = await settlementRepository.find({ group: groupId }, 0, Number.MAX_SAFE_INTEGER);

    const balances: Record<string, number> = {};

    expenses.forEach(expense => {
      const paidByStr = expense.paidBy.toString();
      balances[paidByStr] = (balances[paidByStr] || 0) + expense.amount;

      expense.splits.forEach(split => {
        const splitUserStr = split.user.toString();
        balances[splitUserStr] = (balances[splitUserStr] || 0) - split.amountOwed;
      });
    });

    settlements.forEach(settlement => {
      const payerStr = settlement.payer.toString();
      const recipientStr = settlement.recipient.toString();
      balances[payerStr] = (balances[payerStr] || 0) + settlement.amount;
      balances[recipientStr] = (balances[recipientStr] || 0) - settlement.amount;
    });

    const debtors: { userId: string; amount: number }[] = [];
    const creditors: { userId: string; amount: number }[] = [];

    for (const [uid, bal] of Object.entries(balances)) {
      if (bal < -0.01) debtors.push({ userId: uid, amount: Math.abs(bal) });
      else if (bal > 0.01) creditors.push({ userId: uid, amount: bal });
    }

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions: { from: string; to: string; amount: number }[] = [];

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const amountToSettle = Math.min(debtor.amount, creditor.amount);

      transactions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: Number(amountToSettle.toFixed(2))
      });

      debtor.amount -= amountToSettle;
      creditor.amount -= amountToSettle;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return transactions;
  }

  async recordSettlement(
    groupId: string,
    actorId: string,
    data: { payerId: string; recipientId: string; amount: number; notes?: string }
  ) {
    const isActorMember = await groupMemberRepository.findOne({ group: groupId, user: actorId });
    if (!isActorMember) {
      throw new AppError('You are not a member of this group', 403);
    }

    const isPayerMember = await groupMemberRepository.findOne({ group: groupId, user: data.payerId });
    if (!isPayerMember) {
      throw new AppError('Payer is not a member of this group', 400);
    }

    const isRecipientMember = await groupMemberRepository.findOne({ group: groupId, user: data.recipientId });
    if (!isRecipientMember) {
      throw new AppError('Recipient is not a member of this group', 400);
    }

    const settlement = await settlementRepository.create({
      group: new mongoose.Types.ObjectId(groupId) as any,
      payer: new mongoose.Types.ObjectId(data.payerId) as any,
      recipient: new mongoose.Types.ObjectId(data.recipientId) as any,
      amount: data.amount,
      notes: data.notes
    });

    const payerUser = await userRepository.findById(data.payerId);
    const recipientUser = await userRepository.findById(data.recipientId);
    const payerName = payerUser ? payerUser.username : 'Someone';
    const recipientName = recipientUser ? recipientUser.username : 'Someone';

    await notificationService.notifyGroup(
      groupId,
      `A payment of $${data.amount} was recorded from ${payerName} to ${recipientName}.`,
      'SETTLEMENT_RECORDED',
      { groupId, settlementId: settlement.id },
      actorId
    );

    const group = await groupRepository.findById(groupId);
    await activityService.logActivity(
      groupId,
      actorId,
      'SETTLEMENT_RECORDED',
      `${payerName} paid ${recipientName} ${settlement.amount} ${group?.currency || 'USD'}`,
      { settlementId: settlement.id, amount: settlement.amount, payerId: data.payerId, recipientId: data.recipientId }
    );

    return settlement;
  }

  async getSettlementsList(groupId: string, userId: string) {
    const isMember = await groupMemberRepository.findOne({ group: groupId, user: userId });
    if (!isMember) {
      throw new AppError('You are not a member of this group', 403);
    }

    const { Settlement } = require('./settlement.model');
    return Settlement.find({ group: groupId })
      .sort('-date')
      .populate('payer', 'username email avatarUrl')
      .populate('recipient', 'username email avatarUrl');
  }
}

export const settlementService = new SettlementService();

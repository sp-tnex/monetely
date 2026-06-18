import { expenseRepository } from '../expenses/expense.repository';
import { groupMemberRepository, groupRepository } from '../groups/group.repository';
import { settlementRepository } from './settlement.repository';
import { userRepository } from '../users/user.repository';
import { AppError } from '../../core/errors/AppError';
import { notificationService } from '../notifications/notification.service';
import { activityService } from '../groups/activity.service';
import { webhookService } from '../groups/webhook.service';
import mongoose from 'mongoose';
import { Settlement } from './settlement.model';
import logger from '../../utils/logger';

export class SettlementService {
  async getVisibleUpi(creditorId: string, debtorId: string, group: any) {
    if (!group.allowUpiSharing || !group.showUpiToMembers) {
      return undefined;
    }

    const creditor = await userRepository.findById(creditorId);
    if (!creditor || !creditor.upiId) {
      return undefined;
    }

    const visibility = creditor.upiVisibility || 'Visible To Everyone';
    if (visibility === 'Hidden') {
      return undefined;
    }

    return {
      upiId: creditor.upiId,
      upiName: creditor.upiName || creditor.username,
      upiInstructions: creditor.upiInstructions || '',
      upiQrUrl: creditor.upiQrUrl || ''
    };
  }

  async calculateSettlements(groupId: string, userId: string) {
    const isMember = await groupMemberRepository.findOne({ group: groupId, user: userId });
    if (!isMember) {
      throw new AppError('You are not a member of this group', 403);
    }

    const group = await groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const expenses = await expenseRepository.find({ group: groupId }, 0, Number.MAX_SAFE_INTEGER);
    const settlements = await Settlement.find({ group: groupId, status: 'Confirmed' });

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

    const transactions: any[] = [];

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

    const enrichedTransactions = await Promise.all(
      transactions.map(async (tx) => {
        const upi = await this.getVisibleUpi(tx.to, tx.from, group);
        return {
          ...tx,
          recipientUpi: upi
        };
      })
    );

    return enrichedTransactions;
  }

  async recordSettlement(
    groupId: string,
    actorId: string,
    data: { payerId: string; recipientId: string; amount: number; notes?: string; status?: string; utrNumber?: string }
  ) {
    const isActorMember = await groupMemberRepository.findOne({ group: groupId, user: actorId });
    if (!isActorMember) {
      throw new AppError('You are not a member of this group', 403);
    }

    const group = await groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    if (!group.allowDirectSettlement) {
      throw new AppError('Direct settlements are disabled for this group', 400);
    }

    const isPayerMember = await groupMemberRepository.findOne({ group: groupId, user: data.payerId });
    if (!isPayerMember) {
      throw new AppError('Payer is not a member of this group', 400);
    }

    const isRecipientMember = await groupMemberRepository.findOne({ group: groupId, user: data.recipientId });
    if (!isRecipientMember) {
      throw new AppError('Recipient is not a member of this group', 400);
    }

    const determinedStatus = actorId === data.recipientId ? 'Confirmed' : 'Paid';

    const settlement = await Settlement.create({
      group: new mongoose.Types.ObjectId(groupId),
      payer: new mongoose.Types.ObjectId(data.payerId),
      recipient: new mongoose.Types.ObjectId(data.recipientId),
      amount: data.amount,
      notes: data.notes || 'Direct peer-to-peer settlement',
      status: determinedStatus,
      utrNumber: data.utrNumber,
      paidAt: determinedStatus === 'Paid' || determinedStatus === 'Confirmed' ? new Date() : undefined,
      confirmedAt: determinedStatus === 'Confirmed' ? new Date() : undefined
    });

    const payerUser = await userRepository.findById(data.payerId);
    const recipientUser = await userRepository.findById(data.recipientId);
    const payerName = payerUser ? payerUser.username : 'Someone';
    const recipientName = recipientUser ? recipientUser.username : 'Someone';

    await activityService.logActivity(
      groupId,
      actorId,
      'SETTLEMENT_RECORDED',
      `${payerName} paid ${recipientName} ${settlement.amount} ${group.currency}`,
      { settlementId: settlement.id, amount: settlement.amount, payerId: data.payerId, recipientId: data.recipientId }
    );

    if (determinedStatus === 'Confirmed') {
      await notificationService.notifyUser(
        data.payerId,
        `${recipientName} confirmed receiving ${group.currency} ${data.amount} from you.`,
        'SETTLEMENT_RECORDED',
        { groupId, settlementId: settlement.id }
      );
      
      await webhookService.triggerWebhook(
        groupId,
        'settlement.completed',
        `Settlement of ${group.currency} ${data.amount} from ${payerName} to ${recipientName} is completed.`,
        { settlementId: settlement.id, amount: data.amount, debtor: payerName, creditor: recipientName }
      );
    } else {
      await notificationService.notifyUser(
        data.recipientId,
        `${payerName} marked a payment of ${group.currency} ${data.amount} as paid. Please confirm receipt.`,
        'SETTLEMENT_RECORDED',
        { groupId, settlementId: settlement.id }
      );
    }

    return settlement;
  }

  async requestSettlement(groupId: string, creditorId: string, data: { debtorId: string; amount: number; notes?: string }) {
    const isCreditorMember = await groupMemberRepository.findOne({ group: groupId, user: creditorId });
    if (!isCreditorMember) {
      throw new AppError('You are not a member of this group', 403);
    }

    const isDebtorMember = await groupMemberRepository.findOne({ group: groupId, user: data.debtorId });
    if (!isDebtorMember) {
      throw new AppError('Debtor is not a member of this group', 400);
    }

    const group = await groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const settlement = await Settlement.create({
      group: new mongoose.Types.ObjectId(groupId),
      payer: new mongoose.Types.ObjectId(data.debtorId),
      recipient: new mongoose.Types.ObjectId(creditorId),
      amount: data.amount,
      notes: data.notes || 'Settlement requested by creditor',
      status: 'Requested'
    });

    const debtorUser = await userRepository.findById(data.debtorId);
    const creditorUser = await userRepository.findById(creditorId);
    const debtorName = debtorUser ? debtorUser.username : 'Someone';
    const creditorName = creditorUser ? creditorUser.username : 'Someone';

    // Notify debtor in-app
    await notificationService.notifyUser(
      data.debtorId,
      `${creditorName} requests a payment of ${group.currency} ${data.amount} from you.`,
      'SETTLEMENT_RECORDED',
      { groupId, settlementId: settlement.id }
    );

    await activityService.logActivity(
      groupId,
      creditorId,
      'SETTLEMENT_RECORDED',
      `${creditorName} requested ${group.currency} ${data.amount} from ${debtorName}`,
      { settlementId: settlement.id, amount: data.amount, payerId: data.debtorId, recipientId: creditorId }
    );

    await webhookService.triggerWebhook(
      groupId,
      'settlement.requested',
      `${creditorName} requested ${group.currency} ${data.amount} from ${debtorName}`,
      { settlementId: settlement.id, amount: data.amount, debtor: debtorName, creditor: creditorName }
    );

    return settlement;
  }

  async markAsPaid(groupId: string, debtorId: string, settlementId: string, data: { utrNumber?: string; paymentProof?: string }) {
    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      throw new AppError('Settlement not found', 404);
    }

    if (settlement.payer.toString() !== debtorId) {
      throw new AppError('Only the debtor can mark this payment as paid', 403);
    }

    const group = await groupRepository.findById(groupId);
    const currency = group ? group.currency : 'USD';

    settlement.status = 'Paid';
    settlement.utrNumber = data.utrNumber;
    settlement.paymentProof = data.paymentProof;
    settlement.paidAt = new Date();
    await settlement.save();

    const debtorUser = await userRepository.findById(debtorId);
    const creditorUser = await userRepository.findById(settlement.recipient.toString());
    const debtorName = debtorUser ? debtorUser.username : 'Someone';
    const creditorName = creditorUser ? creditorUser.username : 'Someone';

    await notificationService.notifyUser(
      settlement.recipient.toString(),
      `${debtorName} marked settlement of ${currency} ${settlement.amount} as paid. UTR: ${data.utrNumber || 'None'}. Please confirm.`,
      'SETTLEMENT_RECORDED',
      { groupId, settlementId: settlement.id }
    );

    return settlement;
  }

  async confirmSettlement(groupId: string, creditorId: string, settlementId: string) {
    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      throw new AppError('Settlement not found', 404);
    }

    if (settlement.recipient.toString() !== creditorId) {
      throw new AppError('Only the creditor can confirm this settlement', 403);
    }

    const group = await groupRepository.findById(groupId);
    const currency = group ? group.currency : 'USD';

    settlement.status = 'Confirmed';
    settlement.confirmedAt = new Date();
    await settlement.save();

    const debtorUser = await userRepository.findById(settlement.payer.toString());
    const creditorUser = await userRepository.findById(creditorId);
    const debtorName = debtorUser ? debtorUser.username : 'Someone';
    const creditorName = creditorUser ? creditorUser.username : 'Someone';

    await notificationService.notifyUser(
      settlement.payer.toString(),
      `${creditorName} confirmed receiving ${currency} ${settlement.amount} from you.`,
      'SETTLEMENT_RECORDED',
      { groupId, settlementId: settlement.id }
    );

    await webhookService.triggerWebhook(
      groupId,
      'settlement.completed',
      `Settlement of ${currency} ${settlement.amount} from ${debtorName} to ${creditorName} is completed.`,
      { settlementId: settlement.id, amount: settlement.amount, debtor: debtorName, creditor: creditorName }
    );

    return settlement;
  }

  async disputeSettlement(groupId: string, actorId: string, settlementId: string, data: { notes: string }) {
    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      throw new AppError('Settlement not found', 404);
    }

    if (settlement.payer.toString() !== actorId && settlement.recipient.toString() !== actorId) {
      throw new AppError('Only parties involved in this settlement can raise a dispute', 403);
    }

    const group = await groupRepository.findById(groupId);
    const currency = group ? group.currency : 'USD';

    settlement.status = 'Disputed';
    settlement.notes = `Disputed: ${data.notes || 'No reason provided'}`;
    await settlement.save();

    const actorUser = await userRepository.findById(actorId);
    const targetUserId = settlement.payer.toString() === actorId ? settlement.recipient.toString() : settlement.payer.toString();
    const actorName = actorUser ? actorUser.username : 'Someone';

    await notificationService.notifyUser(
      targetUserId,
      `${actorName} disputed the settlement of ${currency} ${settlement.amount}. Reason: ${data.notes || 'None'}`,
      'SETTLEMENT_RECORDED',
      { groupId, settlementId: settlement.id }
    );

    return settlement;
  }

  async resolveDispute(groupId: string, creditorId: string, settlementId: string, data: { resolution: 'Confirmed' | 'Pending' }) {
    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      throw new AppError('Settlement not found', 404);
    }

    if (settlement.recipient.toString() !== creditorId) {
      throw new AppError('Only the creditor can resolve this dispute', 403);
    }

    const group = await groupRepository.findById(groupId);
    const currency = group ? group.currency : 'USD';

    settlement.status = data.resolution;
    settlement.notes = `Dispute Resolved: Mark as ${data.resolution}`;
    if (data.resolution === 'Confirmed') {
      settlement.confirmedAt = new Date();
    }
    await settlement.save();

    const debtorUserId = settlement.payer.toString();
    const creditorUser = await userRepository.findById(creditorId);
    const creditorName = creditorUser ? creditorUser.username : 'Someone';

    await notificationService.notifyUser(
      debtorUserId,
      `${creditorName} resolved the dispute for settlement of ${currency} ${settlement.amount} as ${data.resolution}.`,
      'SETTLEMENT_RECORDED',
      { groupId, settlementId: settlement.id }
    );

    if (data.resolution === 'Confirmed') {
      const debtorUser = await userRepository.findById(debtorUserId);
      const debtorName = debtorUser ? debtorUser.username : 'Someone';
      
      await webhookService.triggerWebhook(
        groupId,
        'settlement.completed',
        `Settlement of ${currency} ${settlement.amount} from ${debtorName} to ${creditorName} is completed.`,
        { settlementId: settlement.id, amount: settlement.amount, debtor: debtorName, creditor: creditorName }
      );
    }

    return settlement;
  }

  async initiateCollectionCycle(groupId: string, actorId: string, data: { message?: string }) {
    const groupMember = await groupMemberRepository.findOne({ group: groupId, user: actorId });
    if (!groupMember || (groupMember.role !== 'OWNER' && groupMember.role !== 'ADMIN')) {
      throw new AppError('Only Owners or Admins can initiate the collection cycle', 403);
    }

    const group = await groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const transactions = await this.calculateSettlements(groupId, actorId);
    if (transactions.length === 0) {
      throw new AppError('No outstanding settlements to collect in this group', 400);
    }

    const broadcastMsg = data.message || `Collection cycle started for group ${group.name}. Please settle your dues.`;

    await webhookService.triggerWebhook(
      groupId,
      'monthly.reminder',
      broadcastMsg,
      { transactionsCount: transactions.length }
    );

    for (const tx of transactions) {
      try {
        const debtor = await userRepository.findById(tx.from);
        const creditor = await userRepository.findById(tx.to);

        if (debtor && creditor) {
          const upiSuffix = creditor.upiId ? ` to UPI ID: ${creditor.upiId}` : '';
          const personalizedMsg = `${debtor.username}, you owe ${group.currency} ${tx.amount.toFixed(2)} to ${creditor.username}. Pay now${upiSuffix}.`;

          await notificationService.notifyUser(
            tx.from,
            personalizedMsg,
            'SETTLEMENT_RECORDED',
            {
              type: 'COLLECTION_REMINDER',
              groupId,
              amount: tx.amount,
              creditorId: tx.to,
              creditorUpiId: creditor.upiId || null
            }
          );
        }
      } catch (err: any) {
        logger.error(`Collection cycle: Failed to remind debtor ${tx.from}:`, err.message);
      }
    }

    return { success: true, remindedCount: transactions.length };
  }

  async broadcastOwnerReminders(groupId: string, actorId: string, data: { message: string }) {
    const groupMember = await groupMemberRepository.findOne({ group: groupId, user: actorId });
    if (!groupMember || (groupMember.role !== 'OWNER' && groupMember.role !== 'ADMIN')) {
      throw new AppError('Only Owners or Admins can broadcast group reminders', 403);
    }

    const group = await groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    await notificationService.notifyGroup(
      groupId,
      `Announcement from ${groupMember.role === 'OWNER' ? 'Owner' : 'Admin'}: "${data.message}"`,
      'EXPENSE_ADDED', // Generic type
      { groupId, broadcast: true },
      actorId
    );

    await webhookService.triggerWebhook(
      groupId,
      'monthly.reminder',
      data.message,
      { broadcast: true, senderId: actorId }
    );

    return { success: true };
  }

  async getSettlementsList(groupId: string, userId: string) {
    const isMember = await groupMemberRepository.findOne({ group: groupId, user: userId });
    if (!isMember) {
      throw new AppError('You are not a member of this group', 403);
    }

    return Settlement.find({ group: groupId })
      .sort('-date')
      .populate('payer', 'username email avatarUrl upiId upiName upiVisibility upiInstructions upiQrUrl')
      .populate('recipient', 'username email avatarUrl upiId upiName upiVisibility upiInstructions upiQrUrl');
  }
}

export const settlementService = new SettlementService();

import { expenseRepository } from './expense.repository';
import { groupMemberRepository, groupRepository } from '../groups/group.repository';
import { AppError } from '../../core/errors/AppError';
import { notificationService } from '../notifications/notification.service';
import { ApiFeatures } from '../../utils/ApiFeatures';
import { MonthClosing } from '../analytics/analytics.model';
import { activityService } from '../groups/activity.service';
import { getIO } from '../../core/socket/socket';
import logger from '../../utils/logger';

export class ExpenseService {
  private async checkIsMonthClosed(groupId: string, dateInput?: any) {
    const date = dateInput ? new Date(dateInput) : new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const closing = await MonthClosing.findOne({ group: groupId, month, year });
    if (closing && (closing.status === 'CLOSED' || closing.status === 'LOCKED')) {
      throw new AppError('This month has been closed and accounts are locked. Modifications are not allowed.', 403);
    }
  }

  async addExpense(groupId: string, userId: string, data: any) {
    const isMember = await groupMemberRepository.findOne({ group: groupId, user: userId });
    if (!isMember) {
      throw new AppError('You are not a member of this group', 403);
    }

    const isPaidByMember = await groupMemberRepository.findOne({ group: groupId, user: data.paidBy });
    if (!isPaidByMember) {
      throw new AppError('The user who paid is not a member of this group', 400);
    }

    // Verify month is not closed
    await this.checkIsMonthClosed(groupId, data.date);

    const expense = await expenseRepository.create({
      ...data,
      group: groupId,
      splits: data.splits.map((s: any) => ({
        user: s.userId,
        amountOwed: s.amountOwed,
        percentage: s.percentage
      }))
    });

    await notificationService.notifyGroup(
      groupId,
      `A new expense "${expense.description}" was added.`,
      'EXPENSE_ADDED',
      { groupId, expenseId: expense.id },
      userId
    );

    const group = await groupRepository.findById(groupId);
    await activityService.logActivity(
      groupId,
      userId,
      'EXPENSE_ADDED',
      `Added expense "${expense.description}" of ${expense.amount} ${group?.currency || 'USD'}`,
      { expenseId: expense.id, amount: expense.amount, description: expense.description }
    );

    try {
      getIO().to(`group:${groupId}`).emit('group:dataUpdated', { groupId });
    } catch (err: any) {
      logger.warn(`Failed to emit group data update via Socket.IO: ${err.message}`);
    }

    return expense;
  }

  async getGroupExpenses(groupId: string, userId: string, queryParams: any) {
    const isMember = await groupMemberRepository.findOne({ group: groupId, user: userId });
    if (!isMember) {
      throw new AppError('You are not a member of this group', 403);
    }

    const { Expense } = require('./expense.model');
    
    const queryObj: any = { group: groupId, status: { $ne: 'DELETED' } };
    
    if (queryParams.search) {
      queryObj.description = { $regex: queryParams.search, $options: 'i' };
    }
    
    if (queryParams.category && queryParams.category !== 'all') {
      queryObj.category = queryParams.category;
    }

    const apiQueryParams = { ...queryParams };
    delete apiQueryParams.search;
    delete apiQueryParams.category;

    const baseQuery = Expense.find(queryObj);
    const features = new ApiFeatures(baseQuery, apiQueryParams)
      .sort()
      .limitFields()
      .paginate();

    const expenses = await features.query.populate('paidBy', 'username email avatarUrl');
    const total = await Expense.countDocuments(queryObj);

    const page = parseInt(queryParams.page as string, 10) || 1;
    const limit = parseInt(queryParams.limit as string, 10) || 10;
    const skip = (page - 1) * limit;
    const hasMore = skip + expenses.length < total;

    return { expenses, total, hasMore, page, limit };
  }

  async getExpenseById(expenseId: string, userId: string) {
    const expense = await expenseRepository.findById(expenseId);
    if (!expense || expense.status === 'DELETED') throw new AppError('Expense not found', 404);

    const isMember = await groupMemberRepository.findOne({ group: expense.group, user: userId });
    if (!isMember) {
      throw new AppError('You are not a member of this group', 403);
    }

    return expense;
  }

  async updateExpense(groupId: string, expenseId: string, userId: string, data: any) {
    const isMember = await groupMemberRepository.findOne({ group: groupId, user: userId });
    if (!isMember) {
      throw new AppError('You are not a member of this group', 403);
    }

    const expense = await expenseRepository.findById(expenseId);
    if (!expense || expense.status === 'DELETED') throw new AppError('Expense not found', 404);

    await this.checkIsMonthClosed(groupId, expense.date);

    if (data.date) {
      await this.checkIsMonthClosed(groupId, data.date);
    }

    if (data.paidBy) {
      const isPaidByMember = await groupMemberRepository.findOne({ group: groupId, user: data.paidBy });
      if (!isPaidByMember) {
        throw new AppError('The user who paid is not a member of this group', 400);
      }
    }

    const updatedSplits = data.splits ? data.splits.map((s: any) => ({
      user: s.userId || s.user,
      amountOwed: s.amountOwed,
      percentage: s.percentage
    })) : undefined;

    const updatedData = {
      ...data,
      ...(updatedSplits && { splits: updatedSplits })
    };

    const updatedExpense = await expenseRepository.updateById(expenseId, updatedData);
    if (!updatedExpense) throw new AppError('Expense could not be updated', 400);

    await notificationService.notifyGroup(
      groupId,
      `Expense "${updatedExpense.description}" was updated.`,
      'EXPENSE_ADDED',
      { groupId, expenseId: updatedExpense.id },
      userId
    );

    const group = await groupRepository.findById(groupId);
    await activityService.logActivity(
      groupId,
      userId,
      'EXPENSE_UPDATED',
      `Updated expense "${updatedExpense.description}" to ${updatedExpense.amount} ${group?.currency || 'USD'}`,
      { expenseId: updatedExpense.id, amount: updatedExpense.amount, description: updatedExpense.description }
    );

    try {
      getIO().to(`group:${groupId}`).emit('group:dataUpdated', { groupId });
    } catch (err: any) {
      logger.warn(`Failed to emit group data update via Socket.IO: ${err.message}`);
    }

    return updatedExpense;
  }

  async deleteExpense(groupId: string, expenseId: string, userId: string) {
    const isMember = await groupMemberRepository.findOne({ group: groupId, user: userId });
    if (!isMember) {
      throw new AppError('You are not a member of this group', 403);
    }

    const expense = await expenseRepository.findById(expenseId);
    if (!expense || expense.status === 'DELETED') throw new AppError('Expense not found', 404);

    await this.checkIsMonthClosed(groupId, expense.date);

    expense.status = 'DELETED';
    await expense.save();

    await notificationService.notifyGroup(
      groupId,
      `Expense "${expense.description}" was deleted.`,
      'EXPENSE_ADDED',
      { groupId },
      userId
    );

    await activityService.logActivity(
      groupId,
      userId,
      'EXPENSE_DELETED',
      `Deleted expense "${expense.description}"`,
      { expenseId: expense.id, description: expense.description }
    );

    try {
      getIO().to(`group:${groupId}`).emit('group:dataUpdated', { groupId });
    } catch (err: any) {
      logger.warn(`Failed to emit group data update via Socket.IO: ${err.message}`);
    }

    return { success: true };
  }
}

export const expenseService = new ExpenseService();

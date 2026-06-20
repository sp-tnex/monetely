import mongoose, { PipelineStage } from 'mongoose';
import { Expense } from '../expenses/expense.model';
import { Group } from '../groups/group.model';
import { User } from '../users/user.model';
import { Settlement } from '../settlements/settlement.model';
import { MonthlySnapshot, MonthClosing } from './analytics.model';
import { cacheService } from '../../core/services/cache.service';
import { AppError } from '../../core/errors/AppError';

export class AnalyticsService {
  private getCacheKey(groupId: string, type: string, year: number, month?: number): string {
    return `analytics:${groupId}:${type}:${year}:${month ?? 'all'}`;
  }

  private getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  async getMonthlySummary(groupId: string, year: number, month: number) {
    const cacheKey = this.getCacheKey(groupId, 'summary', year, month);
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const snapshot = await MonthlySnapshot.findOne({ group: new mongoose.Types.ObjectId(groupId), month, year });
    if (snapshot) {
      return {
        totalSpent: snapshot.totalSpent,
        totalExpenses: snapshot.totalExpenses,
        topCategory: snapshot.topCategory,
        topSpender: snapshot.topSpender,
        averageDailySpend: snapshot.totalSpent / this.getDaysInMonth(year, month),
        growthPercentage: await this.calculateGrowth(groupId, year, month, snapshot.totalSpent),
        budgetUtilization: await this.calculateBudgetUtilization(groupId, snapshot.totalSpent),
        isClosed: true,
        snapshot,
      };
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const statsPipeline: PipelineStage[] = [
      {
        $match: {
          group: new mongoose.Types.ObjectId(groupId),
          date: { $gte: start, $lte: end },
          status: 'ACTIVE',
        },
      },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalSpent: { $sum: '$amount' },
                totalExpenses: { $sum: 1 },
              },
            },
          ],
          categoryBreakdown: [
            {
              $group: {
                _id: '$category',
                amount: { $sum: '$amount' },
              },
            },
            { $sort: { amount: -1 } },
          ],
          spenderBreakdown: [
            {
              $group: {
                _id: '$paidBy',
                amount: { $sum: '$amount' },
              },
            },
            { $sort: { amount: -1 } },
          ],
        },
      },
    ];

    const results = await Expense.aggregate(statsPipeline);
    const facetResult = results[0];

    const totalSpent = facetResult.totals[0]?.totalSpent || 0;
    const totalExpenses = facetResult.totals[0]?.totalExpenses || 0;
    const topCategory = facetResult.categoryBreakdown[0]?._id || 'None';

    let topSpender = 'None';
    if (facetResult.spenderBreakdown[0]?._id) {
      const topSpenderUser = await User.findById(facetResult.spenderBreakdown[0]._id);
      topSpender = topSpenderUser?.username || 'Unknown';
    }

    const averageDailySpend = totalSpent / this.getDaysInMonth(year, month);
    const growthPercentage = await this.calculateGrowth(groupId, year, month, totalSpent);
    const budgetUtilization = await this.calculateBudgetUtilization(groupId, totalSpent);

    const checkClosing = await MonthClosing.findOne({ group: new mongoose.Types.ObjectId(groupId), month, year });
    const isClosed = checkClosing ? checkClosing.status !== 'OPEN' : false;

    const summary = {
      totalSpent,
      totalExpenses,
      topCategory,
      topSpender,
      averageDailySpend,
      growthPercentage,
      budgetUtilization,
      isClosed,
    };

    await cacheService.set(cacheKey, summary, 600); // 10 minutes cache
    return summary;
  }

  private async calculateGrowth(groupId: string, year: number, month: number, currentMonthSpend: number): Promise<number> {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const start = new Date(prevYear, prevMonth - 1, 1);
    const end = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

    const prevResult = await Expense.aggregate([
      {
        $match: {
          group: new mongoose.Types.ObjectId(groupId),
          date: { $gte: start, $lte: end },
          status: 'ACTIVE',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const prevSpend = prevResult[0]?.total || 0;
    if (prevSpend === 0) return currentMonthSpend > 0 ? 100 : 0;
    return parseFloat((((currentMonthSpend - prevSpend) / prevSpend) * 100).toFixed(2));
  }

  private async calculateBudgetUtilization(groupId: string, totalSpent: number): Promise<number> {
    const group = await Group.findById(groupId);
    if (!group || !group.monthlyBudget || group.monthlyBudget === 0) {
      return 0;
    }
    return parseFloat(((totalSpent / group.monthlyBudget) * 100).toFixed(2));
  }

  async getUserAnalytics(groupId: string, userId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const matchStage = {
      group: new mongoose.Types.ObjectId(groupId),
      date: { $gte: start, $lte: end },
      status: 'ACTIVE',
    };

    const paidResult = await Expense.aggregate([
      { $match: { ...matchStage, paidBy: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const owedResult = await Expense.aggregate([
      {
        $match: {
          ...matchStage,
          paidBy: { $ne: new mongoose.Types.ObjectId(userId) },
          'splits.user': new mongoose.Types.ObjectId(userId),
        },
      },
      { $unwind: '$splits' },
      { $match: { 'splits.user': new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$splits.amountOwed' } } },
    ]);

    const receivedResult = await Expense.aggregate([
      {
        $match: {
          ...matchStage,
          paidBy: new mongoose.Types.ObjectId(userId),
        },
      },
      { $unwind: '$splits' },
      { $match: { 'splits.user': { $ne: new mongoose.Types.ObjectId(userId) } } },
      { $group: { _id: null, total: { $sum: '$splits.amountOwed' } } },
    ]);

    const categoriesResult = await Expense.aggregate([
      {
        $match: {
          ...matchStage,
          $or: [
            { paidBy: new mongoose.Types.ObjectId(userId) },
            { 'splits.user': new mongoose.Types.ObjectId(userId) },
          ],
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const totalPaid = paidResult[0]?.total || 0;
    const expenseCount = paidResult[0]?.count || 0;
    const totalOwed = owedResult[0]?.total || 0;
    const totalReceived = receivedResult[0]?.total || 0;

    const days = this.getDaysInMonth(year, month);
    const dailyAverageSpend = (totalPaid + totalOwed) / days;

    return {
      totalPaid,
      totalOwed,
      totalReceived,
      expenseCount,
      dailyAverageSpend: parseFloat(dailyAverageSpend.toFixed(2)),
      categories: categoriesResult.map((c) => ({ category: c._id, amount: c.total })),
    };
  }

  async getGroupAnalytics(groupId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const matchStage = {
      group: new mongoose.Types.ObjectId(groupId),
      date: { $gte: start, $lte: end },
      status: 'ACTIVE',
    };

    const categoryBreakdown = await Expense.aggregate([
      { $match: matchStage },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);

    const memberContributions = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paidBy',
          totalPaid: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalPaid: -1 } },
    ]);

    const members = [];
    for (const item of memberContributions) {
      const u = await User.findById(item._id);
      members.push({
        userId: item._id,
        username: u?.username || 'Unknown',
        totalPaid: item.totalPaid,
        count: item.count,
      });
    }

    const settlements = await Settlement.find({
      group: new mongoose.Types.ObjectId(groupId),
      date: { $gte: start, $lte: end },
    }).populate('payer recipient', 'username avatarUrl');

    const totalSettled = settlements.reduce((acc, s) => acc + s.amount, 0);

    return {
      totalGroupSpending: categoryBreakdown.reduce((acc, c) => acc + c.total, 0),
      categoryBreakdown: categoryBreakdown.map((c) => ({ category: c._id, amount: c.total })),
      memberContributions: members,
      totalSettled,
      settlementSummary: settlements,
    };
  }

  async getCategoryAnalytics(groupId: string, year: number, month: number) {
    const current = await this.getGroupAnalytics(groupId, year, month);

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const previous = await this.getGroupAnalytics(groupId, prevYear, prevMonth);

    const prevYearSameMonth = await this.getGroupAnalytics(groupId, year - 1, month);

    const categoryMap: Record<string, { current: number; previous: number; prevYear: number }> = {};

    current.categoryBreakdown.forEach((c) => {
      categoryMap[c.category] = { current: c.amount, previous: 0, prevYear: 0 };
    });

    previous.categoryBreakdown.forEach((c) => {
      if (!categoryMap[c.category]) {
        categoryMap[c.category] = { current: 0, previous: c.amount, prevYear: 0 };
      } else {
        categoryMap[c.category].previous = c.amount;
      }
    });

    prevYearSameMonth.categoryBreakdown.forEach((c) => {
      if (!categoryMap[c.category]) {
        categoryMap[c.category] = { current: 0, previous: 0, prevYear: c.amount };
      } else {
        categoryMap[c.category].prevYear = c.amount;
      }
    });

    const totalSpent = current.totalGroupSpending;

    return Object.entries(categoryMap).map(([category, data]) => {
      const pctShare = totalSpent > 0 ? (data.current / totalSpent) * 100 : 0;
      const growth = data.previous > 0 ? ((data.current - data.previous) / data.previous) * 100 : (data.current > 0 ? 100 : 0);

      return {
        category,
        totalAmount: data.current,
        percentageShare: parseFloat(pctShare.toFixed(2)),
        growthComparedToPrevMonth: parseFloat(growth.toFixed(2)),
        comparison: {
          currentMonth: data.current,
          previousMonth: data.previous,
          previousYearSameMonth: data.prevYear,
        },
      };
    });
  }

  async getTrendData(groupId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const matchStage = {
      group: new mongoose.Types.ObjectId(groupId),
      date: { $gte: start, $lte: end },
      status: 'ACTIVE',
    };

    const dailySpending = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dayOfMonth: '$date' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const weeklySpending = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $week: '$date' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
    const monthlySpending = await Expense.aggregate([
      {
        $match: {
          group: new mongoose.Types.ObjectId(groupId),
          date: { $gte: startOfYear, $lte: endOfYear },
          status: 'ACTIVE',
        },
      },
      {
        $group: {
          _id: { $month: '$date' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      dailySpending: dailySpending.map((d) => ({ day: d._id, amount: d.total })),
      weeklySpending: weeklySpending.map((w) => ({ week: w._id, amount: w.total })),
      monthlySpending: monthlySpending.map((m) => ({ month: m._id, amount: m.total })),
    };
  }

  async getFinancialYearAnalytics(groupId: string, startYear: number) {
    const start = new Date(startYear, 3, 1);
    const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);

    const matchStage = {
      group: new mongoose.Types.ObjectId(groupId),
      date: { $gte: start, $lte: end },
      status: 'ACTIVE',
    };

    const result = await Expense.aggregate([
      { $match: matchStage },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalSpent: { $sum: '$amount' },
                count: { $sum: 1 },
              },
            },
          ],
          categories: [
            { $group: { _id: '$category', total: { $sum: '$amount' } } },
            { $sort: { total: -1 } },
          ],
          monthly: [
            {
              $group: {
                _id: { month: { $month: '$date' }, year: { $year: '$date' } },
                total: { $sum: '$amount' },
              },
            },
          ],
        },
      },
    ]);

    const facet = result[0];
    const totalSpent = facet.summary[0]?.totalSpent || 0;
    const totalExpenses = facet.summary[0]?.count || 0;

    const group = await Group.findById(groupId);
    const yearlyBudget = group?.monthlyBudget ? group.monthlyBudget * 12 : 0;
    const budgetPerformance = yearlyBudget > 0 ? parseFloat(((totalSpent / yearlyBudget) * 100).toFixed(2)) : 0;

    return {
      financialYear: `FY ${startYear}-${(startYear + 1).toString().slice(-2)}`,
      totalSpend: totalSpent,
      totalIncome: 0,
      totalExpenses,
      categorySummary: facet.categories.map((c: any) => ({ category: c._id, amount: c.total })),
      monthlyBreakdown: facet.monthly.map((m: any) => ({
        month: m._id.month,
        year: m._id.year,
        total: m.total,
      })),
      budgetPerformance,
    };
  }

  async closeMonth(groupId: string, year: number, month: number, userId: string) {
    const snapshot = await this.generateSnapshot(groupId, year, month);

    await MonthClosing.findOneAndUpdate(
      { group: new mongoose.Types.ObjectId(groupId), month, year },
      {
        status: 'CLOSED',
        closedBy: new mongoose.Types.ObjectId(userId),
        closedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    await cacheService.invalidatePrefix(`analytics:${groupId}`);

    return { success: true, snapshot };
  }

  async reopenMonth(groupId: string, year: number, month: number) {
    const closing = await MonthClosing.findOne({ group: new mongoose.Types.ObjectId(groupId), month, year });
    if (!closing) {
      throw new AppError('This month has not been closed yet', 400);
    }
    if (closing.status === 'LOCKED') {
      throw new AppError('This month is locked and cannot be reopened', 403);
    }

    closing.status = 'OPEN';
    await closing.save();

    await MonthlySnapshot.deleteOne({ group: new mongoose.Types.ObjectId(groupId), month, year });

    await cacheService.invalidatePrefix(`analytics:${groupId}`);

    return { success: true };
  }

  async lockMonth(groupId: string, year: number, month: number) {
    const closing = await MonthClosing.findOne({ group: new mongoose.Types.ObjectId(groupId), month, year });
    if (!closing) {
      throw new AppError('This month has not been closed yet', 400);
    }

    closing.status = 'LOCKED';
    await closing.save();

    return { success: true };
  }

  async generateSnapshot(groupId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const matchStage = {
      group: new mongoose.Types.ObjectId(groupId),
      date: { $gte: start, $lte: end },
      status: 'ACTIVE',
    };

    const expenses = await Expense.find(matchStage);
    const totalSpent = expenses.reduce((acc, e) => acc + e.amount, 0);
    const totalExpenses = expenses.length;
    const catResult = await Expense.aggregate([
      { $match: matchStage },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]);
    const totalCatAmount = catResult.reduce((acc, c) => acc + c.total, 0);
    const categorySummary = catResult.map((c) => ({
      category: c._id,
      amount: c.total,
      percentage: totalCatAmount > 0 ? parseFloat(((c.total / totalCatAmount) * 100).toFixed(2)) : 0,
    })).sort((a, b) => b.amount - a.amount);

    const topCategory = categorySummary[0]?.category || 'None';

    const membersList = await User.find({});
    const memberSummary = [];
    const memberPayments: Record<string, number> = {};
    const memberOwed: Record<string, number> = {};

    expenses.forEach((e) => {
      const payerId = e.paidBy.toString();
      memberPayments[payerId] = (memberPayments[payerId] || 0) + e.amount;

      e.splits.forEach((s) => {
        const userId = s.user.toString();
        if (userId !== payerId) {
          memberOwed[userId] = (memberOwed[userId] || 0) + s.amountOwed;
        }
      });
    });

    for (const u of membersList) {
      const uidStr = u._id.toString();
      const paid = memberPayments[uidStr] || 0;
      const owed = memberOwed[uidStr] || 0;
      const received = Object.keys(memberOwed).length > 0 ? paid - owed : 0; // Simple net calculation

      if (paid > 0 || owed > 0) {
        memberSummary.push({
          user: u._id,
          username: u.username,
          paid,
          owed,
          received: received > 0 ? received : 0,
        });
      }
    }

    const topSpenderObj = [...memberSummary].sort((a, b) => b.paid - a.paid)[0];
    const topSpender = topSpenderObj?.username || 'None';

    const group = await Group.findById(groupId);
    let budgetStatus: 'WITHIN_BUDGET' | 'OVER_BUDGET' | 'NO_BUDGET' = 'NO_BUDGET';
    if (group && group.monthlyBudget && group.monthlyBudget > 0) {
      budgetStatus = totalSpent > group.monthlyBudget ? 'OVER_BUDGET' : 'WITHIN_BUDGET';
    }

    return await MonthlySnapshot.findOneAndUpdate(
      { group: new mongoose.Types.ObjectId(groupId), month, year },
      {
        totalSpent,
        totalExpenses,
        topCategory,
        topSpender,
        categorySummary,
        memberSummary,
        budgetStatus,
        isImmutable: true,
      },
      { upsert: true, new: true }
    );
  }

  async getSnapshot(groupId: string, year: number, month: number) {
    const snapshot = await MonthlySnapshot.findOne({ group: new mongoose.Types.ObjectId(groupId), month, year });
    if (!snapshot) {
      throw new AppError('Snapshot not found for this month', 404);
    }
    return snapshot;
  }

  async getAllClosingStatuses(groupId: string, queryParams: any = {}) {
    const page = parseInt(queryParams.page as string, 10) || 1;
    const limit = parseInt(queryParams.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const statuses = await MonthClosing.find({ group: new mongoose.Types.ObjectId(groupId) })
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MonthClosing.countDocuments({ group: new mongoose.Types.ObjectId(groupId) });

    return {
      statuses,
      total,
      page,
      limit,
      hasMore: skip + statuses.length < total
    };
  }
}

export const analyticsService = new AnalyticsService();

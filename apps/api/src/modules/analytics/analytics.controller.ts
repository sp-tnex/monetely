import { Request, Response } from 'express';
import { analyticsService } from './analytics.service';

export class AnalyticsController {
  async getMonthlySummary(req: Request, res: Response) {
    const groupId = req.params.groupId as string;
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const summary = await analyticsService.getMonthlySummary(groupId, year, month);
    res.status(200).json({ success: true, data: summary });
  }

  async getUserAnalytics(req: Request, res: Response) {
    const groupId = req.params.groupId as string;
    const userId = (req.user?.id || req.query.userId) as string;
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const report = await analyticsService.getUserAnalytics(groupId, userId, year, month);
    res.status(200).json({ success: true, data: report });
  }

  async getGroupAnalytics(req: Request, res: Response) {
    const groupId = req.params.groupId as string;
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const report = await analyticsService.getGroupAnalytics(groupId, year, month);
    res.status(200).json({ success: true, data: report });
  }

  async getCategoryAnalytics(req: Request, res: Response) {
    const groupId = req.params.groupId as string;
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const report = await analyticsService.getCategoryAnalytics(groupId, year, month);
    res.status(200).json({ success: true, data: report });
  }

  async getTrendData(req: Request, res: Response) {
    const groupId = req.params.groupId as string;
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const trends = await analyticsService.getTrendData(groupId, year, month);
    res.status(200).json({ success: true, data: trends });
  }

  async getFinancialYearAnalytics(req: Request, res: Response) {
    const groupId = req.params.groupId as string;
    const startYear = parseInt(req.query.year as string) || new Date().getFullYear();

    const report = await analyticsService.getFinancialYearAnalytics(groupId, startYear);
    res.status(200).json({ success: true, data: report });
  }

  async closeMonth(req: Request, res: Response) {
    const groupId = req.params.groupId as string;
    const { month, year } = req.body;
    const userId = req.user?.id as string;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and Year are required' });
    }

    const result = await analyticsService.closeMonth(groupId, year, month, userId);
    res.status(200).json({ success: true, message: 'Month closed successfully', data: result });
  }

  async reopenMonth(req: Request, res: Response) {
    const groupId = req.params.groupId as string;
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and Year are required' });
    }

    const result = await analyticsService.reopenMonth(groupId, year, month);
    res.status(200).json({ success: true, message: 'Month reopened successfully', data: result });
  }

  async lockMonth(req: Request, res: Response) {
    const groupId = req.params.groupId as string;
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and Year are required' });
    }

    const result = await analyticsService.lockMonth(groupId, year, month);
    res.status(200).json({ success: true, message: 'Month locked successfully', data: result });
  }

  async getSnapshot(req: Request, res: Response) {
    const groupId = req.params.groupId as string;
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and Year parameters are required' });
    }

    const snapshot = await analyticsService.getSnapshot(groupId, year, month);
    res.status(200).json({ success: true, data: snapshot });
  }

  async getClosingStatuses(req: Request, res: Response) {
    const groupId = req.params.groupId as string;
    const statuses = await analyticsService.getAllClosingStatuses(groupId);
    res.status(200).json({ success: true, data: statuses });
  }
}

export const analyticsController = new AnalyticsController();

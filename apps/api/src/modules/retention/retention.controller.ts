import { Request, Response } from 'express';
import { retentionService } from './retention.service';

export class RetentionController {
  async getSettings(req: Request, res: Response) {
    const userId = req.user?.id as string;
    const settings = await retentionService.getSettings(userId);
    res.status(200).json({ success: true, data: settings });
  }

  async updateSettings(req: Request, res: Response) {
    const userId = req.user?.id as string;
    const settings = await retentionService.updateSettings(userId, req.body);
    res.status(200).json({ success: true, message: 'Retention settings updated successfully', data: settings });
  }

  async archiveData(req: Request, res: Response) {
    const userId = req.user?.id as string;
    const { olderThan } = req.body;

    if (!olderThan) {
      return res.status(400).json({ success: false, message: 'olderThan date string is required' });
    }

    const result = await retentionService.archiveData(userId, new Date(olderThan));
    res.status(200).json({ success: true, message: `Archived ${result.count} expenses successfully.`, data: result });
  }

  async restoreData(req: Request, res: Response) {
    const userId = req.user?.id as string;
    const result = await retentionService.restoreData(userId);
    res.status(200).json({ success: true, message: `Restored ${result.count} expenses successfully.`, data: result });
  }

  async deleteArchivedData(req: Request, res: Response) {
    const userId = req.user?.id as string;
    const result = await retentionService.deleteArchivedData(userId);
    res.status(200).json({ success: true, message: `Deleted ${result.count} archived expenses successfully.`, data: result });
  }

  async getWarnings(req: Request, res: Response) {
    const userId = req.user?.id as string;
    const warnings = await retentionService.getWarnings(userId);
    res.status(200).json({ success: true, data: warnings });
  }

  async handleWarningAction(req: Request, res: Response) {
    const userId = req.user?.id as string;
    const warningId = req.params.warningId as string;
    const { action } = req.body; // 'APPROVE' | 'CANCEL' | 'EXTEND'

    if (!action || !['APPROVE', 'CANCEL', 'EXTEND'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be APPROVE, CANCEL, or EXTEND' });
    }

    const warning = await retentionService.handleWarningAction(warningId, userId, action);
    res.status(200).json({ success: true, message: `Warning resolved as ${action}`, data: warning });
  }

  async exportData(req: Request, res: Response) {
    const userId = req.user?.id as string;
    const format = (req.query.format as 'json' | 'csv' | 'html') || 'json';

    const fileData = await retentionService.exportUserData(userId, format);

    res.setHeader('Content-disposition', `attachment; filename=${fileData.filename}`);
    res.setHeader('Content-type', fileData.contentType);
    res.status(200).send(fileData.content);
  }
}

export const retentionController = new RetentionController();

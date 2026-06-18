import { Request, Response } from 'express';
import { exportService } from './export.service';
import { asyncHandler } from '../../utils/asyncHandler';

export class ExportController {
  exportGroupReport = asyncHandler(async (req: Request, res: Response) => {
    const groupId = req.params.groupId as string;
    const format = req.query.format as 'csv' | 'excel' | 'pdf';

    if (!format || !['csv', 'excel', 'pdf'].includes(format)) {
      res.status(400).json({ success: false, message: 'Invalid format query. Supported formats: csv, excel, pdf' });
      return;
    }

    const filename = `group_report_${groupId}_${Date.now()}`;

    if (format === 'csv') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.setHeader('Content-Type', 'text/csv');
      await exportService.exportGroupCSV(res, groupId);
      res.end();
    } else if (format === 'excel') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      await exportService.exportGroupExcel(res, groupId);
    } else if (format === 'pdf') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      res.setHeader('Content-Type', 'application/pdf');
      await exportService.exportGroupPDF(res, groupId);
    }
  });

  exportUserReport = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id as string;
    const format = req.query.format as 'csv' | 'excel' | 'pdf';

    if (!format || !['csv', 'excel', 'pdf'].includes(format)) {
      res.status(400).json({ success: false, message: 'Invalid format query. Supported formats: csv, excel, pdf' });
      return;
    }

    const filename = `user_report_${userId}_${Date.now()}`;

    if (format === 'csv') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.setHeader('Content-Type', 'text/csv');
      await exportService.exportUserCSV(res, userId);
      res.end();
    } else if (format === 'excel') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      await exportService.exportUserExcel(res, userId);
    } else if (format === 'pdf') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      res.setHeader('Content-Type', 'application/pdf');
      await exportService.exportUserPDF(res, userId);
    }
  });
}

export const exportController = new ExportController();

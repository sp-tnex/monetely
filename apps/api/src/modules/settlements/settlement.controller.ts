import { Request, Response } from 'express';
import { settlementService } from './settlement.service';

export class SettlementController {
  async getSettlements(req: Request, res: Response) {
    const transactions = await settlementService.calculateSettlements(req.params.groupId as string, req.user.id);
    res.status(200).json({ status: 'success', data: { transactions } });
  }

  async recordSettlement(req: Request, res: Response) {
    const settlement = await settlementService.recordSettlement(req.params.groupId as string, req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { settlement } });
  }

  async getSettlementsHistory(req: Request, res: Response) {
    const settlements = await settlementService.getSettlementsList(req.params.groupId as string, req.user.id);
    res.status(200).json({ status: 'success', data: { settlements } });
  }
}

export const settlementController = new SettlementController();

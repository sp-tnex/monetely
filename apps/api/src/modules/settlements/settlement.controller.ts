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

  async requestSettlement(req: Request, res: Response) {
    const settlement = await settlementService.requestSettlement(req.params.groupId as string, req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { settlement } });
  }

  async markAsPaid(req: Request, res: Response) {
    const settlement = await settlementService.markAsPaid(req.params.groupId as string, req.user.id, req.params.settlementId as string, req.body);
    res.status(200).json({ status: 'success', data: { settlement } });
  }

  async confirmSettlement(req: Request, res: Response) {
    const settlement = await settlementService.confirmSettlement(req.params.groupId as string, req.user.id, req.params.settlementId as string);
    res.status(200).json({ status: 'success', data: { settlement } });
  }

  async disputeSettlement(req: Request, res: Response) {
    const settlement = await settlementService.disputeSettlement(req.params.groupId as string, req.user.id, req.params.settlementId as string, req.body);
    res.status(200).json({ status: 'success', data: { settlement } });
  }

  async resolveDispute(req: Request, res: Response) {
    const settlement = await settlementService.resolveDispute(req.params.groupId as string, req.user.id, req.params.settlementId as string, req.body);
    res.status(200).json({ status: 'success', data: { settlement } });
  }

  async initiateCollectionCycle(req: Request, res: Response) {
    const result = await settlementService.initiateCollectionCycle(req.params.groupId as string, req.user.id, req.body);
    res.status(200).json({ status: 'success', data: result });
  }

  async broadcastOwnerReminders(req: Request, res: Response) {
    const result = await settlementService.broadcastOwnerReminders(req.params.groupId as string, req.user.id, req.body);
    res.status(200).json({ status: 'success', data: result });
  }
}

export const settlementController = new SettlementController();

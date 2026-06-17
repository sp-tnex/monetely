import { Request, Response } from 'express';
import { inviteService } from './invite.service';

export class InviteController {
  async createInvite(req: Request, res: Response) {
    const invite = await inviteService.createInvite(
      (req.params.groupId || req.body.groupId) as string,
      req.user.id,
      req.body
    );
    let qrCode = undefined;
    if (invite.type === 'LINK') {
      qrCode = await inviteService.generateQR(invite.token);
    }
    res.status(201).json({ status: 'success', data: { invite, qrCode } });
  }

  async revokeInvite(req: Request, res: Response) {
    const invite = await inviteService.revokeInvite(
      req.params.inviteId as string,
      req.user.id
    );
    res.status(200).json({ status: 'success', data: { invite } });
  }

  async resendInvite(req: Request, res: Response) {
    const invite = await inviteService.resendInvite(
      req.params.groupId as string,
      req.user.id,
      req.params.inviteId as string
    );
    res.status(200).json({ status: 'success', data: { invite } });
  }

  async getGroupInvites(req: Request, res: Response) {
    const invites = await inviteService.getGroupInvites(
      req.params.groupId as string,
      req.user.id
    );
    res.status(200).json({ status: 'success', data: { invites } });
  }

  async getUserPendingInvites(req: Request, res: Response) {
    const invites = await inviteService.getUserPendingInvites(req.user.id);
    res.status(200).json({ status: 'success', data: { invites } });
  }

  async getInviteDetailsByToken(req: Request, res: Response) {
    const invite = await inviteService.getInviteByToken(req.params.token as string);
    const qrCode = await inviteService.generateQR(req.params.token as string);
    res.status(200).json({ status: 'success', data: { invite, qrCode } });
  }

  async acceptInvite(req: Request, res: Response) {
    const { token, inviteId } = req.params;
    const invite = await inviteService.acceptInvite(
      (token || inviteId) as string,
      req.user.id,
      !!token
    );
    res.status(200).json({ status: 'success', data: { invite } });
  }

  async declineInvite(req: Request, res: Response) {
    const { token, inviteId } = req.params;
    const invite = await inviteService.declineInvite(
      (token || inviteId) as string,
      req.user.id,
      !!token
    );
    res.status(200).json({ status: 'success', data: { invite } });
  }
}

export const inviteController = new InviteController();

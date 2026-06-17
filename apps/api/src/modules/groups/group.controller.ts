import { Request, Response } from 'express';
import { groupService } from './group.service';
import { activityService } from './activity.service';

export class GroupController {
  async createGroup(req: Request, res: Response) {
    const group = await groupService.createGroup(req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { group } });
  }

  async getGroups(req: Request, res: Response) {
    const groups = await groupService.getUserGroups(req.user.id);
    res.status(200).json({ status: 'success', data: { groups } });
  }

  async getGroupDetails(req: Request, res: Response) {
    const group = await groupService.getGroupDetails(req.params.id as string, req.user.id);
    res.status(200).json({ status: 'success', data: { group } });
  }

  async getGroupMembers(req: Request, res: Response) {
    const members = await groupService.getGroupMembers(req.params.id as string, req.user.id);
    res.status(200).json({ status: 'success', data: { members } });
  }

  async addMember(req: Request, res: Response) {
    const member = await groupService.addMember(req.params.id as string, req.user.id, req.body.email, req.body.role);
    res.status(201).json({ status: 'success', data: { member } });
  }

  async updateGroup(req: Request, res: Response) {
    const group = await groupService.updateGroup(req.params.id as string, req.body);
    res.status(200).json({ status: 'success', data: { group } });
  }

  async deleteGroup(req: Request, res: Response) {
    await groupService.deleteGroup(req.params.id as string);
    res.status(200).json({ status: 'success', message: 'Group deleted successfully' });
  }

  async removeMember(req: Request, res: Response) {
    await groupService.removeMember(req.params.id as string, req.user.id, req.params.memberId as string);
    res.status(200).json({ status: 'success', message: 'Member removed successfully' });
  }

  async updateMemberRole(req: Request, res: Response) {
    const member = await groupService.updateMemberRole(
      req.params.id as string,
      req.user.id,
      req.params.memberId as string,
      req.body.role as string
    );
    res.status(200).json({ status: 'success', data: { member } });
  }

  async getGroupActivity(req: Request, res: Response) {
    const activities = await activityService.getGroupActivity(
      req.params.id as string,
      req.user.id
    );
    res.status(200).json({ status: 'success', data: { activities } });
  }

  async exportGroupData(req: Request, res: Response) {
    const format = (req.query.format as 'json' | 'csv' | 'html') || 'json';
    const fileData = await groupService.exportGroupData(req.params.id as string, format);

    res.setHeader('Content-disposition', `attachment; filename=${fileData.filename}`);
    res.setHeader('Content-type', fileData.contentType);
    res.status(200).send(fileData.content);
  }
}

export const groupController = new GroupController();

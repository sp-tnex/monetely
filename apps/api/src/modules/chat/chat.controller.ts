import { Request, Response } from 'express';
import { chatService } from './chat.service';

export class ChatController {
  async getOrCreateRoom(req: Request, res: Response) {
    const { groupId } = req.params as any;
    const { type, referenceId } = req.query;
    
    const room = await chatService.getOrCreateRoom(
      groupId,
      type as any,
      referenceId as string
    );
    res.status(200).json({ status: 'success', data: { room } });
  }

  async getMessages(req: Request, res: Response) {
    const { roomId } = req.params as any;
    const { limit, cursor } = req.query;

    const data = await chatService.getMessages(roomId, req.user.id, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      cursor: cursor as string
    });
    res.status(200).json({ status: 'success', data });
  }

  async sendMessage(req: Request, res: Response) {
    const { roomId } = req.params as any;
    const message = await chatService.sendMessage(roomId, req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { message } });
  }

  async editMessage(req: Request, res: Response) {
    const { messageId } = req.params as any;
    const { content } = req.body;
    const message = await chatService.editMessage(messageId, req.user.id, content);
    res.status(200).json({ status: 'success', data: { message } });
  }

  async deleteMessage(req: Request, res: Response) {
    const { messageId } = req.params as any;
    const deleteType = (req.query.deleteType as 'me' | 'everyone') || 'everyone';
    const result = await chatService.deleteMessage(messageId, req.user.id, deleteType);
    res.status(200).json({ status: 'success', data: result });
  }

  async togglePin(req: Request, res: Response) {
    const { messageId } = req.params as any;
    const { isPinned } = req.body;
    const message = await chatService.pinMessage(messageId, req.user.id, isPinned);
    res.status(200).json({ status: 'success', data: { message } });
  }

  async handleReaction(req: Request, res: Response) {
    const { messageId } = req.params as any;
    const { emoji, action } = req.body; // action: 'add' | 'remove'
    const result = await chatService.handleReaction(messageId, req.user.id, emoji, action);
    res.status(200).json({ status: 'success', data: result });
  }

  async markAsRead(req: Request, res: Response) {
    const { roomId } = req.params as any;
    const { messageId } = req.body;
    const result = await chatService.markRoomAsRead(roomId, req.user.id, messageId);
    res.status(200).json({ status: 'success', data: result });
  }

  async updateRetentionSettings(req: Request, res: Response) {
    const { roomId } = req.params as any;
    const room = await chatService.updateRetentionSettings(roomId, req.user.id, req.body);
    res.status(200).json({ status: 'success', data: { room } });
  }

  async manualCleanup(req: Request, res: Response) {
    const { roomId } = req.params as any;
    const result = await chatService.manualCleanup(roomId, req.user.id, req.body);
    res.status(200).json({ status: 'success', data: result });
  }

  async searchMessages(req: Request, res: Response) {
    const { roomId } = req.params as any;
    const { query, senderId, type, startDate, endDate } = req.query;

    const messages = await chatService.searchMessages(roomId, req.user.id, query as string, {
      senderId: senderId as string,
      type: type as string,
      startDate: startDate as string,
      endDate: endDate as string
    });
    res.status(200).json({ status: 'success', data: { messages } });
  }

  async exportChatHistory(req: Request, res: Response) {
    const { roomId } = req.params as any;
    const format = (req.query.format as 'json' | 'csv' | 'txt') || 'txt';

    const file = await chatService.exportChatHistory(roomId, req.user.id, format);

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.status(200).send(file.data);
  }
}

export const chatController = new ChatController();

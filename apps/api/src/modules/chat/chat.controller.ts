import { Request, Response, NextFunction } from 'express';
import { ChatService } from './chat.service.js';
import { HTTP_STATUS, type ApiResponse } from '@agentflow/shared';

export class ChatController {
  /**
   * POST /api/agents/:id/chat
   */
  static async processMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.orgId;
      const agentId = (req.params.id as string);
      
      if (!orgId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'No active organization context found' });
        return;
      }

      const { message } = req.body;
      if (!message) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Message is required' });
        return;
      }

      const reply = await ChatService.processMessage(orgId, agentId, message);
      
      const response: ApiResponse = {
        success: true,
        data: reply,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  }
}

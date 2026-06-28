import { Request, Response, NextFunction } from 'express';
import { RagService } from './rag.service.js';
import { HTTP_STATUS, type ApiResponse } from '@agentflow/shared';

export class KnowledgeController {
  /**
   * POST /api/knowledge/upload
   */
  static async uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.orgId;
      if (!orgId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'No active organization context found' });
        return;
      }

      if (!req.file) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'No file provided' });
        return;
      }

      const originalName = req.file.originalname;
      
      const { BillingService } = await import('../billing/billing.service.js');
      await BillingService.checkLimit(orgId, 'documents');
      
      // Process file in background (or await for MVP)
      const document = await RagService.processDocument(orgId, req.file, originalName);

      const response: ApiResponse = {
        success: true,
        data: document,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  }
}

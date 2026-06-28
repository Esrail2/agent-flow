import { Request, Response, NextFunction } from 'express';
import { BillingService } from './billing.service.js';
import { HTTP_STATUS, type ApiResponse } from '@agentflow/shared';

export class BillingController {
  /**
   * POST /api/billing/checkout-session
   */
  static async createCheckoutSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.orgId;
      const userId = req.user?.userId;
      const { plan } = req.body;

      if (!orgId || !userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const session = await BillingService.createCheckoutSession(orgId, plan || 'PRO', userId);
      
      const response: ApiResponse = {
        success: true,
        data: session,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/billing/webhook
   */
  static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const payload = req.body; // Needs to be raw buffer for Stripe validation
      
      await BillingService.handleWebhook(signature, payload);
      
      res.status(HTTP_STATUS.OK).json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(HTTP_STATUS.BAD_REQUEST).send(`Webhook Error: ${(error as any).message}`);
    }
  }
}

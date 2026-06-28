import { Router, raw } from 'express';
import { BillingController } from './billing.controller.js';
import { authenticate, requireOrg, requireRole } from '../../middleware/index.js';

const router = Router();

// Webhook needs raw body to verify Stripe signature
router.post('/webhook', raw({ type: 'application/json' }), BillingController.handleWebhook);

// Protected routes
router.use(authenticate);

router.post('/checkout-session', requireOrg, requireRole(['ORG_OWNER']), BillingController.createCheckoutSession);

export default router;

import { Router, Request, Response } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import orgRoutes from '../modules/org/org.routes.js';
import { agentRoutes } from '../modules/agent/agent.routes.js';
import { knowledgeRoutes } from '../modules/knowledge/knowledge.routes.js';
import workflowRoutes from '../modules/workflow/workflow.routes.js';
import leadsRoutes from '../modules/leads/leads.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import billingRoutes from '../modules/billing/billing.routes.js';

const router: Router = Router();

// Mount modules
router.use('/auth', authRoutes);
router.use('/org', orgRoutes);
router.use('/agents', agentRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/workflows', workflowRoutes);
router.use('/leads', leadsRoutes);
router.use('/admin', adminRoutes);
router.use('/billing', billingRoutes);

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

export default router;

import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import * as adminController from './admin.controller.js';

const router = Router();

// All admin routes require authentication + SUPER_ADMIN role
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

router.get('/stats', adminController.getSystemStats);

router.get('/organizations', adminController.getAllOrganizations);
router.delete('/organizations/:id', adminController.deleteOrganization);
router.put('/organizations/:id/plan', adminController.updateOrgPlan);

router.get('/users', adminController.getAllUsers);
router.put('/users/:id/role', adminController.updateUserRole);

router.get('/subscriptions', adminController.getAllSubscriptions);
router.get('/payments', adminController.getAllPayments);

export default router;

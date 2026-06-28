import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validate, authenticate } from '../../middleware/index.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@agentflow/shared';

const router = Router();

// Public routes
router.get('/google', AuthController.google);
router.get('/google/callback', AuthController.googleCallback);
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/refresh', AuthController.refresh);
router.get('/verify-email/:token', AuthController.verifyEmail);
router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);

export default router;

import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { HTTP_STATUS, type ApiResponse } from '@agentflow/shared';
import { config } from '../../config/index.js';

// Helper to set refresh token in httpOnly cookie
function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// Helper to clear refresh token cookie
function clearRefreshCookie(res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

export class AuthController {
  /**
   * GET /api/auth/google
   */
  static google(req: Request, res: Response): void {
    const url = AuthService.getGoogleAuthUrl();
    res.redirect(url);
  }

  /**
   * GET /api/auth/google/callback
   */
  static async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.query.code as string;
      if (!code) {
        res.redirect(`${config.clientUrl}/login?error=GoogleAuthFailed`);
        return;
      }

      const result = await AuthService.handleGoogleCallback(code);
      setRefreshCookie(res, result.tokens.refreshToken);

      // Redirect back to frontend with a special token or just redirect to dashboard
      // Since it's a browser redirect, we can't easily return JSON with the access token.
      // Usually, we redirect to a frontend callback page that reads a temporary token,
      // or we just set the refresh cookie and redirect to dashboard, letting the frontend
      // auto-fetch the session (since we built SessionProvider!).
      res.redirect(`${config.clientUrl}/dashboard`);
    } catch (error) {
      console.error('Google Auth Error:', error);
      res.redirect(`${config.clientUrl}/login?error=GoogleAuthFailed`);
    }
  }

  /**
   * POST /api/auth/register
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      setRefreshCookie(res, result.tokens.refreshToken);

      const response: ApiResponse = {
        success: true,
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
        },
        message: 'Registration successful! Verification email has been sent.',
      };

      res.status(HTTP_STATUS.CREATED).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      setRefreshCookie(res, result.tokens.refreshToken);

      const response: ApiResponse = {
        success: true,
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
        },
        message: 'Login successful.',
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await AuthService.logout(req.user.userId);
      }
      clearRefreshCookie(res);

      const response: ApiResponse = {
        success: true,
        message: 'Logged out successfully.',
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/refresh
   */
  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rToken = req.cookies.refreshToken || req.body.refreshToken;
      if (!rToken) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Refresh token missing',
        });
        return;
      }

      const tokens = await AuthService.refreshTokens(rToken);
      setRefreshCookie(res, tokens.refreshToken);

      const response: ApiResponse = {
        success: true,
        data: {
          accessToken: tokens.accessToken,
        },
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/verify-email/:token
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.verifyEmail(req.params.token as string);

      const response: ApiResponse = {
        success: true,
        message: 'Email verified successfully! You can now log in.',
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.requestPasswordReset(req.body);

      const response: ApiResponse = {
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/reset-password
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.resetPassword(req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Password reset successful! You can now log in with your new password.',
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          user: req.user,
        },
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  }
}

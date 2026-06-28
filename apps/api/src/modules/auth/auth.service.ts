import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@agentflow/database';
import { HTTP_STATUS } from '@agentflow/shared';
import { AppError } from '../../middleware/error.middleware.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../lib/email.js';
import type { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput, AuthTokens, UserProfile } from '@agentflow/shared';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config/index.js';

const googleClient = new OAuth2Client(
  config.google.clientId,
  config.google.clientSecret,
  config.google.callbackUrl
);

export class AuthService {
  /**
   * Get Google Auth URL
   */
  static getGoogleAuthUrl(): string {
    return googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
      prompt: 'consent'
    });
  }

  /**
   * Handle Google OAuth Callback
   */
  static async handleGoogleCallback(code: string): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const { tokens } = await googleClient.getToken(code);
    
    if (!tokens.id_token) {
      throw new AppError('No ID token in Google response', HTTP_STATUS.BAD_REQUEST);
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.google.clientId,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new AppError('Invalid Google Token', HTTP_STATUS.UNAUTHORIZED);
    }

    const email = payload.email;
    const name = payload.name || 'Google User';
    const avatar = payload.picture;
    const googleId = payload.sub;

    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        ownedOrgs: { take: 1 },
        teamMembers: { take: 1, include: { team: { select: { orgId: true } } } },
      }
    });

    if (!user) {
      const orgName = `${name}'s Workspace`;
      let orgSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      if (!orgSlug || orgSlug === '-') orgSlug = 'workspace';
      orgSlug = `${orgSlug}-${crypto.randomBytes(3).toString('hex')}`;

      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            name,
            avatar,
            role: 'ORG_OWNER',
            emailVerified: true,
            googleId,
          },
        });

        const org = await tx.organization.create({
          data: { name: orgName, slug: orgSlug, ownerId: newUser.id, plan: 'FREE' },
        });

        const team = await tx.team.create({
          data: { name: 'General', orgId: org.id },
        });

        await tx.teamMember.create({
          data: { teamId: team.id, userId: newUser.id, role: 'ADMIN', inviteAccepted: true },
        });

        await tx.subscription.create({
          data: { orgId: org.id, plan: 'FREE', status: 'ACTIVE' },
        });

        return { user: newUser, org };
      });

      user = await prisma.user.findUnique({
        where: { id: result.user.id },
        include: {
          ownedOrgs: { take: 1 },
          teamMembers: { take: 1, include: { team: { select: { orgId: true } } } },
        }
      }) as any;
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, avatar: user.avatar || avatar, emailVerified: true },
        include: {
          ownedOrgs: { take: 1 },
          teamMembers: { take: 1, include: { team: { select: { orgId: true } } } },
        }
      });
    }

    const orgId = user!.ownedOrgs[0]?.id || user!.teamMembers[0]?.team.orgId;

    const accessToken = signAccessToken({
      userId: user!.id,
      email: user!.email,
      role: user!.role,
      orgId,
    });

    const refreshToken = signRefreshToken({
      userId: user!.id,
      email: user!.email,
      role: user!.role,
    });

    await prisma.user.update({
      where: { id: user!.id },
      data: { refreshToken },
    });

    return {
      user: {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        avatar: user!.avatar,
        role: user!.role,
        emailVerified: user!.emailVerified,
        createdAt: user!.createdAt.toISOString(),
      },
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Register a new User and create an Organization/Team automatically
   */
  static async register(input: RegisterInput): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new AppError('A user with this email already exists', HTTP_STATUS.CONFLICT);
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Generate safe organization slug from user's name
    const orgName = `${input.name}'s Workspace`;
    let orgSlug = input.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    if (!orgSlug || orgSlug === '-') orgSlug = 'workspace';
    orgSlug = `${orgSlug}-${crypto.randomBytes(3).toString('hex')}`;

    // Create user, organization, team, and membership in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create user
      const user = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          password: hashedPassword,
          role: 'ORG_OWNER', // By default, registration creates an organization owner
          emailVerified: false,
          verificationToken,
          verificationExpiry,
        },
      });

      // 2. Create organization
      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug: orgSlug,
          ownerId: user.id,
          plan: 'FREE',
        },
      });

      // 3. Create default general team
      const team = await tx.team.create({
        data: {
          name: 'General',
          orgId: org.id,
        },
      });

      // 4. Join organization team
      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId: user.id,
          role: 'ADMIN',
          inviteAccepted: true,
        },
      });

      // 5. Create default free subscription
      await tx.subscription.create({
        data: {
          orgId: org.id,
          plan: 'FREE',
          status: 'ACTIVE',
        },
      });

      return { user, org };
    });

    // Send verification email in the background
    sendVerificationEmail(result.user.email, result.user.name, verificationToken).catch((err) =>
      console.error('Failed to send verification email during register:', err),
    );

    // Sign tokens
    const accessToken = signAccessToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      orgId: result.org.id,
    });

    const refreshToken = signRefreshToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    });

    // Update user's refresh token
    await prisma.user.update({
      where: { id: result.user.id },
      data: { refreshToken },
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatar: result.user.avatar,
        role: result.user.role,
        emailVerified: result.user.emailVerified,
        createdAt: result.user.createdAt.toISOString(),
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Login User and return safe profile and tokens
   */
  static async login(input: LoginInput): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        ownedOrgs: { take: 1 },
        teamMembers: {
          take: 1,
          include: {
            team: {
              select: { orgId: true },
            },
          },
        },
      },
    });

    if (!user || !user.password) {
      throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED);
    }

    const isPasswordCorrect = await bcrypt.compare(input.password, user.password);
    if (!isPasswordCorrect) {
      throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED);
    }

    // Resolve an active organization ID context for the user
    const orgId = user.ownedOrgs[0]?.id || user.teamMembers[0]?.team.orgId;

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId,
    });

    const refreshToken = signRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Logout User and clear refresh token
   */
  static async logout(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  /**
   * Refresh the access and refresh token pair
   */
  static async refreshTokens(rToken: string): Promise<AuthTokens> {
    try {
      const payload = verifyRefreshToken(rToken);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          ownedOrgs: { take: 1 },
          teamMembers: {
            take: 1,
            include: {
              team: { select: { orgId: true } },
            },
          },
        },
      });

      if (!user || user.refreshToken !== rToken) {
        throw new AppError('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED);
      }

      const orgId = user.ownedOrgs[0]?.id || user.teamMembers[0]?.team.orgId;

      const accessToken = signAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        orgId,
      });

      const newRefreshToken = signRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new AppError('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED);
    }
  }

  /**
   * Verify email verification token
   */
  static async verifyEmail(token: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user || !user.verificationExpiry || user.verificationExpiry < new Date()) {
      throw new AppError('Invalid or expired verification link', HTTP_STATUS.BAD_REQUEST);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationExpiry: null,
      },
    });
  }

  /**
   * Request password reset token and send email
   */
  static async requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      // For security, don't reveal if email exists or not
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    sendPasswordResetEmail(user.email, user.name, resetToken).catch((err) =>
      console.error('Failed to send password reset email:', err),
    );
  }

  /**
   * Reset user password
   */
  static async resetPassword(input: ResetPasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { resetToken: input.token },
    });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new AppError('Invalid or expired password reset link', HTTP_STATUS.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  }
}

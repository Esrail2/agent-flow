import { Request, Response } from 'express';
import { prisma } from '@agentflow/database';
import { HTTP_STATUS } from '@agentflow/shared';
import { AppError } from '../../middleware/error.middleware.js';

/**
 * GET /api/admin/stats
 * System-wide analytics for super admin
 */
export const getSystemStats = async (req: Request, res: Response) => {
  const [
    totalOrganizations,
    totalUsers,
    totalAgents,
    totalConversations,
    totalMessages,
    totalDocuments,
    recentOrgs,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.agent.count(),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.document.count(),
    prisma.organization.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { name: true, email: true } },
        _count: { select: { agents: true, conversations: true } },
      },
    }),
  ]);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      totalOrganizations,
      totalUsers,
      totalAgents,
      totalConversations,
      totalMessages,
      totalDocuments,
      recentOrgs,
    },
  });
};

/**
 * GET /api/admin/organizations
 */
export const getAllOrganizations = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { agents: true, conversations: true, documents: true } },
        subscription: { select: { plan: true, status: true } },
      },
    }),
    prisma.organization.count(),
  ]);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: organizations,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};

/**
 * DELETE /api/admin/organizations/:id
 */
export const deleteOrganization = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw new AppError('Organization not found', HTTP_STATUS.NOT_FOUND);

  await prisma.organization.delete({ where: { id } });
  res.status(HTTP_STATUS.OK).json({ success: true, message: 'Organization deleted' });
};

/**
 * GET /api/admin/users
 */
export const getAllUsers = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        ownedOrgs: { select: { id: true, name: true, plan: true } },
      },
    }),
    prisma.user.count(),
  ]);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: users,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};

/**
 * PUT /api/admin/users/:id/role
 */
export const updateUserRole = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { role } = req.body;

  const validRoles = ['SUPER_ADMIN', 'ORG_OWNER', 'TEAM_MEMBER'];
  if (!validRoles.includes(role)) {
    throw new AppError('Invalid role', HTTP_STATUS.BAD_REQUEST);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });

  res.status(HTTP_STATUS.OK).json({ success: true, data: updated });
};

/**
 * PUT /api/admin/organizations/:id/plan
 */
export const updateOrgPlan = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { plan } = req.body;

  const validPlans = ['FREE', 'PRO', 'ENTERPRISE'];
  if (!validPlans.includes(plan)) {
    throw new AppError('Invalid plan', HTTP_STATUS.BAD_REQUEST);
  }

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw new AppError('Organization not found', HTTP_STATUS.NOT_FOUND);

  const updated = await prisma.organization.update({
    where: { id },
    data: { plan },
    select: { id: true, name: true, plan: true },
  });

  res.status(HTTP_STATUS.OK).json({ success: true, data: updated });
};

/**
 * GET /api/admin/subscriptions
 */
export const getAllSubscriptions = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true, owner: { select: { email: true } } } },
      },
    }),
    prisma.subscription.count(),
  ]);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: subscriptions,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};

/**
 * GET /api/admin/payments
 */
export const getAllPayments = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          select: {
            plan: true,
            organization: { select: { name: true } }
          }
        }
      },
    }),
    prisma.payment.count(),
  ]);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: payments,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};

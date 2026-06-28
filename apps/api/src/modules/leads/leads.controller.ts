import { Request, Response } from 'express';
import { prisma } from '@agentflow/database';
import { HTTP_STATUS } from '@agentflow/shared';
import { AppError } from '../../middleware/error.middleware.js';

export const getLeads = async (req: Request, res: Response) => {
  const orgId = req.user!.orgId as string;
  const status = req.query.status as string | undefined;

  const leads = await prisma.lead.findMany({
    where: {
      orgId,
      ...(status ? { status: status as any } : {}),
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(HTTP_STATUS.OK).json({ success: true, data: leads });
};

export const createLead = async (req: Request, res: Response) => {
  const orgId = req.user!.orgId as string;
  const userId = req.user!.userId;
  const { name, email, phone, company, source, notes, status } = req.body;

  if (!name) throw new AppError('Name is required', HTTP_STATUS.BAD_REQUEST);

  const lead = await prisma.lead.create({
    data: {
      name,
      email,
      phone,
      company,
      source,
      notes,
      status: status || 'NEW',
      orgId,
      createdById: userId,
    },
  });

  res.status(HTTP_STATUS.CREATED).json({ success: true, data: lead });
};

export const updateLead = async (req: Request, res: Response) => {
  const orgId = req.user!.orgId as string;
  const id = req.params.id as string;
  const { name, email, phone, company, source, notes, status } = req.body;

  const lead = await prisma.lead.findFirst({ where: { id, orgId } });
  if (!lead) throw new AppError('Lead not found', HTTP_STATUS.NOT_FOUND);

  const updated = await prisma.lead.update({
    where: { id },
    data: { name, email, phone, company, source, notes, status },
  });

  res.status(HTTP_STATUS.OK).json({ success: true, data: updated });
};

export const deleteLead = async (req: Request, res: Response) => {
  const orgId = req.user!.orgId as string;
  const id = req.params.id as string;

  const lead = await prisma.lead.findFirst({ where: { id, orgId } });
  if (!lead) throw new AppError('Lead not found', HTTP_STATUS.NOT_FOUND);

  await prisma.lead.delete({ where: { id } });
  res.status(HTTP_STATUS.OK).json({ success: true, message: 'Lead deleted' });
};

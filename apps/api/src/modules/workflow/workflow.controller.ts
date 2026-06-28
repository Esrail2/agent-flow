import { Request, Response } from 'express';
import { prisma } from '@agentflow/database';
import { HTTP_STATUS } from '@agentflow/shared';
import { AppError } from '../../middleware/error.middleware.js';

export const getWorkflows = async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;

  const workflows = await prisma.workflow.findMany({
    where: { orgId },
    include: {
      _count: {
        select: { nodes: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  res.status(HTTP_STATUS.OK).json({ success: true, data: workflows });
};

export const createWorkflow = async (req: Request, res: Response) => {
  const orgId = req.user!.orgId!;
  const userId = req.user!.userId;
  const { name, description } = req.body;

  if (!name) {
    throw new AppError('Name is required', HTTP_STATUS.BAD_REQUEST);
  }

  const { BillingService } = await import('../billing/billing.service.js');
  await BillingService.checkLimit(orgId, 'workflows');

  const workflow = await prisma.workflow.create({
    data: {
      name,
      description,
      orgId,
      createdById: userId,
      viewport: { x: 0, y: 0, zoom: 1 }
    }
  });

  res.status(HTTP_STATUS.CREATED).json({ success: true, data: workflow });
};

export const getWorkflowById = async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const { id } = req.params as { id: string };

  const workflow = await prisma.workflow.findFirst({
    where: { id, orgId },
    include: {
      nodes: true,
      edges: true
    }
  });

  if (!workflow) {
    throw new AppError('Workflow not found', HTTP_STATUS.NOT_FOUND);
  }

  res.status(HTTP_STATUS.OK).json({ success: true, data: workflow });
};

export const saveWorkflow = async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const { id } = req.params as { id: string };
  const { nodes, edges, viewport } = req.body;

  const workflow = await prisma.workflow.findFirst({
    where: { id, orgId }
  });

  if (!workflow) {
    throw new AppError('Workflow not found', HTTP_STATUS.NOT_FOUND);
  }

  // Use a transaction to delete old nodes/edges and create new ones
  await prisma.$transaction(async (tx) => {
    // 1. Delete existing
    await tx.workflowNode.deleteMany({ where: { workflowId: id } });
    await tx.workflowEdge.deleteMany({ where: { workflowId: id } });

    // 2. Update viewport
    if (viewport) {
      await tx.workflow.update({
        where: { id },
        data: { viewport }
      });
    }

    // 3. Create nodes
    if (nodes && nodes.length > 0) {
      await tx.workflowNode.createMany({
        data: nodes.map((node: any) => ({
          id: node.id,
          workflowId: id,
          type: node.type,
          positionX: node.position.x,
          positionY: node.position.y,
          data: node.data
        }))
      });
    }

    // 4. Create edges
    if (edges && edges.length > 0) {
      await tx.workflowEdge.createMany({
        data: edges.map((edge: any) => ({
          id: edge.id,
          workflowId: id,
          sourceId: edge.source,
          targetId: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle
        }))
      });
    }
  });

  res.status(HTTP_STATUS.OK).json({ success: true, message: 'Workflow saved successfully' });
};

export const deleteWorkflow = async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const { id } = req.params as { id: string };

  const workflow = await prisma.workflow.findFirst({
    where: { id, orgId }
  });

  if (!workflow) {
    throw new AppError('Workflow not found', HTTP_STATUS.NOT_FOUND);
  }

  await prisma.workflow.delete({
    where: { id }
  });

  res.status(HTTP_STATUS.OK).json({ success: true, message: 'Workflow deleted' });
};

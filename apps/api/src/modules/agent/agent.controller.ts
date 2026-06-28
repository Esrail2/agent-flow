import { Request, Response, NextFunction } from 'express';
import { AgentService } from './agent.service.js';
import { HTTP_STATUS, type ApiResponse } from '@agentflow/shared';

export class AgentController {
  /**
   * GET /api/agents
   */
  static async getAgents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.orgId;
      if (!orgId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'No active organization context found' });
        return;
      }

      const agents = await AgentService.getAgents(orgId);
      const response: ApiResponse = {
        success: true,
        data: agents,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/agents/:id
   */
  static async getAgentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.orgId;
      const agentId = (req.params.id as string);
      if (!orgId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'No active organization context found' });
        return;
      }

      const agent = await AgentService.getAgentById(orgId, agentId);
      const response: ApiResponse = {
        success: true,
        data: agent,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/agents
   */
  static async createAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.orgId;
      const userId = req.user?.userId;
      
      if (!orgId || !userId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Context missing' });
        return;
      }

      const { name, description, persona, modelId, tools } = req.body;
      if (!name || !persona) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Name and persona are required' });
        return;
      }

      const agent = await AgentService.createAgent(orgId, userId, { name, description, persona, modelId, tools });
      
      const response: ApiResponse = {
        success: true,
        data: agent,
        message: 'Agent created successfully.',
      };

      res.status(HTTP_STATUS.CREATED).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/agents/:id
   */
  static async updateAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.orgId;
      const agentId = (req.params.id as string);
      
      if (!orgId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'No active organization context found' });
        return;
      }

      const agent = await AgentService.updateAgent(orgId, agentId, req.body);
      
      const response: ApiResponse = {
        success: true,
        data: agent,
        message: 'Agent updated successfully.',
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/agents/:id
   */
  static async deleteAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.orgId;
      const agentId = (req.params.id as string);
      
      if (!orgId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'No active organization context found' });
        return;
      }

      await AgentService.deleteAgent(orgId, agentId);
      
      const response: ApiResponse = {
        success: true,
        message: 'Agent deleted successfully.',
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      next(error);
    }
  }
}

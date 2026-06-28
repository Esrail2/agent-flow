import { prisma } from '@agentflow/database';
import { AppError } from '../../middleware/error.middleware.js';
import { HTTP_STATUS } from '@agentflow/shared';
import { ChatService } from '../chat/chat.service.js';

export class WorkflowService {
  /**
   * Run a workflow by its ID
   */
  static async runWorkflow(workflowId: string, orgId: string, initialInput: string) {
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, orgId },
      include: {
        nodes: true,
        edges: true
      }
    });

    if (!workflow) {
      throw new AppError('Workflow not found', HTTP_STATUS.NOT_FOUND);
    }

    // 1. Build adjacency list and in-degrees
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    workflow.nodes.forEach(node => {
      adj.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    workflow.edges.forEach(edge => {
      adj.get(edge.sourceId)?.push(edge.targetId);
      inDegree.set(edge.targetId, (inDegree.get(edge.targetId) || 0) + 1);
    });

    // 2. Topological Sort (Kahn's algorithm)
    const queue: string[] = [];
    const executionOrder: string[] = [];

    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) queue.push(nodeId);
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      executionOrder.push(current);

      adj.get(current)?.forEach(neighbor => {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      });
    }

    if (executionOrder.length !== workflow.nodes.length) {
      throw new AppError('Cycle detected in workflow. Circular dependencies are not allowed.', HTTP_STATUS.BAD_REQUEST);
    }

    // 3. Execution
    const nodeResults = new Map<string, string>();
    let currentInput = initialInput;

    const messages = [];

    for (const nodeId of executionOrder) {
      const node = workflow.nodes.find(n => n.id === nodeId)!;
      
      // If it's an agent node
      if (node.type === 'agent') {
        const data = node.data as { agentId: string };
        if (!data.agentId) continue; // Skip unconfigured agent

        // In a real scenario, we might want to aggregate inputs from multiple sources.
        // Here we just pass the input sequentially.
        const prompt = `Workflow Context Input: ${currentInput}\n\nPlease process this input according to your instructions.`;

        // We use ChatService to run the agent
        // We'll create a temporary conversation for this execution
        const tempConv = await prisma.conversation.create({
          data: {
            title: `Workflow Execution: ${workflow.name}`,
            agentType: data.agentId,
            orgId: orgId,
            userId: workflow.createdById, // Use workflow creator as executor for now
          }
        });

        // Run agent
        const response = await ChatService.processMessage(orgId, data.agentId, prompt);
        
        nodeResults.set(nodeId, response.content);
        currentInput = response.content; // Output becomes input for the next node
      }
    }

    return {
      success: true,
      executionOrder,
      finalOutput: currentInput,
      results: Object.fromEntries(nodeResults)
    };
  }
}

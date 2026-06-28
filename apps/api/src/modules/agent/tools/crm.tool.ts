import prisma from '@agentflow/database';

export const CrmToolSchema = {
  type: 'function',
  function: {
    name: 'create_lead',
    description: 'Create a new lead in the CRM database',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Full name of the lead',
        },
        email: {
          type: 'string',
          description: 'Email address of the lead',
        },
        company: {
          type: 'string',
          description: 'Company name',
        },
        notes: {
          type: 'string',
          description: 'Additional notes or context about the lead',
        },
      },
      required: ['name'],
    },
  },
};

export async function executeCrmTool(args: any, context: { orgId: string; userId?: string }): Promise<string> {
  const { name, email, company, notes } = args;
  
  if (!context.orgId) {
    return JSON.stringify({ error: 'Missing organization context' });
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        company,
        notes,
        status: 'NEW',
        orgId: context.orgId,
        createdById: context.userId,
      },
    });
    
    return JSON.stringify({ 
      success: true, 
      message: 'Lead created successfully',
      leadId: lead.id
    });
  } catch (error: any) {
    return JSON.stringify({ error: `Failed to create lead: ${error.message}` });
  }
}

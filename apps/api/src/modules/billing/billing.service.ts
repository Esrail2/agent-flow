import Stripe from 'stripe';
import { prisma } from '@agentflow/database';
import { config } from '../../config/index.js';
import { AppError } from '../../middleware/error.middleware.js';
import { HTTP_STATUS } from '@agentflow/shared';

const stripe = new Stripe(config.stripe?.secretKey || 'sk_test_placeholder', {} as any);

const PLAN_LIMITS = {
  FREE: { maxAgents: 1, maxWorkflows: 1, maxDocuments: 5 },
  PRO: { maxAgents: 10, maxWorkflows: 10, maxDocuments: 100 },
  ENTERPRISE: { maxAgents: 9999, maxWorkflows: 9999, maxDocuments: 9999 },
};

export class BillingService {
  /**
   * Create a checkout session for a specific plan
   */
  static async createCheckoutSession(orgId: string, plan: 'PRO' | 'ENTERPRISE', userId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { subscription: true },
    });

    if (!org) throw new AppError('Organization not found', HTTP_STATUS.NOT_FOUND);

    let customerId = org.subscription?.stripeCustomerId;

    if (!customerId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const customer = await stripe.customers.create({
        email: user?.email,
        metadata: { orgId },
      });
      customerId = customer.id;
      
      if (org.subscription) {
        await prisma.subscription.update({
          where: { id: org.subscription.id },
          data: { stripeCustomerId: customerId },
        });
      }
    }

    // Determine Price ID (should ideally come from config or env)
    const priceId = plan === 'PRO' ? config.stripe?.proPriceId : config.stripe?.enterprisePriceId;
    if (!priceId) {
      throw new AppError('Stripe Price IDs are not configured', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${config.clientUrl}/dashboard/billing?success=true`,
      cancel_url: `${config.clientUrl}/dashboard/billing?canceled=true`,
      client_reference_id: orgId,
    });

    return { url: session.url };
  }

  /**
   * Handle Stripe Webhooks
   */
  static async handleWebhook(signature: string, payload: Buffer) {
    if (!config.stripe?.webhookSecret) {
      throw new Error('Stripe webhook secret is not configured');
    }

    const event = stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const orgId = session.client_reference_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (orgId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId) as any;
          // Update org subscription
          const dbSub = await prisma.subscription.findUnique({ where: { orgId } });
          if (dbSub) {
            await prisma.subscription.update({
              where: { orgId },
              data: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                plan: 'PRO', // In a real app, determine this from price ID
                status: 'ACTIVE',
                currentPeriodEnd: new Date(sub.current_period_end * 1000),
              },
            });
            await prisma.organization.update({
              where: { id: orgId },
              data: { plan: 'PRO' },
            });
          
            // Record payment
            await prisma.payment.create({
              data: {
                subscriptionId: dbSub.id,
                stripePaymentId: session.payment_intent as string || session.id,
                amount: session.amount_total || 0,
                currency: session.currency || 'usd',
                status: 'SUCCEEDED',
              }
            });
          }
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const dbSubs = await prisma.subscription.findMany({ where: { stripeSubscriptionId: subscription.id } });
        for (const sub of dbSubs) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'CANCELED', plan: 'FREE' },
          });
          await prisma.organization.update({
            where: { id: sub.orgId },
            data: { plan: 'FREE' },
          });
        }
        break;
      }
    }

    return { received: true };
  }

  /**
   * Enforce limits based on current plan
   */
  static async checkLimit(orgId: string, resourceType: 'agents' | 'workflows' | 'documents') {
    const org = await prisma.organization.findUnique({ where: { id: orgId }, include: { subscription: true } });
    if (!org) throw new AppError('Organization not found', HTTP_STATUS.NOT_FOUND);

    const plan = (org.subscription?.status === 'ACTIVE' ? org.subscription.plan : 'FREE') as keyof typeof PLAN_LIMITS;
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;

    if (resourceType === 'agents') {
      const count = await prisma.agent.count({ where: { orgId } });
      if (count >= limits.maxAgents) {
        throw new AppError(`Upgrade your plan to create more agents (Limit: ${limits.maxAgents})`, 402);
      }
    } else if (resourceType === 'workflows') {
      const count = await prisma.workflow.count({ where: { orgId } });
      if (count >= limits.maxWorkflows) {
        throw new AppError(`Upgrade your plan to create more workflows (Limit: ${limits.maxWorkflows})`, 402);
      }
    } else if (resourceType === 'documents') {
      const count = await prisma.document.count({ where: { orgId } });
      if (count >= limits.maxDocuments) {
        throw new AppError(`Upgrade your plan to upload more documents (Limit: ${limits.maxDocuments})`, 402);
      }
    }
  }
}

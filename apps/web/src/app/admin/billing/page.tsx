'use client';

import React from 'react';
import { 
  useGetAllSubscriptionsQuery, 
  useGetAllPaymentsQuery 
} from '@/store/services/adminApi';
import { 
  CreditCard, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  Receipt,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminBillingPage() {
  const { data: subsData, isLoading: subsLoading } = useGetAllSubscriptionsQuery({});
  const { data: paymentsData, isLoading: paymentsLoading } = useGetAllPaymentsQuery({});

  const subscriptions = subsData?.data || [];
  const payments = paymentsData?.data || [];

  // Calculate some basic stats
  const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE').length;
  const totalRevenue = payments
    .filter(p => p.status === 'SUCCEEDED')
    .reduce((sum, p) => sum + (p.amount / 100), 0); // Assuming amount is in cents

  const recentPayments = [...payments].slice(0, 10);

  if (subsLoading || paymentsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">
          Billing & Subscriptions
        </h1>
        <p className="text-sm text-zinc-400 mt-2">
          Manage organization subscriptions, view revenue, and track recent payments.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-16 h-16 text-emerald-500" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="font-semibold text-zinc-300">Total Revenue</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-zinc-100">${totalRevenue.toFixed(2)}</span>
            <span className="text-xs text-zinc-500 font-medium tracking-wide">USD</span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-16 h-16 text-blue-500" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="font-semibold text-zinc-300">Active Subscriptions</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-zinc-100">{activeSubs}</span>
            <span className="text-xs text-zinc-500 font-medium tracking-wide">Orgs</span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CreditCard className="w-16 h-16 text-indigo-500" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl">
              <CreditCard className="w-5 h-5 text-indigo-500" />
            </div>
            <h3 className="font-semibold text-zinc-300">Total Payments</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-zinc-100">{payments.length}</span>
            <span className="text-xs text-zinc-500 font-medium tracking-wide">Transactions</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subscriptions Table */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="text-lg font-bold text-zinc-100">All Subscriptions</h2>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="pb-3 font-medium">Organization</th>
                  <th className="pb-3 font-medium">Plan</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-sm">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3">
                      <div className="font-medium text-zinc-200">{sub.organization.name}</div>
                      <div className="text-xs text-zinc-500">{sub.organization.owner.email}</div>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        sub.plan === 'ENTERPRISE' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        sub.plan === 'PRO' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        {sub.plan}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        {sub.status === 'ACTIVE' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : sub.status === 'PAST_DUE' ? (
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                        )}
                        <span className="text-xs font-medium text-zinc-300">{sub.status}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-zinc-400">
                      {format(new Date(sub.createdAt), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))}
                {subscriptions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-500 text-sm">
                      No subscriptions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Receipt className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-zinc-100">Recent Payments</h2>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="pb-3 font-medium">Organization</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-sm">
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3 font-medium text-zinc-200">
                      {payment.subscription?.organization?.name || 'Unknown'}
                    </td>
                    <td className="py-3 font-medium text-zinc-100">
                      ${(payment.amount / 100).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        payment.status === 'SUCCEEDED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        payment.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3 text-right text-zinc-400 text-xs">
                      {format(new Date(payment.createdAt), 'MMM d, yyyy HH:mm')}
                    </td>
                  </tr>
                ))}
                {recentPayments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-500 text-sm">
                      No payments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

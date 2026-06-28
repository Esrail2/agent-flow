'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store';
import { logoutState } from '@/store/slices/authSlice';
import { useLogoutMutation } from '@/store/services/authApi';
import { AuthGuard } from '@/components/auth-guard';
import { toast } from 'react-hot-toast';
import {
  ShieldAlert,
  LogOut,
  LayoutDashboard,
  Building2,
  Users,
  ChevronRight,
  ExternalLink,
  CreditCard,
} from 'lucide-react';

const navItems = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Organizations', href: '/admin/organizations', icon: Building2 },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Billing', href: '/admin/billing', icon: CreditCard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [logoutUser] = useLogoutMutation();

  const handleLogout = async () => {
    await logoutUser().unwrap().catch(() => {});
    dispatch(logoutState());
    router.push('/login');
    toast.success('Logged out');
  };

  return (
    <AuthGuard allowedRoles={['SUPER_ADMIN']}>
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-zinc-900/60 border-r border-zinc-900 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-zinc-900">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            <div>
              <p className="font-extrabold text-sm tracking-tight text-zinc-100">Super Admin</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">AgentFlow Control</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-red-600/10 text-red-400 border border-red-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.name}
                </div>
                {active && <ChevronRight className="h-3.5 w-3.5" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-900 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-4 py-2.5 text-zinc-500 hover:text-zinc-300 text-xs rounded-xl hover:bg-zinc-900 transition-all"
          >
            <ExternalLink className="h-4 w-4" />
            Go to Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-400 hover:bg-red-950/20 text-xs rounded-xl transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}

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
  ShieldCheck,
  LogOut,
  LayoutDashboard,
  Settings,
  Layers,
  Users,
  ChevronRight,
  Menu,
  X,
  Terminal,
  Database
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [logoutUser, { isLoading }] = useLogoutMutation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
      dispatch(logoutState());
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (err) {
      dispatch(logoutState());
      router.push('/login');
    }
  };

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'AI Agents', href: '/dashboard/agents', icon: Terminal },
    { name: 'Knowledge Base', href: '/dashboard/knowledge', icon: Database },
    { name: 'Leads & CRM', href: '/dashboard/leads', icon: Users },
    { name: 'Workflows', href: '/dashboard/workflows', icon: Layers },
    { name: 'Workspaces', href: '/dashboard/workspaces', icon: Users },
    { name: 'Organization Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <AuthGuard>
      <div className="relative min-h-screen bg-zinc-950 text-zinc-50 flex overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />
        </div>

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-zinc-900/60 backdrop-blur-md border-r border-zinc-900 flex flex-col transition-transform duration-300 md:static md:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Sidebar Header */}
          <div className="px-6 py-5 border-b border-zinc-900 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <ShieldCheck className="h-7 w-7 text-blue-500" />
              <span className="font-extrabold tracking-tight text-xl bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                AgentFlow
              </span>
            </Link>
            <button className="md:hidden text-zinc-400 hover:text-zinc-200" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${
                    active
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                      : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4.5 w-4.5 transition-colors ${active ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                    <span>{item.name}</span>
                  </div>
                  {active && <ChevronRight className="h-4 w-4" />}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer User Info */}
          <div className="p-4 border-t border-zinc-900 space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="h-9 w-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400 uppercase">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-200 truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider truncate">{user?.role}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl transition-all duration-200 text-xs font-medium text-red-400 hover:text-red-350"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Overlay for small screens */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-zinc-950/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto z-10">
          {/* Header for Mobile */}
          <header className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between md:hidden bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-7 w-7 text-blue-500" />
              <span className="font-extrabold tracking-tight text-lg">AgentFlow</span>
            </div>
            <button className="text-zinc-400 hover:text-zinc-200 p-1 bg-zinc-900 rounded-lg border border-zinc-800" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
          </header>

          {/* Inner Route Page Content */}
          <div className="flex-1 p-6 md:p-10 max-w-6xl w-full mx-auto">
            {children}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

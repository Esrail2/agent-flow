'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@agentflow/shared';
import { useRegisterMutation } from '@/store/services/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import { toast } from 'react-hot-toast';
import { Loader2, User, Mail, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      const result = await registerUser(data).unwrap();
      if (result.success && result.data) {
        dispatch(setCredentials({
          user: result.data.user,
          accessToken: result.data.accessToken,
        }));
        toast.success(result.message || 'Verification email sent! Welcome to AgentFlow.');
        router.push('/dashboard');
      } else {
        toast.error(result.error || 'Registration failed');
      }
    } catch (error: any) {
      toast.error(error?.data?.error || 'Registration failed. Please check details.');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md space-y-8 z-10">
        {/* Logo and header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20 mb-4">
            <ShieldCheck className="h-8 w-8 text-blue-500 animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold text-zinc-50 tracking-tight">
            Create your workspace
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Start automating operations with AI-powered agents
          </p>
        </div>

        {/* Glassmorphic Form Card */}
        <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-8 rounded-3xl shadow-2xl space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Name input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <User className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  placeholder="John Doe"
                  {...register('name')}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Email input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  placeholder="name@company.com"
                  {...register('email')}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full pl-11 pr-12 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-800 w-full" />
            <span className="absolute bg-zinc-900/60 px-2 text-xs text-zinc-500 font-medium">OR</span>
          </div>

          <button
            type="button"
            onClick={() => window.location.href = 'http://localhost:4000/api/auth/google'}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-medium rounded-xl border border-zinc-800 transition-all duration-200"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Link to Login */}
          <p className="text-center text-sm text-zinc-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-blue-500 hover:text-blue-400 transition-colors duration-200"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

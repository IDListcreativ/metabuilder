'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, LogIn, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

function mapAuthError(err: any): string {
  const msg: string = err?.message || err?.error_description || String(err) || '';
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
    return 'Incorrect email or password. Please double-check your credentials and try again.';
  }
  if (lower.includes('email not confirmed') || lower.includes('not confirmed')) {
    return 'Please verify your email address before signing in. Check your inbox for a confirmation link.';
  }
  if (lower.includes('too many requests') || lower.includes('rate limit') || lower.includes('429')) {
    return 'Too many sign-in attempts. Please wait a few minutes before trying again.';
  }
  if (lower.includes('user not found') || lower.includes('no user')) {
    return 'No account found with this email address. Please sign up first.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  return msg || 'Sign-in failed. Please try again.';
}

export default function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isRateLimit, setIsRateLimit] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const attemptSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    setAuthError('');
    setIsRateLimit(false);
    try {
      await signIn(email, password);
      window.location.href = '/ai-code-generator';
    } catch (err: any) {
      const mapped = mapAuthError(err);
      const rateLimited = mapped.toLowerCase().includes('too many') || mapped.toLowerCase().includes('wait');
      setIsRateLimit(rateLimited);
      setAuthError(mapped);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    await attemptSignIn(data.email, data.password);
  };

  const handleRetry = () => {
    const { email, password } = getValues();
    if (email && password) {
      attemptSignIn(email, password);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setAuthError('');
    setIsRateLimit(false);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(mapAuthError(err) || 'Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate suppressHydrationWarning>
      {/* Auth error */}
      {authError && (
        <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-red-500/10 border border-red-500/25">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-300">{authError}</p>
            {isRateLimit && (
              <p className="text-xs text-amber-400 mt-1">Wait a few minutes before retrying to avoid being locked out.</p>
            )}
          </div>
          {!isRateLimit && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isLoading}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-600 bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 transition-all disabled:opacity-50 flex-shrink-0"
              title="Retry sign in"
            >
              <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading || isLoading}
        className="w-full py-3 rounded-xl text-sm font-500 flex items-center justify-center gap-3 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ minHeight: '48px' }}
      >
        {isGoogleLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
            <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
            <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
            <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
          </svg>
        )}
        <span>{isGoogleLoading ? 'Redirecting…' : 'Continue with Google'}</span>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-600">or sign in with email</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="block text-sm font-500 text-zinc-300">
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@company.dev"
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
          })}
          className={`w-full bg-zinc-900 border rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition-all ${
            errors.email
              ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500/30' :'border-zinc-800 focus:border-violet-600/60 focus:ring-1 focus:ring-violet-600/25'
          }`}
        />
        {errors.email && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle size={11} />
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="block text-sm font-500 text-zinc-300">
            Password
          </label>
          <button type="button" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
            })}
            className={`w-full bg-zinc-900 border rounded-xl px-4 py-3 pr-11 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition-all ${
              errors.password
                ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500/30' :'border-zinc-800 focus:border-violet-600/60 focus:ring-1 focus:ring-violet-600/25'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle size={11} />
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Remember me */}
      <div className="flex items-center gap-2.5">
        <input
          id="remember-me"
          type="checkbox"
          {...register('rememberMe')}
          className="w-4 h-4 rounded border border-zinc-700 bg-zinc-900 accent-violet-600 cursor-pointer"
        />
        <label htmlFor="remember-me" className="text-sm text-zinc-400 cursor-pointer">
          Keep me signed in for 30 days
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || isGoogleLoading}
        className="w-full py-3 rounded-xl text-sm font-600 text-white btn-glam disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
        style={{ minHeight: '48px' }}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Signing in…</span>
          </>
        ) : (
          <>
            <LogIn size={16} />
            <span>Sign In</span>
          </>
        )}
      </button>

      {/* Switch to signup */}
      <p className="text-center text-sm text-zinc-500">
        No account yet?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="text-violet-400 hover:text-violet-300 font-500 transition-colors"
        >
          Create one
        </button>
      </p>
    </form>
  );
}
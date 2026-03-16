'use client';

import { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import { Sparkles, Zap, GitBranch, Rocket, Share2, Code2 } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';


const FEATURES = [
  { icon: Zap, text: 'Generate React apps from natural language in seconds' },
  { icon: Code2, text: 'Iterative AI refinement with full file tree management' },
  { icon: GitBranch, text: 'One-click GitHub export to any repository' },
  { icon: Rocket, text: 'Deploy to Vercel or Netlify with a single button' },
  { icon: Share2, text: 'Share projects via public link instantly' },
];

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
  };

  return (
    <div className="min-h-screen flex bg-zinc-950">
      {/* Left: Brand panel */}
      <div className="hidden lg:flex flex-col w-[52%] xl:w-[55%] relative overflow-hidden animated-gradient">
        {/* Decorative orbs */}
        <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full bg-violet-600/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-60px] w-[300px] h-[300px] rounded-full bg-fuchsia-500/15 blur-[80px] pointer-events-none" />
        <div className="absolute top-[40%] left-[30%] w-[200px] h-[200px] rounded-full bg-pink-500/10 blur-[60px] pointer-events-none" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(167,139,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <AppLogo size={32} />
            <span className="text-xl font-700 glam-text tracking-tight">MetaBuilder</span>
          </div>

          {/* Main copy */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-600/20 border border-violet-500/30 text-xs font-600 text-violet-300">
                <Sparkles size={11} />
                Self-hosted AI App Builder
              </span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-700 text-white leading-tight mb-4">
              Build React apps
              <br />
              <span className="glam-text">with a sentence.</span>
            </h1>
            <p className="text-base text-zinc-400 leading-relaxed max-w-md mb-10">
              Describe your application in plain English. MetaBuilder generates production-ready React code, lets you refine it iteratively, and deploys it — all from one workspace.
            </p>

            {/* Feature list */}
            <ul className="space-y-3">
              {FEATURES?.map((f, i) => {
                const Icon = f?.icon;
                return (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-600/25 flex items-center justify-center flex-shrink-0">
                      <Icon size={13} className="text-violet-400" />
                    </div>
                    <span className="text-sm text-zinc-300">{f?.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <span>Open source</span>
            <span>·</span>
            <span>Self-hosted</span>
            <span>·</span>
            <span>No vendor lock-in</span>
          </div>
        </div>
      </div>
      {/* Right: Auth form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <AppLogo size={28} />
          <span className="font-700 text-lg glam-text">MetaBuilder</span>
        </div>

        <div className="w-full max-w-[400px]">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full mb-4 py-2 rounded-lg bg-white text-black font-600 hover:bg-zinc-200 transition"
          >
            Sign in with Google
          </button>

          {/* Tab switcher */}
          <div className="flex rounded-xl bg-zinc-900 border border-zinc-800 p-1 mb-8">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-600 transition-all duration-200 ${
                mode === 'login' ?'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/20 text-violet-300 border border-violet-600/25' :'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-sm font-600 transition-all duration-200 ${
                mode === 'signup' ?'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/20 text-violet-300 border border-violet-600/25' :'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Create Account
            </button>
          </div>

          

          {/* Form */}
          {mode === 'login' ? (
            <LoginForm onSwitchToSignup={() => setMode('signup')} />
          ) : (
            <SignupForm onSwitchToLogin={() => setMode('login')} />
          )}
        </div>
      </div>
    </div>
  );
}

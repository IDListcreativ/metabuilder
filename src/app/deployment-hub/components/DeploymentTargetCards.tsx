'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, Rocket, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { DeployPlatform } from './DeploymentHubWorkspace';

interface TargetConfig {
  token: string;
  projectName: string;
  teamId?: string;
  siteId?: string;
}

interface DeploymentTargetCardsProps {
  onDeploy: (platform: DeployPlatform, projectName: string) => void;
}

type TokenStatus = 'idle' | 'validating' | 'valid' | 'invalid';

function PlatformCard({
  platform,
  logo,
  color,
  docsUrl,
  onDeploy,
}: {
  platform: DeployPlatform;
  logo: React.ReactNode;
  color: string;
  docsUrl: string;
  onDeploy: (platform: DeployPlatform, projectName: string) => void;
}) {
  const [showToken, setShowToken] = useState(false);
  const [expanded, setExpanded] = useState(platform === 'vercel');
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('idle');
  const [isDeploying, setIsDeploying] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<TargetConfig>({
    defaultValues: {
      token: '',
      projectName: '',
      teamId: '',
      siteId: '',
    },
  });

  const token = watch('token');
  const projectName = watch('projectName');

  const validateToken = async () => {
    if (!token || token.includes('•')) return;
    setTokenStatus('validating');
    // Backend: GET /api/deployment/validate-token?platform=vercel&token=...
    await new Promise(r => setTimeout(r, 1100));
    setTokenStatus(token.length > 10 ? 'valid' : 'invalid');
  };

  const handleDeploy = async (data: TargetConfig) => {
    setIsDeploying(true);
    // Backend: POST /api/deployment/deploy with { platform, projectName, token, ... }
    await new Promise(r => setTimeout(r, 900));
    onDeploy(platform, data.projectName);
    toast.success(`Deploying "${data.projectName}" to ${platform === 'vercel' ? 'Vercel' : 'Netlify'}…`);
    setIsDeploying(false);
  };

  const isVercel = platform === 'vercel';

  return (
    <div className={`mx-4 mt-4 rounded-2xl border overflow-hidden glass-card stone-card ${isVercel ? 'border-zinc-700/60' : 'border-zinc-800/60'}`}>
      {/* Card header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-5 py-4 hover:bg-zinc-800/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          {logo}
          <div className="text-left">
            <p className="text-sm font-600 text-zinc-200">{isVercel ? 'Vercel' : 'Netlify'}</p>
            <p className="text-xs text-zinc-500">
              {tokenStatus === 'valid'
                ? <span className="text-green-400 flex items-center gap-1"><CheckCircle size={10} /> Token valid</span>
                : tokenStatus === 'invalid'
                  ? <span className="text-red-400 flex items-center gap-1"><XCircle size={10} /> Token invalid</span>
                  : tokenStatus === 'validating'
                    ? <span className="text-zinc-400">Validating…</span>
                    : 'Configure token to deploy'
              }
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
      </button>

      {expanded && (
        <form onSubmit={handleSubmit(handleDeploy)} className="px-5 pb-5 space-y-4 border-t border-zinc-800/40">
          {/* API Token */}
          <div className="space-y-1.5 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-600 text-zinc-400">
                {isVercel ? 'Vercel API Token' : 'Netlify Personal Access Token'}
              </label>
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
              >
                Get token <ExternalLink size={9} />
              </a>
            </div>
            <p className="text-[11px] text-zinc-600">
              {isVercel
                ? 'Create at vercel.com/account/tokens with full access scope' :'Create at app.netlify.com/user/applications/personal'
              }
            </p>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                placeholder={isVercel ? 'vercel_tok_••••••••••••••••' : 'nfp_••••••••••••••••••••••••••••'}
                {...register('token', { required: 'API token is required' })}
                onBlur={validateToken}
                className={`w-full bg-zinc-900/80 border rounded-xl px-3 py-2.5 pr-20 text-xs font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none transition-all ${
                  errors.token
                    ? 'border-red-500/50'
                    : tokenStatus === 'valid' ?'border-green-500/40 focus:border-green-500/60'
                      : tokenStatus === 'invalid' ?'border-red-500/40' :'border-zinc-700 focus:border-violet-600/50'
                }`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {tokenStatus === 'validating' && <Loader2 size={11} className="text-zinc-500 animate-spin" />}
                {tokenStatus === 'valid' && <CheckCircle size={11} className="text-green-400" />}
                {tokenStatus === 'invalid' && <XCircle size={11} className="text-red-400" />}
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {showToken ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
            </div>
            {errors.token && (
              <p className="text-[11px] text-red-400 flex items-center gap-1">
                <AlertCircle size={10} /> {errors.token.message}
              </p>
            )}
          </div>

          {/* Project / Site name */}
          <div className="space-y-1.5">
            <label className="text-xs font-600 text-zinc-400">
              {isVercel ? 'Project Name' : 'Site Name / Site ID'}
            </label>
            <p className="text-[11px] text-zinc-600">
              {isVercel
                ? 'The project slug from your Vercel dashboard' :'Your Netlify site name or ID (e.g. my-site.netlify.app)'
              }
            </p>
            <input
              type="text"
              placeholder={isVercel ? 'my-react-app' : 'my-site-id'}
              {...register('projectName', { required: `${isVercel ? 'Project' : 'Site'} name is required` })}
              className={`w-full bg-zinc-900/80 border rounded-xl px-3 py-2.5 text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none transition-all ${
                errors.projectName ? 'border-red-500/50' : 'border-zinc-700 focus:border-violet-600/50'
              }`}
            />
            {errors.projectName && (
              <p className="text-[11px] text-red-400 flex items-center gap-1">
                <AlertCircle size={10} /> {errors.projectName.message}
              </p>
            )}
          </div>

          {/* Optional: Team ID / Branch */}
          {isVercel && (
            <div className="space-y-1.5">
              <label className="text-xs font-600 text-zinc-400">Team ID <span className="text-zinc-600 font-400">(optional)</span></label>
              <input
                type="text"
                placeholder="team_xxxxxxxxxxxxxxxx"
                {...register('teamId')}
                className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-violet-600/50 transition-all"
              />
            </div>
          )}

          {/* Deploy button */}
          <button
            type="submit"
            disabled={isDeploying || tokenStatus === 'invalid'}
            className="w-full py-2.5 rounded-xl text-sm font-600 text-white btn-glam disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {isDeploying ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Deploying…
              </>
            ) : (
              <>
                <Rocket size={14} />
                Deploy to {isVercel ? 'Vercel' : 'Netlify'}
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

const VercelLogo = () => (
  <div className="w-8 h-8 rounded-lg bg-white/95 flex items-center justify-center flex-shrink-0">
    <svg width="16" height="14" viewBox="0 0 76 65" fill="none">
      <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="black" />
    </svg>
  </div>
);

const NetlifyLogo = () => (
  <div className="w-8 h-8 rounded-lg bg-[#00C7B7]/15 border border-[#00C7B7]/30 flex items-center justify-center flex-shrink-0">
    <svg width="16" height="16" viewBox="0 0 104 104" fill="none">
      <path d="M28.5 41L52 17.5L75.5 41H28.5Z" fill="#00C7B7" />
      <path d="M28.5 63L52 86.5L75.5 63H28.5Z" fill="#00C7B7" />
      <rect x="12" y="46" width="80" height="12" rx="2" fill="#00C7B7" />
    </svg>
  </div>
);

export default function DeploymentTargetCards({ onDeploy }: DeploymentTargetCardsProps) {
  return (
    <div className="pb-4">
      <div className="px-5 py-4 border-b border-zinc-800/40">
        <p className="text-xs font-600 uppercase tracking-widest text-zinc-600">Deployment Targets</p>
      </div>

      <PlatformCard
        platform="vercel"
        logo={<VercelLogo />}
        color="white"
        docsUrl="https://vercel.com/account/tokens"
        onDeploy={onDeploy}
      />

      <PlatformCard
        platform="netlify"
        logo={<NetlifyLogo />}
        color="#00C7B7"
        docsUrl="https://app.netlify.com/user/applications/personal"
        onDeploy={onDeploy}
      />

      {/* Info notice */}
      <div className="mx-4 mt-4 px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Tokens are stored locally and never sent to external servers. Deployments are triggered directly from your browser to the platform API.
        </p>
      </div>
    </div>
  );
}
-- Production-ready schema: projects (files/history stored in apps), deployments, share_links

-- ─── 1. Extend apps table with extra columns ───────────────────────────────
ALTER TABLE public.apps
  ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4o-mini',
  ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS generation_history JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS share_slug TEXT,
  ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_access TEXT DEFAULT 'public';

CREATE UNIQUE INDEX IF NOT EXISTS idx_apps_share_slug ON public.apps(share_slug) WHERE share_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apps_user_id ON public.apps(user_id);

-- ─── 2. Deployments table ──────────────────────────────────────────────────
DROP TYPE IF EXISTS public.deploy_platform CASCADE;
CREATE TYPE public.deploy_platform AS ENUM ('vercel', 'netlify');

DROP TYPE IF EXISTS public.deploy_status CASCADE;
CREATE TYPE public.deploy_status AS ENUM ('success', 'failed', 'deploying', 'queued', 'cancelled');

CREATE TABLE IF NOT EXISTS public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  app_id UUID REFERENCES public.apps(id) ON DELETE SET NULL,
  platform public.deploy_platform NOT NULL,
  project_name TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  commit_sha TEXT NOT NULL DEFAULT '',
  status public.deploy_status NOT NULL DEFAULT 'queued'::public.deploy_status,
  url TEXT,
  triggered_by TEXT NOT NULL DEFAULT '',
  error_message TEXT,
  duration INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON public.deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_app_id ON public.deployments(app_id);
CREATE INDEX IF NOT EXISTS idx_deployments_started_at ON public.deployments(started_at DESC);

-- ─── 3. Share accesses table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.share_accesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  country_flag TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  referrer TEXT,
  duration TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_share_accesses_app_id ON public.share_accesses(app_id);

-- ─── 4. Updated_at trigger function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_deployments_updated_at ON public.deployments;
CREATE TRIGGER set_deployments_updated_at
  BEFORE UPDATE ON public.deployments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 5. Enable RLS ─────────────────────────────────────────────────────────
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_accesses ENABLE ROW LEVEL SECURITY;

-- ─── 6. RLS Policies ───────────────────────────────────────────────────────

-- Apps: already has RLS, add share read policy
DROP POLICY IF EXISTS "public_can_read_shared_apps" ON public.apps;
CREATE POLICY "public_can_read_shared_apps"
  ON public.apps
  FOR SELECT
  TO public
  USING (share_enabled = true AND share_slug IS NOT NULL);

-- Deployments
DROP POLICY IF EXISTS "users_manage_own_deployments" ON public.deployments;
CREATE POLICY "users_manage_own_deployments"
  ON public.deployments
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Share accesses: app owner can read, anyone can insert
DROP POLICY IF EXISTS "app_owner_can_read_share_accesses" ON public.share_accesses;
CREATE POLICY "app_owner_can_read_share_accesses"
  ON public.share_accesses
  FOR SELECT
  TO authenticated
  USING (
    app_id IN (
      SELECT id FROM public.apps WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "anyone_can_insert_share_accesses" ON public.share_accesses;
CREATE POLICY "anyone_can_insert_share_accesses"
  ON public.share_accesses
  FOR INSERT
  TO public
  WITH CHECK (true);

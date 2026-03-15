-- ============================================================
-- Migration: Project Memory & Team Collaboration
-- Timestamp: 20260315000002
-- ============================================================

-- ============================================================
-- 1. TYPES
-- ============================================================
DROP TYPE IF EXISTS public.collab_role CASCADE;
CREATE TYPE public.collab_role AS ENUM ('owner', 'editor', 'viewer');

-- ============================================================
-- 2. PROJECT MEMORY TABLE
-- Stores the living project brain: brand tokens, component
-- patterns, preferred libraries, and past decisions.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_memory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id        UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  -- Brand & design tokens
  brand_colors  JSONB NOT NULL DEFAULT '[]'::jsonb,
  typography    JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Tech preferences
  preferred_libraries JSONB NOT NULL DEFAULT '[]'::jsonb,
  component_patterns  JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Free-form decisions log
  decisions     JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Custom context injected verbatim into every prompt
  custom_context TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (app_id)
);

CREATE INDEX IF NOT EXISTS idx_project_memory_app_id ON public.project_memory(app_id);
CREATE INDEX IF NOT EXISTS idx_project_memory_user_id ON public.project_memory(user_id);

-- ============================================================
-- 3. PROJECT COLLABORATORS TABLE
-- Role-based access: owner / editor / viewer
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id     UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role       public.collab_role NOT NULL DEFAULT 'viewer'::public.collab_role,
  invited_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (app_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_collaborators_app_id ON public.project_collaborators(app_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user_id ON public.project_collaborators(user_id);

-- ============================================================
-- 4. COMPONENT COMMENTS TABLE
-- Threaded comments anchored to a file path
-- ============================================================
CREATE TABLE IF NOT EXISTS public.component_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL,
  resolved    BOOLEAN NOT NULL DEFAULT false,
  parent_id   UUID REFERENCES public.component_comments(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_component_comments_app_id ON public.component_comments(app_id);
CREATE INDEX IF NOT EXISTS idx_component_comments_user_id ON public.component_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_component_comments_file_path ON public.component_comments(app_id, file_path);

-- ============================================================
-- 5. FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Helper: check if user can access an app (owner or collaborator)
CREATE OR REPLACE FUNCTION public.can_access_app(app_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.apps WHERE id = app_uuid AND user_id = auth.uid()
    UNION ALL
    SELECT 1 FROM public.project_collaborators
    WHERE app_id = app_uuid AND user_id = auth.uid()
  );
$$;

-- Helper: check if user can write to an app (owner or editor)
CREATE OR REPLACE FUNCTION public.can_write_app(app_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.apps WHERE id = app_uuid AND user_id = auth.uid()
    UNION ALL
    SELECT 1 FROM public.project_collaborators
    WHERE app_id = app_uuid AND user_id = auth.uid()
    AND role IN ('owner'::public.collab_role, 'editor'::public.collab_role)
  );
$$;

-- ============================================================
-- 6. ENABLE RLS
-- ============================================================
ALTER TABLE public.project_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. RLS POLICIES — project_memory
-- ============================================================
DROP POLICY IF EXISTS "pm_select" ON public.project_memory;
CREATE POLICY "pm_select"
ON public.project_memory FOR SELECT TO authenticated
USING (public.can_access_app(app_id));

DROP POLICY IF EXISTS "pm_insert" ON public.project_memory;
CREATE POLICY "pm_insert"
ON public.project_memory FOR INSERT TO authenticated
WITH CHECK (public.can_write_app(app_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS "pm_update" ON public.project_memory;
CREATE POLICY "pm_update"
ON public.project_memory FOR UPDATE TO authenticated
USING (public.can_write_app(app_id))
WITH CHECK (public.can_write_app(app_id));

DROP POLICY IF EXISTS "pm_delete" ON public.project_memory;
CREATE POLICY "pm_delete"
ON public.project_memory FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- 8. RLS POLICIES — project_collaborators
-- ============================================================
DROP POLICY IF EXISTS "pc_select" ON public.project_collaborators;
CREATE POLICY "pc_select"
ON public.project_collaborators FOR SELECT TO authenticated
USING (public.can_access_app(app_id));

DROP POLICY IF EXISTS "pc_insert" ON public.project_collaborators;
CREATE POLICY "pc_insert"
ON public.project_collaborators FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.apps WHERE id = app_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "pc_update" ON public.project_collaborators;
CREATE POLICY "pc_update"
ON public.project_collaborators FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.apps WHERE id = app_id AND user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.apps WHERE id = app_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "pc_delete" ON public.project_collaborators;
CREATE POLICY "pc_delete"
ON public.project_collaborators FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.apps WHERE id = app_id AND user_id = auth.uid())
);

-- ============================================================
-- 9. RLS POLICIES — component_comments
-- ============================================================
DROP POLICY IF EXISTS "cc_select" ON public.component_comments;
CREATE POLICY "cc_select"
ON public.component_comments FOR SELECT TO authenticated
USING (public.can_access_app(app_id));

DROP POLICY IF EXISTS "cc_insert" ON public.component_comments;
CREATE POLICY "cc_insert"
ON public.component_comments FOR INSERT TO authenticated
WITH CHECK (public.can_access_app(app_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS "cc_update" ON public.component_comments;
CREATE POLICY "cc_update"
ON public.component_comments FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "cc_delete" ON public.component_comments;
CREATE POLICY "cc_delete"
ON public.component_comments FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- 10. TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS set_project_memory_updated_at ON public.project_memory;
CREATE TRIGGER set_project_memory_updated_at
  BEFORE UPDATE ON public.project_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_component_comments_updated_at ON public.component_comments;
CREATE TRIGGER set_component_comments_updated_at
  BEFORE UPDATE ON public.component_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

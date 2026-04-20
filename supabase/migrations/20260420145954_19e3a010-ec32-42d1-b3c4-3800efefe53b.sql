-- ============== user_github_tokens ==============
CREATE TABLE public.user_github_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  github_login TEXT NOT NULL,
  github_user_id BIGINT,
  github_avatar_url TEXT,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_github_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own github token"
  ON public.user_github_tokens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own github token"
  ON public.user_github_tokens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own github token"
  ON public.user_github_tokens FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own github token"
  ON public.user_github_tokens FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============== project_github_repos ==============
CREATE TABLE public.project_github_repos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  repo_id BIGINT,
  html_url TEXT,
  is_private BOOLEAN NOT NULL DEFAULT true,
  auto_push BOOLEAN NOT NULL DEFAULT true,
  last_pushed_sha TEXT,
  last_pushed_at TIMESTAMPTZ,
  last_pushed_version_id UUID,
  last_push_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_github_repos_user ON public.project_github_repos(user_id);

ALTER TABLE public.project_github_repos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own repo links"
  ON public.project_github_repos FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own repo links"
  ON public.project_github_repos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own repo links"
  ON public.project_github_repos FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own repo links"
  ON public.project_github_repos FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============== updated_at triggers ==============
CREATE TRIGGER trg_user_github_tokens_updated
  BEFORE UPDATE ON public.user_github_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_project_github_repos_updated
  BEFORE UPDATE ON public.project_github_repos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabla: project_knowledge (instrucciones persistentes por proyecto)
CREATE TABLE public.project_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

ALTER TABLE public.project_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own knowledge"
  ON public.project_knowledge FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own knowledge"
  ON public.project_knowledge FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own knowledge"
  ON public.project_knowledge FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own knowledge"
  ON public.project_knowledge FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_project_knowledge_updated_at
  BEFORE UPDATE ON public.project_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_project_knowledge_project ON public.project_knowledge(project_id);

-- Tabla: project_deployments (historial de deploys a producción)
CREATE TYPE public.deployment_status AS ENUM ('pending', 'building', 'live', 'failed');
CREATE TYPE public.deployment_provider AS ENUM ('netlify', 'vercel', 'custom');

CREATE TABLE public.project_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider public.deployment_provider NOT NULL DEFAULT 'netlify',
  url TEXT,
  site_id TEXT,
  status public.deployment_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deployments"
  ON public.project_deployments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own deployments"
  ON public.project_deployments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own deployments"
  ON public.project_deployments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own deployments"
  ON public.project_deployments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_project_deployments_updated_at
  BEFORE UPDATE ON public.project_deployments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_project_deployments_project ON public.project_deployments(project_id);
CREATE INDEX idx_project_deployments_user ON public.project_deployments(user_id);
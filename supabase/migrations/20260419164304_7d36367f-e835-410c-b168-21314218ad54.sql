-- Tabla de shares públicos de proyectos
CREATE TABLE public.project_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  -- Token público único, urlsafe (32 chars hex). El cliente nunca lo regenera; lo lee.
  token text NOT NULL UNIQUE,
  -- Si false, el share está pausado (la edge function devuelve 404)
  enabled boolean NOT NULL DEFAULT true,
  -- Versión "fijada"; si NULL, la edge function sirve la última versión
  pinned_version_id uuid REFERENCES public.project_versions(id) ON DELETE SET NULL,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_shares_token ON public.project_shares(token);
CREATE INDEX idx_project_shares_project ON public.project_shares(project_id);
CREATE INDEX idx_project_shares_user ON public.project_shares(user_id);

-- Solo un share activo por proyecto a la vez (para mantener URL estable)
CREATE UNIQUE INDEX idx_project_shares_unique_per_project ON public.project_shares(project_id);

ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;

-- Owner ve sus propios shares
CREATE POLICY "Users can view own shares"
  ON public.project_shares
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Owner crea shares solo para sus propios proyectos
CREATE POLICY "Users can create shares for own projects"
  ON public.project_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Owner actualiza/borra sus propios shares
CREATE POLICY "Users can update own shares"
  ON public.project_shares
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own shares"
  ON public.project_shares
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger updated_at
CREATE TRIGGER update_project_shares_updated_at
  BEFORE UPDATE ON public.project_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RPC para incrementar view_count atómicamente desde la edge function pública
CREATE OR REPLACE FUNCTION public.increment_share_view(_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.project_shares
  SET view_count = view_count + 1,
      last_viewed_at = now()
  WHERE token = _token AND enabled = true;
$$;

REVOKE ALL ON FUNCTION public.increment_share_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_share_view(text) TO anon, authenticated, service_role;
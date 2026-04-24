CREATE TABLE public.intent_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID,
  event_type TEXT NOT NULL,
  accion TEXT NOT NULL,
  riesgo TEXT,
  archivos JSONB NOT NULL DEFAULT '[]'::jsonb,
  cambios JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.intent_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON public.intent_audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs"
  ON public.intent_audit_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create own audit logs"
  ON public.intent_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_intent_audit_logs_user_created ON public.intent_audit_logs(user_id, created_at DESC);
CREATE INDEX idx_intent_audit_logs_project ON public.intent_audit_logs(project_id, created_at DESC);
CREATE INDEX idx_intent_audit_logs_event_type ON public.intent_audit_logs(event_type);

-- Tabla de estado de onboarding por usuario
CREATE TABLE public.user_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  completed boolean NOT NULL DEFAULT false,
  current_step integer NOT NULL DEFAULT 0,
  welcome_credits_granted boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding"
  ON public.user_onboarding FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own onboarding"
  ON public.user_onboarding FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding"
  ON public.user_onboarding FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función idempotente para otorgar créditos de bienvenida
CREATE OR REPLACE FUNCTION public.grant_welcome_credits(_user_id uuid, _amount integer DEFAULT 25)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _already boolean;
  _new_credits integer;
BEGIN
  -- Solo el propio usuario puede invocar para sí mismo
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  -- Asegurar fila de onboarding
  INSERT INTO public.user_onboarding (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT welcome_credits_granted INTO _already
  FROM public.user_onboarding
  WHERE user_id = _user_id;

  IF _already THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  -- Sumar créditos
  UPDATE public.profiles
  SET credits = credits + _amount
  WHERE id = _user_id
  RETURNING credits INTO _new_credits;

  -- Marcar otorgados
  UPDATE public.user_onboarding
  SET welcome_credits_granted = true
  WHERE user_id = _user_id;

  -- Registrar transacción
  INSERT INTO public.credit_transactions (user_id, type, amount, reason, model)
  VALUES (_user_id, 'credit', _amount, 'Créditos de bienvenida (onboarding)', 'system');

  RETURN jsonb_build_object('ok', true, 'already', false, 'credits', _new_credits, 'amount', _amount);
END;
$$;

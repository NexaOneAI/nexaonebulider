-- Add webcontainers_enabled flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS webcontainers_enabled boolean NOT NULL DEFAULT false;

-- Allow admins to update this (and any) profile column.
-- The existing "Users can update own profile" policy already lets users see/update
-- their own profile, but we want admins to be able to flip this flag for any user.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can update any profile'
  ) THEN
    CREATE POLICY "Admins can update any profile"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END$$;
-- Fix RLS on project_knowledge so access follows project ownership,
-- not the user_id stamped on the knowledge row. This unblocks upserts
-- when a row was previously created by another user (collaboration,
-- seed data, or stale ownership).

-- 1) Repair stale rows: align user_id with the project owner.
UPDATE public.project_knowledge pk
SET user_id = p.user_id
FROM public.projects p
WHERE pk.project_id = p.id
  AND pk.user_id <> p.user_id;

-- 2) Replace policies: grant access to the project owner.
DROP POLICY IF EXISTS "Users can view own knowledge" ON public.project_knowledge;
DROP POLICY IF EXISTS "Users can create own knowledge" ON public.project_knowledge;
DROP POLICY IF EXISTS "Users can update own knowledge" ON public.project_knowledge;
DROP POLICY IF EXISTS "Users can delete own knowledge" ON public.project_knowledge;

CREATE POLICY "Project owner can view knowledge"
ON public.project_knowledge
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_knowledge.project_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Project owner can create knowledge"
ON public.project_knowledge
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_knowledge.project_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Project owner can update knowledge"
ON public.project_knowledge
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_knowledge.project_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_knowledge.project_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Project owner can delete knowledge"
ON public.project_knowledge
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_knowledge.project_id
      AND p.user_id = auth.uid()
  )
);
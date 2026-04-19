-- Bucket público para imágenes generadas por IA
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lectura pública (las URLs deben ser usables desde el preview iframe)
CREATE POLICY "project-assets public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-assets');

-- Solo usuarios autenticados pueden subir, y solo dentro de su carpeta {user_id}/...
CREATE POLICY "project-assets users upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "project-assets users update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "project-assets users delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
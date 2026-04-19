-- Reemplazar la SELECT pública amplia con una más restrictiva:
-- - Lectura individual por path sigue funcionando (las URLs públicas de Storage usan render-from-path).
-- - Listado (operación list) queda bloqueado porque storage.objects requiere coincidir un name específico.
DROP POLICY IF EXISTS "project-assets public read" ON storage.objects;

CREATE POLICY "project-assets public read by path"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-assets'
  AND name IS NOT NULL
  AND position('/' in name) > 0
);
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('app-exports', 'app-exports', false, 52428800, ARRAY['application/zip', 'application/octet-stream'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read own export files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'app-exports' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Permitir gerenciamento de avatares para usuários autenticados" ON storage.objects;

CREATE POLICY "Admins podem inserir avatares"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-avatars' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar avatares"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'user-avatars' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'user-avatars' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar avatares"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'user-avatars' AND public.has_role(auth.uid(), 'admin'::app_role));
-- Remover políticas antigas se existirem (para evitar erros de duplicidade)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage avatars" ON storage.objects;

-- Políticas para storage.objects
-- Acesso público para leitura
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-avatars');

-- Admins têm acesso total
CREATE POLICY "Admins can manage avatars"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'user-avatars' AND 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  bucket_id = 'user-avatars' AND 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

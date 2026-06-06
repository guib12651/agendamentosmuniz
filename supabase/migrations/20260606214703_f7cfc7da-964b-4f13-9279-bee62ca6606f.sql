-- Remover políticas restritivas antigas se necessário ou adicionar uma nova mais abrangente
DROP POLICY IF EXISTS "Admins can manage avatars" ON storage.objects;
CREATE POLICY "Permitir gerenciamento de avatares para usuários autenticados"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'user-avatars')
WITH CHECK (bucket_id = 'user-avatars');

-- Garantir acesso de leitura para todos (incluindo anônimos, caso necessário para o Painel TV)
DROP POLICY IF EXISTS "Acesso público para leitura de avatares" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Acesso público para leitura de avatares"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-avatars');

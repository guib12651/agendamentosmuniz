-- Adicionar coluna avatar_url na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Criar bucket para avatares se não existir (via SQL de inserção pois a ferramenta storage_create_bucket é assíncrona e queremos garantir ordem aqui se possível, mas seguindo a recomendação de usar a ferramenta, faremos as políticas aqui e chamaremos a ferramenta depois)
-- Na verdade, a instrução diz para NÃO usar supabase--migration para criar buckets. 
-- Vou apenas criar as políticas aqui assumindo que o bucket 'user-avatars' será criado.

-- Habilitar RLS no storage.objects se ainda não estiver (geralmente já está)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Políticas para o bucket 'user-avatars'
-- 1. Permitir visualização pública
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'user-avatars' );

-- 2. Permitir que administradores gerenciem todos os avatares
CREATE POLICY "Admins can manage avatars"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'user-avatars' AND 
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
)
WITH CHECK (
  bucket_id = 'user-avatars' AND 
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);

-- 3. (Opcional) Permitir que usuários gerenciem seu próprio avatar se desejado no futuro
-- Para agora, a regra é que ADMIN controla.

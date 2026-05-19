-- Remover políticas existentes se houver (para garantir idempotência)
DROP POLICY IF EXISTS "Todos podem ver bloqueios" ON public.time_blocks;
DROP POLICY IF EXISTS "Apenas admins podem inserir bloqueios" ON public.time_blocks;
DROP POLICY IF EXISTS "Apenas admins podem atualizar bloqueios" ON public.time_blocks;
DROP POLICY IF EXISTS "Apenas admins podem deletar bloqueios" ON public.time_blocks;

-- Habilitar RLS se ainda não estiver habilitado
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura (todos os usuários autenticados)
CREATE POLICY "Todos podem ver bloqueios" 
ON public.time_blocks 
FOR SELECT 
TO authenticated 
USING (true);

-- Criar política de inserção (apenas admin)
CREATE POLICY "Apenas admins podem inserir bloqueios" 
ON public.time_blocks 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Criar política de atualização (apenas admin)
CREATE POLICY "Apenas admins podem atualizar bloqueios" 
ON public.time_blocks 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Criar política de exclusão (apenas admin)
CREATE POLICY "Apenas admins podem deletar bloqueios" 
ON public.time_blocks 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
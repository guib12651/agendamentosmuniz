-- Adicionar coluna 'archived' à tabela 'meetings' se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'archived') THEN
        ALTER TABLE public.meetings ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Garantir que o status 'venda_concluida' seja tratado corretamente em políticas se necessário, 
-- mas aqui o foco é o campo booleano para filtragem visual.

-- Criar índice para performance de filtragem
CREATE INDEX IF NOT EXISTS idx_meetings_archived ON public.meetings(archived);

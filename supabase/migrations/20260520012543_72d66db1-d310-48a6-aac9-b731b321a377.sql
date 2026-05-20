-- Create calls table
CREATE TABLE IF NOT EXISTS public.calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_name TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    call_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    result TEXT NOT NULL, -- Ex: 'Não atendeu', 'Sem interesse', 'Agendado', 'Retornar depois'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Policies for calls
CREATE POLICY "Users can view their own calls" 
    ON public.calls FOR SELECT 
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Users can insert their own calls" 
    ON public.calls FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Check if city column exists in meetings, add if not
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'city') THEN
        ALTER TABLE public.meetings ADD COLUMN city TEXT;
    END IF;
END $$;

-- Check if trigger column exists in meetings (it does as interest/credit type)
-- The user mentioned "Tipo de crédito/interesse" - in our system it is 'trigger'

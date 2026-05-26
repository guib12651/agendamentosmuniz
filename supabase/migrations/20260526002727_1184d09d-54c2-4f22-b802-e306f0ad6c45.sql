-- Create a table for daily calls registration
CREATE TABLE public.daily_calls (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    amount INTEGER NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.daily_calls ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own daily calls" 
ON public.daily_calls 
FOR SELECT 
USING (auth.uid() = user_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can insert their own daily calls" 
ON public.daily_calls 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily calls" 
ON public.daily_calls 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily calls" 
ON public.daily_calls 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add foreign key relationship to profiles if needed (though user_id references auth.users, 
-- in this project profiles also uses the same IDs)
ALTER TABLE public.daily_calls ADD CONSTRAINT daily_calls_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);

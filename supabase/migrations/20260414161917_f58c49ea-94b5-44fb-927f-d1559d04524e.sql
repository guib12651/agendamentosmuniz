-- Create meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  pre_seller TEXT NOT NULL,
  consultant TEXT NOT NULL,
  down_payment TEXT DEFAULT '',
  installment TEXT DEFAULT '',
  restriction TEXT NOT NULL DEFAULT 'clean',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time_blocks table
CREATE TABLE public.time_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required)
CREATE POLICY "Anyone can view meetings" ON public.meetings FOR SELECT USING (true);
CREATE POLICY "Anyone can create meetings" ON public.meetings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update meetings" ON public.meetings FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete meetings" ON public.meetings FOR DELETE USING (true);

CREATE POLICY "Anyone can view blocks" ON public.time_blocks FOR SELECT USING (true);
CREATE POLICY "Anyone can create blocks" ON public.time_blocks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update blocks" ON public.time_blocks FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete blocks" ON public.time_blocks FOR DELETE USING (true);
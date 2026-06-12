CREATE TABLE public.production_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  production_date DATE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price > 0),
  total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_sales TO authenticated;
GRANT ALL ON public.production_sales TO service_role;

ALTER TABLE public.production_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own production sales" ON public.production_sales
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all production sales" ON public.production_sales
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

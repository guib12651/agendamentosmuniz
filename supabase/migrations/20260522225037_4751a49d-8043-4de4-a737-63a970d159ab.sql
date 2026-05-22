-- Make calls.user_id nullable to allow preserving data without a user
ALTER TABLE public.calls ALTER COLUMN user_id DROP NOT NULL;

-- Update meetings foreign key to SET NULL
ALTER TABLE public.meetings 
DROP CONSTRAINT IF EXISTS meetings_user_id_fkey,
ADD CONSTRAINT meetings_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- Update calls foreign key to SET NULL
ALTER TABLE public.calls 
DROP CONSTRAINT IF EXISTS calls_user_id_fkey,
ADD CONSTRAINT calls_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- Update sales_funnel_distribution foreign key to SET NULL
ALTER TABLE public.sales_funnel_distribution 
DROP CONSTRAINT IF EXISTS sales_funnel_distribution_user_id_fkey,
ADD CONSTRAINT sales_funnel_distribution_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

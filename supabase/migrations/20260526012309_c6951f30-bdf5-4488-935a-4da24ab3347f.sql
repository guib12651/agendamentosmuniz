-- Add company_name to quotas
ALTER TABLE public.quotas ADD COLUMN company_name TEXT;

-- Add company_name to bids
ALTER TABLE public.bids ADD COLUMN company_name TEXT;

-- Try to populate existing records
UPDATE public.quotas q
SET company_name = c.name
FROM public.companies c
WHERE q.company_id = c.id;

UPDATE public.bids b
SET company_name = c.name
FROM public.companies c
WHERE b.company_id = c.id;

-- Make company_id optional for future records
ALTER TABLE public.quotas ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE public.bids ALTER COLUMN company_id DROP NOT NULL;

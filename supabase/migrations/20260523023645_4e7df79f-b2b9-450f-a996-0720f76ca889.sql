-- Update operational_leads
ALTER TABLE public.operational_leads DROP CONSTRAINT operational_leads_created_by_fkey;
ALTER TABLE public.operational_leads 
ADD CONSTRAINT operational_leads_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- Update leads_distribution
ALTER TABLE public.leads_distribution DROP CONSTRAINT leads_distribution_created_by_fkey;
ALTER TABLE public.leads_distribution DROP CONSTRAINT leads_distribution_user_id_fkey;

ALTER TABLE public.leads_distribution 
ADD CONSTRAINT leads_distribution_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.leads_distribution 
ADD CONSTRAINT leads_distribution_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id);

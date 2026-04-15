CREATE OR REPLACE FUNCTION public.get_occupied_slots(_date date)
RETURNS TABLE(slot_time time, lead_name text, meeting_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.time, m.lead_name, m.id
  FROM public.meetings m
  WHERE m.date = _date
$$;
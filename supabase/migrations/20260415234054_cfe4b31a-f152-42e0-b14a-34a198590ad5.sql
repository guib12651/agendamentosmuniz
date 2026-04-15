
CREATE OR REPLACE FUNCTION public.check_delete_meeting_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can always delete
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN OLD;
  END IF;

  -- Pre-sellers: block if meeting is within 30 minutes
  IF (OLD.date::timestamp + OLD.time::interval) <= (now() AT TIME ZONE 'America/Sao_Paulo' + interval '30 minutes') THEN
    RAISE EXCEPTION 'Não é possível excluir reuniões com menos de 30 minutos de antecedência.';
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER enforce_delete_meeting_time
BEFORE DELETE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.check_delete_meeting_time();

CREATE OR REPLACE FUNCTION public.check_max_meetings_per_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  existing_count integer;
BEGIN
  SELECT COUNT(*)
  INTO existing_count
  FROM public.meetings
  WHERE date = NEW.date
    AND time = NEW.time
    AND id <> COALESCE(NEW.id, gen_random_uuid());

  IF existing_count >= 2 THEN
    RAISE EXCEPTION 'HORARIO_LOTADO'
      USING ERRCODE = 'P0001',
            DETAIL = 'Este horário já possui o número máximo de reuniões.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_max_meetings_per_slot ON public.meetings;

CREATE TRIGGER enforce_max_meetings_per_slot
BEFORE INSERT OR UPDATE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.check_max_meetings_per_slot();
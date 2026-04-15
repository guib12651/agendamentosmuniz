
CREATE OR REPLACE FUNCTION public.check_max_meetings_per_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.meetings WHERE date = NEW.date AND time = NEW.time) >= 2 THEN
    RAISE EXCEPTION 'Maximum of 2 meetings per time slot reached for % at %', NEW.date, NEW.time;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_max_meetings_per_slot
BEFORE INSERT ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.check_max_meetings_per_slot();

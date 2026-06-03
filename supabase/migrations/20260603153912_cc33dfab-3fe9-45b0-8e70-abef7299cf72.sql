-- First, sync existing data
-- Update existing user_roles entries to match profiles.role
UPDATE public.user_roles ur
SET role = p.role
FROM public.profiles p
WHERE ur.user_id = p.id
AND ur.role != p.role;

-- Insert missing user_roles entries from profiles
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.id IS NULL;

-- Create a trigger function to sync roles
CREATE OR REPLACE FUNCTION public.handle_profile_role_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- If role has changed
    IF (TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role) THEN
        -- Update the role in user_roles
        -- We assume one role per user based on the profiles table design
        UPDATE public.user_roles
        SET role = NEW.role
        WHERE user_id = NEW.id;
        
        -- If no entry existed (shouldn't happen with our sync above, but for safety)
        IF NOT FOUND THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, NEW.role);
        END IF;
    ELSIF (TG_OP = 'INSERT') THEN
        -- For new profiles, create the user_role entry
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, NEW.role)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;
CREATE TRIGGER on_profile_role_change
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_profile_role_sync();

-- Also ensure user_roles doesn't have duplicate roles for the same user if they are supposed to have only one
-- This is a bit tricky if we want to support multiple roles later, but the app seems to expect one.
-- Given the current profiles table only has one 'role' column, we should probably enforce it in user_roles too.
-- But let's stick to the trigger for now which will handle the single-role sync as defined in the UI.

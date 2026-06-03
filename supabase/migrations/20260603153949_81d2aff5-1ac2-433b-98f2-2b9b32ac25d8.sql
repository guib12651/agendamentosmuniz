CREATE OR REPLACE FUNCTION public.handle_profile_role_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- If role has changed
    IF (TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role) THEN
        -- Update the role in user_roles
        UPDATE public.user_roles
        SET role = NEW.role
        WHERE user_id = NEW.id;
        
        -- If no entry existed
        IF NOT FOUND THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, NEW.role);
        END IF;
    ELSIF (TG_OP = 'INSERT') THEN
        -- For new profiles, create the user_role entry
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, NEW.role)
        ON CONFLICT (user_id, role) DO UPDATE SET role = EXCLUDED.role;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

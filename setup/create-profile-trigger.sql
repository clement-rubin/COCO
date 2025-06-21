-- Function to automatically create a user profile when a new user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  display_name_value TEXT;
  email_username TEXT;
BEGIN
  -- Extract username from email
  email_username := split_part(NEW.email, '@', 1);
  
  -- Get display name from metadata, fallback to email username
  display_name_value := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    email_username,
    'Utilisateur'
  );
  
  -- Make sure display_name meets size requirements (2-30 chars)
  IF length(display_name_value) < 2 THEN
    display_name_value := 'Utilisateur';
  ELSIF length(display_name_value) > 30 THEN
    display_name_value := substring(display_name_value, 1, 30);
  END IF;
  
  -- Create the profile with proper error handling
  BEGIN
    INSERT INTO public.profiles (
      user_id,
      display_name,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      display_name_value,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the transaction
      -- This allows user creation even if profile creation fails
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that runs when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- This function will update the user's profile when they update their email
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET updated_at = now()
  WHERE user_id = NEW.id
    AND OLD.email <> NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email <> NEW.email)
  EXECUTE PROCEDURE public.handle_user_update();

-- Setup Row Level Security for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table to control data access
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (NOT is_private OR auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profiles" ON public.profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Add database comments
COMMENT ON TABLE public.profiles IS 'User profile information that extends auth.users';
COMMENT ON COLUMN public.profiles.user_id IS 'References the auth.users table';
COMMENT ON COLUMN public.profiles.display_name IS 'User-friendly display name';
COMMENT ON COLUMN public.profiles.is_private IS 'Controls profile visibility';
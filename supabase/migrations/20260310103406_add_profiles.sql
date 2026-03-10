-- Create profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  search_limit_used int NOT NULL DEFAULT 0,
  search_limit_remaining int NOT NULL DEFAULT 10,
  search_limit_reset timestamp with time zone,
  repo_limit_used int NOT NULL DEFAULT 0,
  repo_limit_remaining int NOT NULL DEFAULT 5000,
  repo_limit_reset timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC for updating Search API rate limit (Edge Function will call this)
CREATE OR REPLACE FUNCTION public.update_search_rate_limit(
  p_used int,
  p_remaining int,
  p_reset timestamp with time zone
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
  SET 
    search_limit_used = p_used,
    search_limit_remaining = p_remaining,
    search_limit_reset = p_reset,
    updated_at = now()
  WHERE id = auth.uid();
END;
$$;

-- RPC for updating Repo API rate limit (Edge Function will call this)
CREATE OR REPLACE FUNCTION public.update_repo_rate_limit(
  p_used int,
  p_remaining int,
  p_reset timestamp with time zone
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
  SET 
    repo_limit_used = p_used,
    repo_limit_remaining = p_remaining,
    repo_limit_reset = p_reset,
    updated_at = now()
  WHERE id = auth.uid();
END;
$$;

-- Backfill profiles for existing users
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

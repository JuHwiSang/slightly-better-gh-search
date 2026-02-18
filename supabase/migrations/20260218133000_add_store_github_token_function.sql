CREATE OR REPLACE FUNCTION public.store_github_token(p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, vault
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_secret_name TEXT;
  v_existing_id uuid;
BEGIN
  -- Reject unauthenticated calls
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate input
  IF p_token IS NULL OR p_token = '' THEN
    RAISE EXCEPTION 'Token must not be empty';
  END IF;

  v_secret_name := 'github_token_' || v_user_id::text;

  -- Check if secret already exists
  SELECT id INTO v_existing_id
  FROM vault.decrypted_secrets
  WHERE name = v_secret_name
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_id, p_token);
  ELSE
    PERFORM vault.create_secret(p_token, v_secret_name);
  END IF;
END;
$$;

-- Only authenticated users may call this function
REVOKE EXECUTE ON FUNCTION public.store_github_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.store_github_token(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.store_github_token(text) TO authenticated;

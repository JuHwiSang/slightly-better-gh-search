CREATE OR REPLACE FUNCTION public.delete_secret_by_name(secret_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, vault
AS $$
DECLARE
  target_id uuid;
BEGIN
  SELECT id INTO target_id
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
  
  IF target_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = target_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_secret_by_name(text) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.delete_secret_by_name(text) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.delete_secret_by_name(text) TO service_role;
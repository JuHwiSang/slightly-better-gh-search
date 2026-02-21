-- Vault RPC Wrappers
-- Supabase Cloud에서는 vault 스키마를 API에 직접 노출할 수 없으므로,
-- public 스키마에 래핑 함수를 만들어 service_role로만 접근 가능하게 함.

-- (1) get_secret_by_name: 이름으로 시크릿 조회
CREATE OR REPLACE FUNCTION public.get_secret_by_name(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, vault
AS $$
BEGIN
  RETURN (
    SELECT decrypted_secret
    FROM vault.decrypted_secrets
    WHERE name = secret_name
    LIMIT 1
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_secret_by_name(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_secret_by_name(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_secret_by_name(text) TO service_role;

-- (2) create_vault_secret: 시크릿 생성
CREATE OR REPLACE FUNCTION public.create_vault_secret(p_secret text, p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, vault
AS $$
BEGIN
  RETURN vault.create_secret(p_secret, p_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_vault_secret(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_vault_secret(text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_vault_secret(text, text) TO service_role;

-- (3) vault_secret_exists: 시크릿 존재 여부 확인
CREATE OR REPLACE FUNCTION public.vault_secret_exists(secret_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, vault
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets
    WHERE name = secret_name
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.vault_secret_exists(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.vault_secret_exists(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vault_secret_exists(text) TO service_role;

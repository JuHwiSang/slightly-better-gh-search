-- Tests for Vault RPC wrapper functions:
--   get_secret_by_name, create_vault_secret, vault_secret_exists
BEGIN;

CREATE EXTENSION IF NOT EXISTS "basejump-supabase_test_helpers";

SELECT plan(12);

-- ============================================================
-- 1. Function metadata
-- ============================================================
SELECT function_returns('public', 'get_secret_by_name', ARRAY['text'], 'text');
SELECT is_definer('public', 'get_secret_by_name', ARRAY['text']);

SELECT function_returns('public', 'create_vault_secret', ARRAY['text', 'text'], 'uuid');
SELECT is_definer('public', 'create_vault_secret', ARRAY['text', 'text']);

SELECT function_returns('public', 'vault_secret_exists', ARRAY['text'], 'boolean');
SELECT is_definer('public', 'vault_secret_exists', ARRAY['text']);

-- ============================================================
-- 2. create_vault_secret: should create a secret (service_role)
-- ============================================================
SELECT tests.authenticate_as_service_role();

SELECT lives_ok(
  $$ SELECT public.create_vault_secret('test_vault_value', 'test_vault_wrapper') $$,
  'service_role can create a vault secret'
);

SELECT tests.clear_authentication();
SET ROLE postgres;

-- ============================================================
-- 3. get_secret_by_name: existing secret
-- ============================================================
SELECT tests.authenticate_as_service_role();

SELECT is(
  public.get_secret_by_name('test_vault_wrapper'),
  'test_vault_value',
  'get_secret_by_name returns the decrypted value for an existing secret'
);

-- ============================================================
-- 4. get_secret_by_name: non-existing secret → NULL
-- ============================================================
SELECT is(
  public.get_secret_by_name('this_does_not_exist'),
  NULL,
  'get_secret_by_name returns NULL for a non-existing secret'
);

-- ============================================================
-- 5. vault_secret_exists: existing secret → true
-- ============================================================
SELECT is(
  public.vault_secret_exists('test_vault_wrapper'),
  true,
  'vault_secret_exists returns true for an existing secret'
);

-- ============================================================
-- 6. vault_secret_exists: non-existing secret → false
-- ============================================================
SELECT is(
  public.vault_secret_exists('this_does_not_exist'),
  false,
  'vault_secret_exists returns false for a non-existing secret'
);

SELECT tests.clear_authentication();

-- ============================================================
-- 7. Permission: authenticated user should be denied
-- ============================================================
SELECT tests.create_supabase_user('vault_test_user');
SELECT tests.authenticate_as('vault_test_user');

SELECT throws_ok(
  $$ SELECT public.get_secret_by_name('test_vault_wrapper') $$,
  '42501',
  'permission denied for function get_secret_by_name',
  'Authenticated user cannot call get_secret_by_name'
);

SELECT tests.clear_authentication();

-- ============================================================
-- Cleanup
-- ============================================================
SET ROLE postgres;
DELETE FROM vault.secrets WHERE name = 'test_vault_wrapper';

SELECT * FROM finish();
ROLLBACK;

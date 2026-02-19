-- Tests for store_github_token RPC function
BEGIN;

CREATE EXTENSION IF NOT EXISTS "basejump-supabase_test_helpers";

SELECT plan(7);

-- ============================================================
-- 1. Function metadata
-- ============================================================
SELECT function_returns('public', 'store_github_token', ARRAY['text'], 'void');
SELECT is_definer('public', 'store_github_token', ARRAY['text']);

-- ============================================================
-- 2. Should store a new token in Vault
-- ============================================================
SELECT tests.create_supabase_user('token_user');
SELECT tests.authenticate_as('token_user');

SELECT lives_ok(
  $$ SELECT public.store_github_token('ghp_test_token_abc123') $$,
  'Authenticated user can store a new token'
);

-- Verify by reading from vault (need elevated access)
SELECT tests.clear_authentication();
SET ROLE postgres;

SELECT is(
  (SELECT decrypted_secret FROM vault.decrypted_secrets
   WHERE name = 'github_token_' || tests.get_supabase_uid('token_user')
   LIMIT 1),
  'ghp_test_token_abc123',
  'Token should be stored in Vault with correct value'
);

-- ============================================================
-- 3. Should update existing token (upsert)
-- ============================================================
SELECT tests.authenticate_as('token_user');

SELECT lives_ok(
  $$ SELECT public.store_github_token('ghp_updated_token_xyz789') $$,
  'Authenticated user can update an existing token'
);

SELECT tests.clear_authentication();
SET ROLE postgres;

SELECT is(
  (SELECT decrypted_secret FROM vault.decrypted_secrets
   WHERE name = 'github_token_' || tests.get_supabase_uid('token_user')
   LIMIT 1),
  'ghp_updated_token_xyz789',
  'Token should be updated to the new value'
);

-- ============================================================
-- 4. Should reject empty token
-- ============================================================
SELECT tests.authenticate_as('token_user');

SELECT throws_ok(
  $$ SELECT public.store_github_token('') $$,
  'Token must not be empty'
);

-- ============================================================
-- Cleanup: remove vault secret created during test
-- ============================================================
SELECT tests.clear_authentication();
SET ROLE postgres;
DELETE FROM vault.secrets
WHERE name = 'github_token_' || tests.get_supabase_uid('token_user');

SELECT * FROM finish();
ROLLBACK;

-- Tests for delete_secret_by_name RPC function
BEGIN;

CREATE EXTENSION IF NOT EXISTS "basejump-supabase_test_helpers";

SELECT plan(5);

-- ============================================================
-- 1. Function metadata
-- ============================================================
SELECT function_returns('public', 'delete_secret_by_name', ARRAY['text'], 'void');
SELECT is_definer('public', 'delete_secret_by_name', ARRAY['text']);

-- ============================================================
-- 2. Should delete an existing secret (service_role)
-- ============================================================
-- Create a test secret via vault.create_secret RPC (direct INSERT is blocked)
SELECT vault.create_secret('test_secret_value', 'test_delete_me');

-- Verify it exists
SELECT is(
  (SELECT count(*)::int FROM vault.decrypted_secrets WHERE name = 'test_delete_me'),
  1,
  'Secret should exist before deletion'
);

-- Delete via RPC (as service_role)
SELECT tests.authenticate_as_service_role();
SELECT public.delete_secret_by_name('test_delete_me');
SELECT tests.clear_authentication();
SET ROLE postgres;

-- Verify it's gone
SELECT is(
  (SELECT count(*)::int FROM vault.decrypted_secrets WHERE name = 'test_delete_me'),
  0,
  'Secret should be deleted after RPC call'
);

-- ============================================================
-- 3. Should not error when deleting non-existent secret (no-op)
-- ============================================================
SELECT tests.authenticate_as_service_role();

SELECT lives_ok(
  $$ SELECT public.delete_secret_by_name('this_secret_does_not_exist') $$,
  'Deleting non-existent secret should not raise an error'
);

SELECT tests.clear_authentication();

SELECT * FROM finish();
ROLLBACK;

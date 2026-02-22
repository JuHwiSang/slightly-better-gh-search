import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { assertEquals } from "@std/assert";

/**
 * Test utilities for Supabase Edge Functions E2E tests
 */

/**
 * Load test environment variables from .env.test
 * This is automatically handled by Deno when using --env-file flag
 */
export function getTestEnv() {
  const required = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TEST_GITHUB_TOKEN",
  ];

  const missing = required.filter((key) => !Deno.env.get(key));
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        `Make sure to run tests with: deno test --env-file=supabase/.env.test`,
    );
  }

  return {
    supabaseUrl: Deno.env.get("SUPABASE_URL")!,
    anonKey: Deno.env.get("SUPABASE_ANON_KEY")!,
    serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    githubToken: Deno.env.get("TEST_GITHUB_TOKEN")!,
  };
}

/**
 * Create Supabase admin client with service role key
 */
export function createAdminClient(): SupabaseClient {
  const env = getTestEnv();
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
    },
  });
}

/**
 * Create Supabase client with anon key
 */
export function createAnonClient(): SupabaseClient {
  const env = getTestEnv();
  return createClient(env.supabaseUrl, env.anonKey, {
    auth: {
      autoRefreshToken: false,
    },
  });
}

/**
 * Test user data
 */
export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

/**
 * Create a test user and return session info
 */
export async function createTestUser(): Promise<TestUser> {
  const adminClient = createAdminClient();
  const timestamp = Date.now();
  const email = `test-user-${timestamp}@example.com`;
  const password = `test-password-${timestamp}`;

  // Create user with admin client
  const { data: userData, error: createError } = await adminClient.auth.admin
    .createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError || !userData.user) {
    throw new Error(`Failed to create test user: ${createError?.message}`);
  }

  // Sign in to get access token
  const anonClient = createAnonClient();
  const { data: sessionData, error: signInError } = await anonClient.auth
    .signInWithPassword({
      email,
      password,
    });

  if (signInError || !sessionData.session) {
    throw new Error(`Failed to sign in test user: ${signInError?.message}`);
  }

  return {
    id: userData.user.id,
    email,
    accessToken: sessionData.session.access_token,
  };
}

/**
 * Create a Vault secret via RPC (service_role only)
 */
export async function createVaultSecret(
  secret: string,
  name: string,
): Promise<void> {
  const adminClient = createAdminClient();
  const { error } = await adminClient.rpc("create_vault_secret", {
    p_secret: secret,
    p_name: name,
  });
  if (error) {
    throw new Error(`Failed to create vault secret ${name}: ${error.message}`);
  }
}

/**
 * Check if a Vault secret exists via RPC (service_role only)
 */
export async function vaultSecretExists(
  secretName: string,
): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc("vault_secret_exists", {
    secret_name: secretName,
  });
  if (error) {
    throw new Error(
      `Failed to check vault secret ${secretName}: ${error.message}`,
    );
  }
  return data as boolean;
}

/**
 * Delete a Vault secret using a custom RPC function.
 */
export async function cleanupVaultSecret(secretName: string): Promise<void> {
  const adminClient = createAdminClient();

  // Use custom RPC function for deletion (public schema)
  // Note: adminClient defaults to public schema, so we call the function directly
  const { error } = await adminClient.rpc("delete_secret_by_name", {
    secret_name: secretName,
  });

  if (error) {
    console.warn(`Failed to cleanup secret ${secretName}:`, error);
  }
}

/**
 * Delete test user and associated Vault secrets
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  const adminClient = createAdminClient();

  // Delete Vault secret
  const secretName = `github_token_${userId}`;
  await cleanupVaultSecret(secretName);

  // Delete user
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    console.warn(`Failed to delete test user ${userId}: ${error.message}`);
  }
}

/**
 * Wait for a specified duration (for cache timing tests)
 */
export function waitForCache(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Assert that response is OK (status 200-299)
 */
export async function assertResponseOk(
  response: Response,
  message?: string,
): Promise<void> {
  if (!response.ok) {
    const body = await response.clone().text();
    throw new Error(
      (message ||
        `Expected response to be OK, got ${response.status} ${response.statusText}`) +
        `\nResponse Body: ${body}`,
    );
  }
}

/**
 * Assert response status code
 */
export async function assertResponseStatus(
  response: Response,
  expectedStatus: number,
  message?: string,
): Promise<void> {
  if (response.status !== expectedStatus) {
    const body = await response.clone().text();
    assertEquals(
      response.status,
      expectedStatus,
      (message || `Expected status ${expectedStatus}, got ${response.status}`) +
        `\nResponse Body: ${body}`,
    );
  }
}

/**
 * Get Edge Function URL
 */
export function getEdgeFunctionUrl(functionName: string): string {
  const env = getTestEnv();
  // Local Supabase Edge Functions run on port 54321
  return `${env.supabaseUrl}/functions/v1/${functionName}`;
}

/**
 * Call Edge Function with authorization
 */
export function callEdgeFunction(
  functionName: string,
  options: {
    method?: string;
    accessToken?: string;
    body?: unknown;
    searchParams?: Record<string, string>;
  } = {},
): Promise<Response> {
  const url = new URL(getEdgeFunctionUrl(functionName));

  // Add search params
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const env = getTestEnv();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": env.serviceRoleKey, // Use service_role to bypass gateway-level JWT verification
  };

  if (options.accessToken) {
    headers["Authorization"] = `Bearer ${options.accessToken}`;
  }

  return fetch(url.toString(), {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

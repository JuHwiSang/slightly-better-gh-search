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
 * Check if Redis is configured in the environment
 */
export function isRedisConfigured(): boolean {
  return (
    !!Deno.env.get("UPSTASH_REDIS_REST_URL") &&
    !!Deno.env.get("UPSTASH_REDIS_REST_TOKEN")
  );
}

/**
 * Create Supabase admin client with service role key
 */
export function createAdminClient(): SupabaseClient {
  const env = getTestEnv();
  return createClient(env.supabaseUrl, env.serviceRoleKey);
}

/**
 * Create Supabase client with anon key
 */
export function createAnonClient(): SupabaseClient {
  const env = getTestEnv();
  return createClient(env.supabaseUrl, env.anonKey);
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
 * Delete test user and associated Vault secrets
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  const adminClient = createAdminClient();

  // Delete Vault secret
  const secretName = `github_token_${userId}`;

  // First, get the secret ID from the view
  const { data: secret } = await adminClient
    .from("vault.decrypted_secrets")
    .select("id")
    .eq("name", secretName)
    .single();

  // Delete from vault.secrets table using the ID
  if (secret) {
    await adminClient
      .from("vault.secrets")
      .delete()
      .eq("id", secret.id);
  }

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

  console.log("url", url.toString());
  console.log("apiKey", headers["apikey"]);
  console.log("Authorization", headers["Authorization"]);

  return fetch(url.toString(), {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

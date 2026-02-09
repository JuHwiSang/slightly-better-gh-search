import { assertEquals, assertExists } from "@std/assert";
import {
  assertResponseOk,
  assertResponseStatus,
  callEdgeFunction,
  cleanupTestUser,
  createAdminClient,
  createTestUser,
  getTestEnv,
  type TestUser,
} from "../test_utils.ts";

/**
 * E2E tests for store-token Edge Function
 */

Deno.test("store-token: should store GitHub token for authenticated user", async () => {
  let testUser: TestUser | null = null;

  try {
    // Create test user
    testUser = await createTestUser();
    const env = getTestEnv();

    // Call store-token function
    const response = await callEdgeFunction("store-token", {
      method: "POST",
      accessToken: testUser.accessToken,
      body: {
        provider_token: env.githubToken,
      },
    });

    // Assert response
    await assertResponseOk(response);
    const data = await response.json();
    assertEquals(data.success, true);
    assertExists(data.message);

    // Verify token is stored in Vault
    const adminClient = createAdminClient();
    const secretName = `github_token_${testUser.id}`;

    const { data: vaultData, error: vaultError } = await adminClient
      .schema("vault")
      .from("decrypted_secrets")
      .select("decrypted_secret, name")
      .eq("name", secretName)
      .maybeSingle();

    assertEquals(vaultError, null, "Should retrieve token from Vault");
    assertExists(vaultData, "Token should exist in Vault");
    assertEquals(vaultData!.decrypted_secret, env.githubToken);
    assertEquals(vaultData!.name, secretName);
  } finally {
    // Cleanup
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  }
});

Deno.test("store-token: should update existing GitHub token", async () => {
  let testUser: TestUser | null = null;

  try {
    // Create test user
    testUser = await createTestUser();
    const env = getTestEnv();

    // Store initial token
    const firstToken = env.githubToken;
    const firstResponse = await callEdgeFunction("store-token", {
      method: "POST",
      accessToken: testUser.accessToken,
      body: { provider_token: firstToken },
    });
    await assertResponseOk(firstResponse, "Failed to store initial token");

    // Update with new token (use same token for testing, but simulate update)
    const secondToken = `${firstToken}_updated`;
    const response = await callEdgeFunction("store-token", {
      method: "POST",
      accessToken: testUser.accessToken,
      body: { provider_token: secondToken },
    });

    // Assert response
    await assertResponseOk(response);
    const data = await response.json();
    assertEquals(data.success, true);

    // Verify updated token in Vault
    const adminClient = createAdminClient();
    const secretName = `github_token_${testUser.id}`;

    const { data: vaultData, error: vaultError } = await adminClient
      .schema("vault")
      .from("decrypted_secrets")
      .select("decrypted_secret")
      .eq("name", secretName)
      .maybeSingle();

    assertEquals(vaultError, null);
    assertEquals(vaultData?.decrypted_secret, secondToken);
  } finally {
    // Cleanup
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  }
});

Deno.test("store-token: should return 401 when missing authorization header", async () => {
  const env = getTestEnv();

  const response = await callEdgeFunction("store-token", {
    method: "POST",
    // No accessToken
    body: { provider_token: env.githubToken },
  });

  await assertResponseStatus(response, 401);
  const data = await response.json();
  assertExists(data.error);
});

Deno.test("store-token: should return 401 when using invalid token", async () => {
  const env = getTestEnv();

  const response = await callEdgeFunction("store-token", {
    method: "POST",
    accessToken: "invalid-token-12345",
    body: { provider_token: env.githubToken },
  });

  await assertResponseStatus(response, 401);
  const data = await response.json();
  assertExists(data.error);
});

Deno.test("store-token: should return 400 when missing provider_token", async () => {
  let testUser: TestUser | null = null;
  let response: Response | null = null;

  try {
    testUser = await createTestUser();

    response = await callEdgeFunction("store-token", {
      method: "POST",
      accessToken: testUser.accessToken,
      body: {}, // Missing provider_token
    });

    await assertResponseStatus(response, 400);
    const data = await response.json();
    assertExists(data.error);
  } finally {
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  }
});

Deno.test("store-token: should return 400 when provider_token is not a string", async () => {
  let testUser: TestUser | null = null;

  try {
    testUser = await createTestUser();

    const response = await callEdgeFunction("store-token", {
      method: "POST",
      accessToken: testUser.accessToken,
      body: { provider_token: 12345 }, // Invalid type
    });

    await assertResponseStatus(response, 400);
    const data = await response.json();
    assertExists(data.error);
  } finally {
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  }
});

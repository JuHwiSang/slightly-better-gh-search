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
 * E2E tests for delete-account Edge Function
 */

// Helper to setup test user with GitHub token in Vault
async function setupTestUserWithToken(): Promise<TestUser> {
    const testUser = await createTestUser();
    const env = getTestEnv();

    const adminClient = createAdminClient();
    const secretName = `github_token_${testUser.id}`;
    const { error } = await adminClient
        .schema("vault")
        .rpc("create_secret", {
            new_secret: env.githubToken,
            new_name: secretName,
        });
    if (error) {
        throw new Error(`Failed to store token during setup: ${error.message}`);
    }

    return testUser;
}

// Helper to check if a user still exists (via admin)
async function userExists(userId: string): Promise<boolean> {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.auth.admin.getUserById(userId);
    if (error || !data.user) return false;
    return true;
}

// Helper to check if a Vault secret exists (via admin)
async function vaultSecretExists(secretName: string): Promise<boolean> {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .schema("vault")
        .from("decrypted_secrets")
        .select("id")
        .eq("name", secretName)
        .maybeSingle();
    if (error || !data) return false;
    return true;
}

Deno.test("delete-account: should delete user and vault secret", async () => {
    let testUser: TestUser | null = null;
    let response: Response | null = null;

    try {
        testUser = await setupTestUserWithToken();
        const userId = testUser.id;

        // Verify setup
        assertEquals(
            await userExists(userId),
            true,
            "User should exist before deletion",
        );
        assertEquals(
            await vaultSecretExists(`github_token_${userId}`),
            true,
            "Vault secret should exist before deletion",
        );

        response = await callEdgeFunction("delete-account", {
            method: "POST",
            accessToken: testUser.accessToken,
        });

        await assertResponseOk(response);
        const data = await response.json();
        assertExists(data.message);

        // Verify deletion
        assertEquals(await userExists(userId), false, "User should be deleted");
        assertEquals(
            await vaultSecretExists(`github_token_${userId}`),
            false,
            "Vault secret should be deleted",
        );

        // Mark as cleaned up — user is already deleted
        testUser = null;
    } finally {
        if (response && !response.bodyUsed) {
            await response.body?.cancel();
        }
        if (testUser) {
            // Fallback cleanup if test failed mid-way
            await cleanupTestUser(testUser.id);
        }
    }
});

Deno.test("delete-account: should delete user even without vault secret", async () => {
    let testUser: TestUser | null = null;
    let response: Response | null = null;

    try {
        // Create user WITHOUT storing a GitHub token
        testUser = await createTestUser();
        const userId = testUser.id;

        response = await callEdgeFunction("delete-account", {
            method: "POST",
            accessToken: testUser.accessToken,
        });

        await assertResponseOk(response);
        const data = await response.json();
        assertExists(data.message);

        // Verify user is deleted
        assertEquals(await userExists(userId), false, "User should be deleted");

        testUser = null;
    } finally {
        if (response && !response.bodyUsed) {
            await response.body?.cancel();
        }
        if (testUser) {
            await cleanupTestUser(testUser.id);
        }
    }
});

Deno.test("delete-account: should return 401 when missing authorization", async () => {
    let response: Response | null = null;

    try {
        response = await callEdgeFunction("delete-account", {
            method: "POST",
            // No accessToken
        });

        await assertResponseStatus(response, 401);
        const data = await response.json();
        assertExists(data.error);
    } finally {
        if (response && !response.bodyUsed) {
            await response.body?.cancel();
        }
    }
});

Deno.test("delete-account: should return 401 with invalid token", async () => {
    let response: Response | null = null;

    try {
        response = await callEdgeFunction("delete-account", {
            method: "POST",
            accessToken: "invalid-jwt-token",
        });

        await assertResponseStatus(response, 401);
        const data = await response.json();
        assertExists(data.error);
    } finally {
        if (response && !response.bodyUsed) {
            await response.body?.cancel();
        }
    }
});

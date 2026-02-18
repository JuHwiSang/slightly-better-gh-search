import { assertEquals, assertExists } from "@std/assert";
import {
  assertResponseOk,
  assertResponseStatus,
  callEdgeFunction,
  cleanupTestUser,
  createAdminClient,
  createTestUser,
  getTestEnv,
  isRedisConfigured,
  type TestUser,
} from "../test_utils.ts";

/**
 * E2E tests for search Edge Function
 */

// Helper to setup test user with GitHub token
async function setupTestUserWithToken(): Promise<TestUser> {
  const testUser = await createTestUser();
  const env = getTestEnv();

  // Store GitHub token directly in Vault via admin client
  // (store_github_token RPC requires auth.uid(), not available with service_role)
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

Deno.test("search: should perform basic search", async () => {
  let testUser: TestUser | null = null;
  let response: Response | null = null;

  try {
    testUser = await setupTestUserWithToken();

    response = await callEdgeFunction("search", {
      method: "POST",
      accessToken: testUser.accessToken,
      body: {
        query: "language:typescript",
        limit: 10,
      },
    });

    await assertResponseOk(response);
    const data = await response.json();

    // Verify response structure

    // console.log(data);

    assertExists(data.items);
    assertEquals(Array.isArray(data.items), true);
    assertExists(data.total_count);
    assertEquals(typeof data.total_count, "number");
    assertEquals(typeof data.has_more, "boolean");
    assertEquals(typeof data.incomplete_results, "boolean");
  } finally {
    if (response && !response.bodyUsed) {
      await response.body?.cancel();
    }
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  }
});

Deno.test("search: should apply filter expression", async () => {
  let testUser: TestUser | null = null;
  let response: Response | null = null;

  try {
    testUser = await setupTestUserWithToken();

    response = await callEdgeFunction("search", {
      method: "POST",
      accessToken: testUser.accessToken,
      body: {
        query: "react",
        filter: "stars > 1000",
        limit: 5,
      },
    });

    await assertResponseOk(response);
    const data = await response.json();

    assertExists(data.items);
    assertEquals(Array.isArray(data.items), true);

    // Verify all results match filter
    for (const item of data.items) {
      assertExists(item.repository);
      assertExists(item.repository.stargazers_count);
      assertEquals(
        item.repository.stargazers_count > 1000,
        true,
        `Expected stars > 1000, got ${item.repository.stargazers_count}`,
      );
    }
  } finally {
    if (response && !response.bodyUsed) {
      await response.body?.cancel();
    }
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  }
});

Deno.test("search: should support pagination with cursor", async () => {
  let testUser: TestUser | null = null;
  let firstResponse: Response | null = null;
  let secondResponse: Response | null = null;

  try {
    testUser = await setupTestUserWithToken();

    // First page
    firstResponse = await callEdgeFunction("search", {
      method: "POST",
      accessToken: testUser.accessToken,
      body: {
        query: "javascript",
        limit: 5,
      },
    });

    await assertResponseOk(firstResponse);
    const firstData = await firstResponse.json();
    assertExists(firstData.items);
    assertEquals(firstData.items.length > 0, true);

    // If there's a next cursor, fetch next page
    if (firstData.next_cursor) {
      secondResponse = await callEdgeFunction("search", {
        method: "POST",
        accessToken: testUser.accessToken,
        body: {
          query: "javascript",
          limit: 5,
          cursor: firstData.next_cursor,
        },
      });

      await assertResponseOk(secondResponse);
      const secondData = await secondResponse.json();
      assertExists(secondData.items);

      // Verify we got different results
      const firstIds = firstData.items.map((item: { name: string }) =>
        item.name
      );
      const secondIds = secondData.items.map((item: { name: string }) =>
        item.name
      );

      // At least some results should be different
      const hasNewResults = secondIds.some((id: string) =>
        !firstIds.includes(id)
      );
      assertEquals(
        hasNewResults,
        true,
        "Second page should have different results",
      );
    }
  } finally {
    if (firstResponse && !firstResponse.bodyUsed) {
      await firstResponse.body?.cancel();
    }
    if (secondResponse && !secondResponse.bodyUsed) {
      await secondResponse.body?.cancel();
    }
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  }
});

Deno.test("search: should return text_matches for highlighting", async () => {
  let testUser: TestUser | null = null;
  let response: Response | null = null;

  try {
    testUser = await setupTestUserWithToken();

    response = await callEdgeFunction("search", {
      method: "POST",
      accessToken: testUser.accessToken,
      body: {
        query: "function",
        limit: 3,
      },
    });

    await assertResponseOk(response);
    const data = await response.json();

    assertExists(data.items);
    if (data.items.length > 0) {
      // At least one item should have text_matches
      const hasTextMatches = data.items.some(
        (item: { text_matches?: unknown[] }) =>
          item.text_matches && item.text_matches.length > 0,
      );
      assertEquals(
        hasTextMatches,
        true,
        "At least one result should have text_matches",
      );
    }
  } finally {
    if (response && !response.bodyUsed) {
      await response.body?.cancel();
    }
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  }
});

Deno.test("search: should return 400 when query is missing", async () => {
  let testUser: TestUser | null = null;
  let response: Response | null = null;

  try {
    testUser = await setupTestUserWithToken();

    response = await callEdgeFunction("search", {
      method: "POST",
      accessToken: testUser.accessToken,
      body: {
        // No query
        limit: 10,
      },
    });

    await assertResponseStatus(response, 400);
    const data = await response.json();
    assertExists(data.error);
  } finally {
    if (response && !response.bodyUsed) {
      await response.body?.cancel();
    }
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  }
});

Deno.test("search: should return 400 when cursor format is invalid", async () => {
  let testUser: TestUser | null = null;
  let response: Response | null = null;

  try {
    testUser = await setupTestUserWithToken();

    response = await callEdgeFunction("search", {
      method: "POST",
      accessToken: testUser.accessToken,
      body: {
        query: "test",
        cursor: "invalid-cursor-format",
      },
    });

    await assertResponseStatus(response, 400);
    const data = await response.json();
    assertExists(data.error);
  } finally {
    if (response && !response.bodyUsed) {
      await response.body?.cancel();
    }
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  }
});

Deno.test("search: should return 400 when filter expression is invalid", async () => {
  let testUser: TestUser | null = null;
  let response: Response | null = null;

  try {
    testUser = await setupTestUserWithToken();

    response = await callEdgeFunction("search", {
      method: "POST",
      accessToken: testUser.accessToken,
      body: {
        query: "test",
        filter: "invalid filter expression !!!",
      },
    });

    await assertResponseStatus(response, 400);
    const data = await response.json();
    assertExists(data.error);
  } finally {
    if (response && !response.bodyUsed) {
      await response.body?.cancel();
    }
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  }
});

Deno.test("search: should return 401 when missing authorization", async () => {
  let response: Response | null = null;

  try {
    response = await callEdgeFunction("search", {
      method: "POST",
      // No accessToken
      body: {
        query: "test",
      },
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

Deno.test("search: should return 401 when GitHub token not found in Vault", async () => {
  let testUser: TestUser | null = null;
  let response: Response | null = null;

  try {
    // Create user but don't store GitHub token
    testUser = await createTestUser();

    response = await callEdgeFunction("search", {
      method: "POST",
      accessToken: testUser.accessToken,
      body: {
        query: "test",
      },
    });

    await assertResponseStatus(response, 401);
    const data = await response.json();
    assertExists(data.error);
  } finally {
    if (response && !response.bodyUsed) {
      await response.body?.cancel();
    }
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  }
});

Deno.test("search: should use cache when available", {
  ignore: !isRedisConfigured(),
}, async () => {
  let testUser: TestUser | null = null;
  let response1: Response | null = null;
  let response2: Response | null = null;

  try {
    testUser = await setupTestUserWithToken();

    const searchBody = {
      query: "priority:high",
      limit: 5,
    };

    // First request - should fetch from GitHub and cache
    response1 = await callEdgeFunction("search", {
      method: "POST",
      accessToken: testUser.accessToken,
      body: searchBody,
    });
    await assertResponseOk(response1);

    // Second request - should be served from cache
    response2 = await callEdgeFunction("search", {
      method: "POST",
      accessToken: testUser.accessToken,
      body: searchBody,
    });
    await assertResponseOk(response2);

    const data1 = await response1.json();
    const data2 = await response2.json();

    assertEquals(data1.items.length, data2.items.length);
  } finally {
    if (response1 && !response1.bodyUsed) {
      await response1.body?.cancel();
    }
    if (response2 && !response2.bodyUsed) {
      await response2.body?.cancel();
    }
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  }
});

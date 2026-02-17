# AI Configuration - Slightly Better GH Search

> **Audience**: AI assistants\
> **Purpose**: Project context, coding patterns, and common mistakes to avoid

---

## Project Overview

**Name**: Slightly Better GH Search\
**Purpose**: Enhanced GitHub Code Search with advanced filtering\
**Stack**: SvelteKit 5, Supabase (Auth + Edge Functions), Upstash Redis,
Tailwind CSS

### Core Features

- **Dual Input System**: Main search query + custom filter expression
- **Filter Expression**: Single input field with safe evaluation (e.g.,
  `stars > 100 && language == 'js'`)
- **GitHub OAuth**: Authentication via Supabase Auth
- **Edge Function**: Proxies GitHub API with Redis caching (24h TTL, ETag-based)

---

## Critical Coding Patterns

### Svelte 5 Specifics

```typescript
// ✅ Use $state runes (NOT writable stores)
class AuthState {
  user = $state<User | null>(null);
  isAuthenticated = $state(false);
}

// ✅ Use standard DOM events (NOT on:click)
<button onclick={() => handleClick()}>Click</button>;

// ✅ Use $derived for computed values
let isQueryEmpty = $derived(!query.trim());
```

### Conditional Styling

```svelte
<!-- ✅ Ternary operator (handles Tailwind `/` opacity) -->
<div class="{isAuth ? 'bg-dark border-gray-700' : 'bg-blue-900 border-blue-500'} base-classes">

<!-- ❌ Multiple class: directives (breaks with `/` character) -->
<div class="base-classes" class:bg-dark={isAuth} class:bg-blue-900={!isAuth}>
```

### UI State Changes

```svelte
<!-- ✅ Minimal changes (only swap button) -->
{#if !authState.isAuthenticated}
  <button>Sign in with GitHub</button>
{:else}
  <button>Execute</button>
{/if}

<!-- ❌ Complete layout swap -->
{#if !authState.isAuthenticated}
  <LoginLayout />
{:else}
  <SearchLayout />
{/if}
```

### Button Disable Pattern

```svelte
<!-- ✅ Visual + functional disable -->
<button
  disabled={isQueryEmpty}
  class="{isQueryEmpty 
    ? 'pointer-events-none cursor-not-allowed text-gray-600' 
    : 'hover:text-white'}"
>
```

### Keyboard Navigation

```typescript
// ✅ State-aware Enter key handling
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    if (authState.isAuthenticated) {
      handleExecute();
    } else {
      handleGitHubLogin();
    }
  }
}
```

### URL State Management

```typescript
// ✅ Preserve all params during navigation
function buildPageUrl(page: number): string {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (filter) params.set("filter", filter);
  params.set("page", page.toString());
  return `/search?${params.toString()}`;
}
```

### Infinite Scroll with Intersection Observer

```typescript
// ✅ Use Intersection Observer for efficient scroll detection
let sentinel: HTMLDivElement | null = $state(null);
let observer: IntersectionObserver | null = null;

$effect(() => {
  if (!sentinel || !hasMore || isLoading) {
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    {
      rootMargin: "100px", // Trigger 100px before reaching the sentinel
    },
  );

  observer.observe(sentinel);

  return () => {
    if (observer) {
      observer.disconnect();
    }
  };
});

// ✅ Accumulate results from cursor-based API
async function loadResults(cursor: string | null = null) {
  if (cursor) {
    // Append to existing results
    results = [...results, ...data.items];
  } else {
    // Replace results (initial load)
    results = data.items;
  }
  nextCursor = data.next_cursor;
}

// ❌ Don't use scroll event listeners (performance issues)
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
    loadMore(); // Triggers too frequently
  }
});
```

### GitHub API Integration

```typescript
// ✅ Cursor format: "{page}:{index}" for precise pagination
const cursor = "2:15"; // Page 2, item 15
const [page, index] = cursor.split(":").map(Number);

// ✅ Request text-match metadata for highlighting
Accept: "application/vnd.github.text-match+json";

// ✅ Track incomplete_results across multiple pages
let incompleteResults = false;
incompleteResults = incompleteResults || searchData.incomplete_results;

// ✅ Pass through text_matches from GitHub API
filteredItems.push({
  // ... other fields ...
  text_matches: item.text_matches,
});
```

### Text-Match Highlighting

```typescript
// ✅ Use {@html} with sanitized highlighting
{#each lines as line, index}
  <div>{@html highlightLine(line, index)}</div>
{/each}

// ✅ Highlight with <mark> tags and Tailwind classes
const highlighted = `<mark class="bg-yellow-400/30 text-yellow-200">${term}</mark>`;

// ❌ Don't use dangerouslySetInnerHTML or unsanitized HTML
```

### Edge Function Error Handling

```typescript
// ✅ Use ApiError class for all error cases
import { ApiError } from "./errors.ts";

if (!query) {
  throw new ApiError(400, "Query parameter is required");
}

// ✅ Centralized error handling in catch block
catch (error: unknown) {
  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status, headers: corsHeaders }
    );
  }
  // Handle unexpected errors...
}

// ❌ Don't create Response objects manually for each error
if (!query) {
  return new Response(
    JSON.stringify({ error: "..." }),
    { status: 400, headers: {...} }
  );
}
```

### Edge Function Invocation from SvelteKit

```typescript
// ✅ Use supabase.functions.invoke() — SDK auto-injects auth header
import { FunctionsHttpError } from "@supabase/supabase-js";

// POST (clean — body natively supported)
const { error } = await supabase.functions.invoke("store-token", {
  body: { provider_token: providerToken },
});

// GET with query params (필요한 경우에만)
const { data, error } = await supabase.functions.invoke(
  `function-name?${params.toString()}`,
  { method: "GET" },
);

// ✅ FunctionsHttpError로 에러 핸들링
if (error instanceof FunctionsHttpError) {
  const errorData = await error.context.json();
  console.error(errorData.error);
}

// ❌ Don't use raw fetch() for Edge Functions
await fetch(`${PUBLIC_SUPABASE_URL}/functions/v1/search`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

### GitHub OAuth Token Storage

```typescript
// ✅ Extract provider_token in OAuth callback (ONLY available here)
const { data, error } = await supabase.auth.exchangeCodeForSession(code);
if (!error && data.session) {
  const providerToken = data.session.provider_token; // ✅ Only here!

  // Store in Vault via Edge Function (SDK)
  const { error: invokeError } = await supabase.functions.invoke(
    "store-token",
    {
      body: { provider_token: providerToken },
    },
  );
}

// ❌ Don't try to get provider_token from getSession() or user_metadata
const { data: { session } } = await supabase.auth.getSession();
const token = session?.provider_token; // ❌ undefined
const token2 = user.user_metadata?.provider_token; // ❌ undefined
```

### Supabase Vault Access

```typescript
// ✅ 읽기: vault.decrypted_secrets 뷰 사용
// ✅ 쓰기: vault.create_secret(), vault.update_secret() RPC 함수 사용
import { createAdminClient } from "./auth.ts";

const adminClient = createAdminClient();
const secretName = `github_token_${user.id}`;

// Upsert pattern: 읽기 → 쓰기 분리
const { data: existing } = await adminClient
  .schema('vault')
  .from('decrypted_secrets') // ✅ 읽기: 뷰 사용
  .select('id')
  .eq('name', secretName)
  .maybeSingle();

if (existing) {
  // ✅ 쓰기: RPC 함수
  await adminClient.rpc('vault.update_secret', {
    id: existing.id,
    secret: providerToken
  });
} else {
  // ✅ 쓰기: RPC 함수
  await adminClient.rpc('vault.create_secret', {
    secret: providerToken,
    name: secretName
  });
}

// ✅ 읽기: 뷰 사용
const { data } = await adminClient
  .schema('vault')
  .from('decrypted_secrets')
  .select('decrypted_secret')
  .eq('name', secretName)
  .maybeSingle();

const githubToken = data?.decrypted_secret;

// ❌ Don't use direct INSERT/UPDATE on vault.secrets
await adminClient.schema('vault').from('secrets').insert(...); // ❌ Permission error
await adminClient.schema('vault').from('secrets').update(...); // ❌ Permission error
```

### Deno Test Response Cleanup

```typescript
// ✅ Declare response variables at top, cleanup in finally
Deno.test("test name", async () => {
  let testUser: TestUser | null = null;
  let response: Response | null = null;
  let firstResponse: Response | null = null; // For multiple responses
  
  try {
    testUser = await setupTestUserWithToken();
    
    response = await callEdgeFunction("search", { ... });
    await assertResponseOk(response);
    const data = await response.json(); // Body consumed
    
    // ... assertions ...
  } finally {
    // ✅ Cleanup all responses
    if (response && !response.bodyUsed) {
      await response.body?.cancel();
    }
    if (firstResponse && !firstResponse.bodyUsed) {
      await firstResponse.body?.cancel();
    }
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  }
});

// ❌ Don't forget to cleanup response bodies
Deno.test("bad test", async () => {
  const response = await callEdgeFunction("search", { ... });
  const data = await response.json();
  // Missing finally block - will cause resource leak
});
```

### Redis Client Configuration

```typescript
// ✅ Configure timeout and retry for fast fallback
import { Redis } from "@upstash/redis";

export function createRedisClient(): Redis | null {
  if (!config.isRedisEnabled) {
    console.warn("Redis credentials not configured. Caching disabled.");
    return null;
  }

  try {
    return new Redis({
      url: config.redis.url!,
      token: config.redis.token!,
      retry: {
        retries: 0, // Disable retry for fast fallback
      },
      config: {
        signal: AbortSignal.timeout(2000), // 2 second timeout
      },
    });
  } catch (error) {
    console.error("Failed to initialize Redis client:", error);
    return null;
  }
}

// ❌ Don't use default timeout (very long)
return new Redis({
  url: config.redis.url!,
  token: config.redis.token!,
  // Missing timeout - will wait minutes on connection failure
});
```

### Early Input Validation

```typescript
// ✅ Validate inputs BEFORE expensive operations
// Validate filter expression early (before GitHub API calls)
if (filter && filter.trim() !== "") {
  const validation = validateFilter(filter);
  if (!validation.valid) {
    throw new ApiError(400, `Invalid filter expression: ${validation.error}`);
  }
}

// Now make API calls
const searchData = await fetchCodeSearch(...);

// ❌ Don't validate after API calls
const searchData = await fetchCodeSearch(...); // Expensive!
for (const item of searchData.items) {
  if (filter) {
    evaluateFilter(filter, item); // May throw - wasted API call
  }
}
```

### API Response Naming

```typescript
// ✅ HTTP API responses use snake_case (consistent with GitHub API)
export interface SearchResponse {
  items: SearchResultItem[];
  next_cursor: string | null; // snake_case
  total_count: number; // snake_case
  has_more: boolean; // snake_case
  incomplete_results: boolean; // snake_case
}

// ✅ Internal variables use camelCase (TypeScript convention)
let nextCursor: string | null = null;
const totalCount = searchData.total_count;
const hasMore = filteredItems.length >= limit;

// ✅ Explicit mapping in response construction
const response: SearchResponse = {
  items: filteredItems,
  next_cursor: nextCursor, // Map internal to external
  total_count: totalCount,
  has_more: hasMore,
  incomplete_results: incompleteResults,
};

// ❌ Don't mix naming conventions in API responses
export interface BadResponse {
  nextCursor: string; // camelCase
  incomplete_results: boolean; // snake_case - inconsistent!
}
```

### Server-Side Error Logging (SvelteKit)

SSR `load` 함수나 `+server.ts`에서 에러 처리 시, **반드시 서버 콘솔에 상세
로그를 남겨야 함**. SSR에서는 클라이언트 DevTools로 에러를 볼 수 없기 때문.

```typescript
// ✅ 서버 콘솔에 상세 로깅 + 클라이언트에는 안전한 메시지만 전달
if (error instanceof FunctionsHttpError) {
  const { status, statusText } = error.context;
  let responseBody: unknown = null;
  try {
    responseBody = await error.context.json();
    errorMessage = (responseBody as Record<string, string>).error ||
      errorMessage;
  } catch { /* non-JSON body */ }
  console.error(
    `[FeatureName] Edge Function error`,
    `\n  Status: ${status} ${statusText}`,
    `\n  Context: ...relevant params...`,
    `\n  Response:`,
    responseBody ?? "(non-JSON body)",
  );
} else {
  console.error(`[FeatureName] Unexpected error`, `\n  Detail:`, error);
}
return { error: errorMessage }; // 클라이언트에는 가공된 메시지만

// ❌ 에러를 삼키거나 로깅 없이 클라이언트에만 전달
if (error) {
  return { error: "Search failed" }; // 서버 콘솔에 아무것도 안 남음
}
```

**핵심 원칙:**

- 서버 로그: status code, 요청 컨텍스트(query 등), 응답 body 전문
- 클라이언트: 사용자에게 의미 있는 메시지만 (내부 정보 노출 금지)
- `[FeatureName]` prefix로 로그 필터링 용이하게

---

## Common Mistakes

### 1. Design Reference Files

- ❌ Copy `docs/design/*.html` verbatim
- ✅ Use as **inspiration**, adapt to project needs
- **Why**: Design files are AI-generated examples, not exact specs
- **Example**: Don't copy "SearchRepos" title → use "Slightly Better GH Search"

### 2. Branding

- ❌ "GitHub" in title (trademark issues)
- ✅ "GH" in title, "GitHub" in subtitle only

### 3. UI Simplicity

- ❌ Implement all design elements (READY, MODE indicators)
- ✅ Only implement functional requirements
- **Test**: "Does this provide user value?"

### 4. Icons

- ❌ Material Symbols as text (`<span>icon_name</span>`)
- ✅ unplugin-icons components
  (`import IconLucideSearch from '~icons/lucide/search'`)

### 5. CSS Import Order

- ❌ `@import` after `@theme` block
- ✅ All `@import` statements **before** `@theme`

### 6. Visual Effects

- ❌ Excessive glows, pulses, animations
- ✅ Minimal, purposeful effects
- **Principle**: "Design intent" not "design copy"

### 7. Documentation

- ❌ Modify TRB (troubleshooting) files after implementation
- ❌ Update only GEMINI.md OR DEV_LOG.md
- ✅ **Both** GEMINI.md (patterns) + DEV_LOG.md (implementation details)
- ✅ TRB files remain unchanged (reference guides)

### 9. ADR Usage

- ✅ **Only for major architectural decisions** (SvelteKit vs Next.js, auth
  strategy)
- ❌ Simple/obvious decisions (URL structure, API params)
- **Test**: "Would changing this impact the entire system?"
- **Alternative**: Use `docs/endpoints/` or `docs/api/` for simple specs

### 10. Feedback Documentation

- ✅ Record **reusable patterns/principles**
- ❌ Record specific solutions ("add padding", "change color")
- **Test**: "Will this prevent future mistakes in different contexts?"

---

## Project Structure

### Routes

```
src/routes/
├── +layout.svelte              # Session initialization
├── +page.svelte                # Main page (/)
├── auth/callback/+server.ts    # OAuth callback
├── search/+page.svelte         # Search results (/search)
└── profile/+page.svelte        # User profile (/profile)
```

### Components

```
src/lib/components/
├── Header.svelte               # Logo + profile dropdown (all pages)
├── SearchBar.svelte            # Search + filter inputs (main, search pages)
├── SearchResultCard.svelte     # Result display
├── InfiniteScroll.svelte       # Infinite scroll loader
├── ProfileCard.svelte          # User info display
└── UsageCard.svelte            # API usage visualization
```

### State Management

```
src/lib/stores/
├── auth.svelte.ts              # Auth state ($state runes)
└── search.ts                   # Search state
```

### Edge Function

```
supabase/functions/
└── search/
    └── index.ts                # GitHub API proxy + Redis caching
```

---

## Authentication Flow

1. User clicks "Sign in with GitHub"
2. `authState.signInWithGitHub(redirectPath?)` → GitHub OAuth
3. GitHub redirects to `/auth/callback?code=xxx&next=/search`
4. Callback exchanges code for session, validates origin, redirects to `next`
5. Client loads session via `authState.loadSession()`

**Key Files**:

- `src/lib/supabase.ts` - Browser client
- `src/hooks.server.ts` - Session validation (all requests)
- `src/routes/auth/callback/+server.ts` - OAuth handler
- `src/lib/stores/auth.svelte.ts` - Auth state

**Protected Routes**: `/search`, `/profile`

### Known Warning: `getSession()` on Client

Supabase SDK가 `getSession()`/`onAuthStateChange()`의 `session.user` 사용 시
보안 경고를 출력하지만, **클라이언트에서는 의도적으로 유지**:

- **서버(SSR)**: JWT 클레임 변조 → 권한 상승 가능 → `getUser()` 필수 ✅
  (`hooks.server.ts`의 `safeGetSession`)
- **클라이언트**: UI 표시용(이름, 아바타)만 사용 → 실질적 위험 없음
  - localStorage 변조 가능 시점 = 이미 XSS = 세션 탈취가 더 큰 위협
- `getUser()` 대체 시 매번 Auth 서버 네트워크 요청 추가 → 불필요한 오버헤드

**규칙**: `session.user`를 **서버에서 권한 판단에 사용하지 않는 한**, 클라이언트
`getSession()` 사용은 허용

---

## GitHub API Architecture

**Flow**: Client → Supabase Edge Function → GitHub API

**Edge Function** (`supabase/functions/search/index.ts`):

- Proxies GitHub Code Search + Repository APIs
- Redis caching (24h TTL, ETag-based conditional requests)
- Graceful fallback on Redis failures
- CORS handling (env-based allowed origins)

**APIs Used**:

- `GET /search/code` - Code search
- `GET /repos/{owner}/{repo}` - Repository metadata

---

## Filter Expression

- **Library**: `filtrex` (safe evaluation, no `eval()`)
- **Allowed Operators**: `>`, `<`, `>=`, `<=`, `==`, `!=`, `&&`, `||`
- **Allowed Fields**: `stars`, `forks`, `language`, `path`, etc.
- **Security**: Critical - prevent code injection

---

## Styling Guidelines

- **Theme**: Terminal/code editor aesthetic (dark mode)
- **Fonts**: JetBrains Mono, Fira Code (monospace)
- **Icons**: Lucide via unplugin-icons (`~icons/lucide/*`)
- **CSS**: Tailwind CSS
- **Design Reference**: `docs/design/*.html` (inspiration only)

---

## Development Checklist

Before committing UI changes:

- [ ] Design reference used as **guide**, not copied verbatim
- [ ] No trademark issues (GitHub → GH in titles)
- [ ] All UI elements serve functional purpose
- [ ] Icons are components (not text)
- [ ] CSS imports before `@theme`
- [ ] Svelte 5 runes (`$state`, `$derived`)
- [ ] Ternary operators for conditional styling
- [ ] Minimal UI changes for state transitions
- [ ] Both GEMINI.md + DEV_LOG.md updated (if applicable)

---

## Documentation Protocol

### When to Update What

| Change Type              | GEMINI.md    | DEV_LOG.md   | TRB Files |
| ------------------------ | ------------ | ------------ | --------- |
| Reusable pattern/mistake | ✅           | ❌           | ❌        |
| Implementation details   | ❌           | ✅           | ❌        |
| Major feature complete   | ✅ (pattern) | ✅ (details) | ❌        |
| Bug fix                  | ❌           | ✅           | ❌        |
| Troubleshooting guide    | ❌           | ❌           | Read-only |

**Rule**: GEMINI.md + DEV_LOG.md updates must happen **together** for
significant changes.

---

_Last Updated: 2026-02-17_\
_This file is optimized for AI consumption. Keep it concise and
pattern-focused._

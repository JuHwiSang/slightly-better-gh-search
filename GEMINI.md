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

### 7. Pagination

- ❌ Complex ellipsis logic with conditional `...`
- ✅ Simple `« < [5 numbers] > »` structure with icons
- Always use `pointer-events-none` on disabled buttons

### 8. Documentation

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
├── Pagination.svelte           # Page navigation
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

_Last Updated: 2026-01-21_\
_This file is optimized for AI consumption. Keep it concise and
pattern-focused._

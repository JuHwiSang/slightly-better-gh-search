# Slightly Better GH Search

Enhanced GitHub Code Search with custom filtering capabilities.

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│          SvelteKit (BFF/SSR)            │
│  • Server-side rendering                │
│  • Session management                   │
│  • API proxy                            │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│      Supabase (Backend Platform)        │
│  ┌───────────────────────────────────┐  │
│  │  Auth (GitHub OAuth)              │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Edge Functions (Deno)            │  │
│  │  • GitHub API integration         │  │
│  │  • Custom filtering               │  │
│  │  • Redis caching layer            │  │
│  └───────────────────────────────────┘  │
└──────┬──────────────────────────────────┘
       │
       ├──────────────┬─────────────────┐
       ▼              ▼                 ▼
┌─────────────┐ ┌──────────┐  ┌────────────────┐
│  GitHub API │ │  Upstash │  │  Supabase Auth │
│             │ │  Redis   │  │                │
│  • Search   │ │  • Cache │  │  • Sessions    │
│  • Repos    │ │  • ETag  │  │  • OAuth       │
└─────────────┘ └──────────┘  └────────────────┘
```

### Request Flow

1. **Client → SvelteKit**: Browser sends request to SvelteKit server
2. **SvelteKit → Supabase Auth**: Validates session (SSR)
3. **SvelteKit → Edge Function**: Proxies API request with auth token
4. **Edge Function → Redis**: Checks cache (with ETag)
5. **Edge Function → GitHub API**: Fetches data if cache miss or stale
6. **Edge Function → Redis**: Updates cache with new data + ETag
7. **Edge Function → SvelteKit → Client**: Returns filtered results

### Deployment

- **Frontend (SvelteKit)**: Vercel (automatic deployment from `main` branch)
- **Backend (Edge Functions)**: Supabase (GitHub Actions deployment)
- **Cache (Redis)**: Upstash (serverless Redis)

---

## Tech Stack

- **BFF/SSR**: SvelteKit
- **Backend**: Supabase Edge Functions (Deno)
- **Cache**: Upstash Redis
- **Auth**: Supabase Auth (GitHub OAuth)
- **Deployment**: Vercel (Frontend) + Supabase (Backend)

---

## SvelteKit (Frontend)

### Environment Variables

| Variable                   | Description            | Required | Example                                   |
| -------------------------- | ---------------------- | -------- | ----------------------------------------- |
| `PUBLIC_SUPABASE_URL`      | Supabase project URL   | ✅ Yes   | `https://xxx.supabase.co`                 |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ Yes   | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Development Setup

1. Create `.env` file in project root:
   ```bash
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Start dev server:
   ```bash
   pnpm dev
   ```

### Deployment (Vercel)

1. Go to Vercel project settings → Environment Variables
2. Add the following variables:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
3. Deploy via Git push (automatic)

---

## Supabase Edge Functions

### Environment Variables

| Variable                        | Description                           | Required     | Example                                             |
| ------------------------------- | ------------------------------------- | ------------ | --------------------------------------------------- |
| `SUPABASE_URL`                  | Supabase project URL                  | ❌ No (auto) | `https://xxx.supabase.co`                           |
| `SUPABASE_ANON_KEY`             | Supabase anonymous key                | ❌ No (auto) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`           |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key (for Vault) | ❌ No (auto) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`           |
| `ALLOWED_ORIGINS`               | Comma-separated allowed CORS origins  | ✅ Yes       | `https://your-app.vercel.app,http://localhost:5173` |
| `UPSTASH_REDIS_REST_URL`        | Upstash Redis REST API URL            | ✅ Yes       | `https://xxx.upstash.io`                            |
| `UPSTASH_REDIS_REST_TOKEN`      | Upstash Redis REST API token          | ✅ Yes       | `AXXXaaaBBBcccDDD...`                               |
| `CACHE_TTL_CODE_SEARCH_SECONDS` | Cache TTL for code search results     | ❌ No        | `3600` (default: 1h)                                |
| `CACHE_TTL_REPOSITORY_SECONDS`  | Cache TTL for repository metadata     | ❌ No        | `86400` (default: 24h)                              |

> **Note**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
> are automatically provided by the Supabase runtime and do not need to be
> manually configured in production secrets.

> **Important**: `SUPABASE_SERVICE_ROLE_KEY` is required for Edge Functions to
> access Supabase Vault for secure GitHub token storage. This key should never
> be exposed to the client.

### Development Setup

1. Create `.env` file in project root for SvelteKit:
   ```bash
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Create `supabase/.env` file for Edge Functions:
   ```bash
   # Service role key (Auto-injected by CLI during serve, but can be set for explicit access)
   # SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # CORS
   ALLOWED_ORIGINS=http://localhost:5173

   # Redis Cache
   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token

   # (Optional) Cache TTL
   CACHE_TTL_CODE_SEARCH_SECONDS=3600
   CACHE_TTL_REPOSITORY_SECONDS=86400
   ```

3. Run Supabase locally:
   ```bash
   pnpm supabase start
   pnpm supabase functions serve --env-file supabase/.env
   ```

### Testing

E2E tests for Edge Functions run against a local Supabase instance.

#### Prerequisites

1. Start local Supabase:

   ```bash
   pnpm supabase start
   ```

2. Get service role key from the output (or run `pnpm supabase status`):
   - **`Authentication Keys - Secret`** is your **`SUPABASE_SERVICE_ROLE_KEY`**.
   - **`Authentication Keys - Publishable`** is your **`SUPABASE_ANON_KEY`**.
   - `Project URL` is your `SUPABASE_URL`.

3. Create `supabase/.env.test` from template:

   ```bash
   cp supabase/.env.test.example supabase/.env.test
   ```

4. Fill in `supabase/.env.test`:
   - `SUPABASE_URL`: Use `http://127.0.0.1:54321` (local)
   - `SUPABASE_ANON_KEY`: Copy `Publishable` key from start output
   - `SUPABASE_SERVICE_ROLE_KEY`: Copy `Secret` key from start output
   - `TEST_GITHUB_TOKEN`: Your GitHub Personal Access Token
   - `UPSTASH_REDIS_REST_URL`: Your Upstash Redis URL
   - `UPSTASH_REDIS_REST_TOKEN`: Your Upstash Redis token

#### Running Tests

1. Start local Supabase in Terminal A:
   ```bash
   pnpm supabase start
   ```

2. Start serving Edge Functions in Terminal B:
   ```bash
   pnpm test:supabase:serve
   ```

3. Run tests in Terminal C:
   ```bash
   pnpm test:supabase
   ```

Alternatively, you can run specific tests or use watch mode:

```bash
# Run tests in watch mode
pnpm test:supabase:watch

# Run specific test file
deno test --allow-net --allow-env --env-file=supabase/.env.test --config=supabase/functions/deno.json supabase/functions/search/index_test.ts
```

#### Test Coverage

- **store-token**: User creation, token storage/update, Vault integration
- **search**: GitHub API integration, filtering, pagination, caching, error
  handling

#### Cleanup

Tests automatically clean up created users and Vault secrets. If tests fail
mid-execution, you may need to manually clean up:

```bash
# Reset local Supabase
pnpm supabase db reset
```

### Deployment (Supabase CLI)

1. Set environment secrets:

   **Option A: Using env file (recommended)**

   Copy the template and fill in production values:
   ```bash
   cp supabase/.env.example supabase/.env.deploy
   # Edit supabase/.env.deploy with production values
   pnpm supabase secrets set --env-file supabase/.env.deploy
   ```

   **Option B: Setting individually**

   ```bash
   pnpm supabase secrets set ALLOWED_ORIGINS=https://your-app.vercel.app
   pnpm supabase secrets set UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   pnpm supabase secrets set UPSTASH_REDIS_REST_TOKEN=your-token
   pnpm supabase secrets set CACHE_TTL_CODE_SEARCH_SECONDS=3600
   pnpm supabase secrets set CACHE_TTL_REPOSITORY_SECONDS=86400
   ```

   > **Note**: `SUPABASE_SERVICE_ROLE_KEY` is auto-injected by the runtime — no
   > need to set it manually.

   ```bash
   # Verify secrets
   pnpm supabase secrets list
   ```

2. Deploy Edge Functions:

   `--import-map` flag is **required** because `supabase functions deploy` does
   not automatically recognize `deno.json` import maps
   ([TRB-010](docs/troubleshooting/TRB-010-edge-function-deploy-import-map.md)):

   ```bash
   pnpm supabase functions deploy search --import-map ./supabase/functions/deno.json
   pnpm supabase functions deploy store-token --import-map ./supabase/functions/deno.json
   ```

#### Deployment Troubleshooting

- **`No such file or directory (os error 2)` during bundling**: This is a
  Docker-based bundling issue. **Quit Docker Desktop completely** and retry —
  Supabase CLI will fall back to local Deno for bundling, which is more stable.
  See
  [TRB-006](docs/troubleshooting/TRB-006-edge-function-deploy-os-error-2.md).

- **Import map packages not found during deploy**: Add the `--import-map` flag
  pointing to `./supabase/functions/deno.json`. This is only needed for deploy —
  `supabase functions serve` recognizes the import map automatically. See
  [TRB-010](docs/troubleshooting/TRB-010-edge-function-deploy-import-map.md).

---

## Development

### Prerequisites

- Node.js 18+
- Supabase CLI

### Quick Start

```bash
# Install dependencies
pnpm install

# Start SvelteKit dev server
pnpm dev

# Start Supabase locally (optional)
pnpm supabase start
pnpm supabase functions serve search
```

### Project Structure

```
├── src/                      # SvelteKit frontend
│   ├── routes/              # Pages
│   ├── lib/                 # Components & utilities
│   └── app.css              # Global styles
├── supabase/
│   └── functions/           # Edge Functions
│       ├── deno.json        # Shared Deno config
│       └── search/          # Search function
│           ├── index.ts     # Main handler
│           ├── filter.ts    # Filter evaluator
│           └── types.ts     # TypeScript types
└── docs/                    # Documentation
```

---

## License

MIT

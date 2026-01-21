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
   npm run dev
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

| Variable                        | Description                           | Required      | Example                                             |
| ------------------------------- | ------------------------------------- | ------------- | --------------------------------------------------- |
| `SUPABASE_URL`                  | Supabase project URL                  | ✅ Yes (auto) | `https://xxx.supabase.co`                           |
| `SUPABASE_ANON_KEY`             | Supabase anonymous key                | ✅ Yes (auto) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`           |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key (for Vault) | ✅ Yes        | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`           |
| `ALLOWED_ORIGINS`               | Comma-separated allowed CORS origins  | ✅ Yes        | `https://your-app.vercel.app,http://localhost:5173` |
| `UPSTASH_REDIS_REST_URL`        | Upstash Redis REST API URL            | ✅ Yes        | `https://xxx.upstash.io`                            |
| `UPSTASH_REDIS_REST_TOKEN`      | Upstash Redis REST API token          | ✅ Yes        | `AXXXaaaBBBcccDDD...`                               |
| `CACHE_TTL_CODE_SEARCH_SECONDS` | Cache TTL for code search results     | ❌ No         | `3600` (default: 1h)                                |
| `CACHE_TTL_REPOSITORY_SECONDS`  | Cache TTL for repository metadata     | ❌ No         | `86400` (default: 24h)                              |

> **Note**: `SUPABASE_URL` and `SUPABASE_ANON_KEY` are automatically provided by
> Supabase runtime.

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
   # Service role key for Vault access
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

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
   supabase start
   supabase functions serve --env-file supabase/.env
   ```

### Deployment (Supabase CLI)

1. Set environment secrets using Supabase CLI:
   ```bash
   # Set service role key (required for Vault)
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Set CORS origins
   supabase secrets set ALLOWED_ORIGINS=https://your-app.vercel.app

   # Set Redis credentials
   supabase secrets set UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   supabase secrets set UPSTASH_REDIS_REST_TOKEN=your-token

   # (Optional) Set cache TTL
   supabase secrets set CACHE_TTL_CODE_SEARCH_SECONDS=3600
   supabase secrets set CACHE_TTL_REPOSITORY_SECONDS=86400

   # Verify secrets
   supabase secrets list
   ```

2. Deploy Edge Functions:
   ```bash
   supabase functions deploy search
   supabase functions deploy store-token
   ```

---

## Development

### Prerequisites

- Node.js 18+
- Supabase CLI

### Quick Start

```bash
# Install dependencies
npm install

# Start SvelteKit dev server
npm run dev

# Start Supabase locally (optional)
supabase start
supabase functions serve search
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

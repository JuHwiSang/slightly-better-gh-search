# Slightly Better GH Search

Enhanced GitHub Code Search with custom filtering capabilities.

## Tech Stack

- **Frontend**: SvelteKit
- **Backend**: Supabase Edge Functions (Deno)
- **Auth**: Supabase Auth (GitHub OAuth)
- **Deployment**: Vercel (Frontend) + Supabase (Edge Functions)

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

| Variable            | Description                          | Required      | Example                                             |
| ------------------- | ------------------------------------ | ------------- | --------------------------------------------------- |
| `SUPABASE_URL`      | Supabase project URL                 | ✅ Yes (auto) | `https://xxx.supabase.co`                           |
| `SUPABASE_ANON_KEY` | Supabase anonymous key               | ✅ Yes (auto) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`           |
| `ALLOWED_ORIGINS`   | Comma-separated allowed CORS origins | ✅ Yes        | `https://your-app.vercel.app,http://localhost:5173` |

> **Note**: `SUPABASE_URL` and `SUPABASE_ANON_KEY` are automatically provided by
> Supabase runtime.

### Development Setup

1. Create `supabase/.env` file:
   ```bash
   ALLOWED_ORIGINS=http://localhost:5173
   ```

2. Run Supabase locally:
   ```bash
   supabase start
   supabase functions serve search --env-file supabase/.env
   ```

### Deployment (GitHub Actions)

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add repository secret:
   - `SUPABASE_ACCESS_TOKEN`: Your Supabase access token
3. Add environment variables in Supabase Dashboard:
   - Project Settings → Edge Functions → Environment Variables
   - Add `ALLOWED_ORIGINS` with production domain
4. Push to `main` branch (GitHub Actions will auto-deploy)

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

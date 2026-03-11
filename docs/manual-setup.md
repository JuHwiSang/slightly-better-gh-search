# Manual Setup & Deployment Guide

This guide describes the manual steps required to set up the project
infrastructure (Supabase and Vercel) from scratch. This is useful for initial
setup or if you need to recreate the environment.

## 1. Supabase Setup

### Project Creation

1. Create a new project in the
   [Supabase Dashboard](https://supabase.com/dashboard).
2. Note down your Database password and Project ID for later use.

### Authentication & Provider Configuration

1. Go to **Authentication > Providers** in your Supabase dashboard.
2. **Disable Email** authentication (since we only use third-party GitHub
   login).
3. **Enable GitHub** authentication. This requires a Client ID and Client Secret
   from GitHub.

### GitHub OAuth App Setup

1. Go to your GitHub account settings: **Developer settings > OAuth Apps > New
   OAuth App**.
2. Fill in your application details.
3. For the **Authorization callback URL** in GitHub, use the callback URL
   provided by Supabase in the GitHub provider settings panel (e.g.,
   `https://<project-id>.supabase.co/auth/v1/callback`).
4. Generate a **Client Secret**.
5. Copy the **Client ID** and **Client Secret** and paste them back into your
   Supabase GitHub provider configuration.

### URL Configuration

1. In Supabase, go to **Authentication > URL Configuration**.
2. **Site URL**: Set this to your production domain (e.g.,
   `https://your-domain.com`).
3. **Redirect URLs**: You must add the allowed callback URLs for your
   application to handle the OAuth redirect:
   - For Production: `https://your-domain.com/auth/callback`
   - For Local Development: `http://localhost:5173/auth/**` (This allows local
     testing)

## 2. Vercel Deployment

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add
   New > Project**.
2. Import the `slightly-better-gh-search` repository from your GitHub account.
3. Configure your environment variables in Vercel before deploying:
   - `PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
   - `PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
   - Additional backend variables as needed.
4. Click **Deploy**. Vercel will automatically detect the SvelteKit framework
   and build the project.
5. Once Vercel finishes deploying, make sure your Vercel production domain
   matches the **Site URL** and **Redirect URLs** in your Supabase
   configuration.

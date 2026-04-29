# DayDesk — Setup Guide

A step-by-step guide to get DayDesk running locally and deployed to Vercel.

**Estimated time:** 30–45 minutes the first time.

You'll need (free tiers are plenty for personal use):
- A computer with **Node.js 18+** installed → https://nodejs.org
- A **GitHub** account → https://github.com
- A **Supabase** account → https://supabase.com
- A **Vercel** account → https://vercel.com

---

## Part 1 — Set up Supabase (the database + auth)

### 1.1 Create the project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Pick an organization (it creates one for you on signup).
4. Fill in:
   - **Name:** `daydesk`
   - **Database password:** generate a strong one and save it somewhere safe (you won't need it for the app, but you'll need it if you ever connect directly to the DB)
   - **Region:** pick the one nearest to you
5. Click **Create new project**. It takes about 2 minutes to provision.

### 1.2 Run the schema

1. In your Supabase project, click the **SQL Editor** icon in the left sidebar (looks like `</>`).
2. Click **+ New query**.
3. Open the file `supabase/schema.sql` from this project, copy its entire contents, and paste it into the editor.
4. Click **Run** (or press Cmd/Ctrl + Enter).
5. You should see "Success. No rows returned." — this is correct.

This created the tables (`tasks`, `areas`, `categories`, `user_settings`), set up Row Level Security so each user only sees their own data, and added a trigger that auto-creates default categories for new signups.

### 1.3 Configure auth

1. In the Supabase sidebar, click **Authentication** → **Providers**.
2. **Email** should already be enabled. Click on it.
3. **For development convenience:** turn **OFF** the "Confirm email" toggle. (You can turn this back on later — it sends users a confirmation link before they can log in. With it off, signup is instant.)
4. Click **Save**.

### 1.4 Grab your API credentials

1. In the sidebar, click the gear icon (**Project Settings**) → **API**.
2. Copy these two values somewhere safe — you'll need them next:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (a long string starting with `eyJ...`)

⚠️ The `anon` key is safe to put in the frontend. Do NOT share the `service_role` key — that one bypasses Row Level Security.

---

## Part 2 — Run the app locally

### 2.1 Install dependencies

Open a terminal in this project's folder and run:

```bash
npm install
```

This will take a minute or two.

### 2.2 Set up environment variables

1. In the project root, create a file called `.env.local` (note the leading dot).
2. Paste this in, replacing the values with what you copied from Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

There's also a `.env.example` in the project showing the same format.

### 2.3 Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should be redirected to the login page.

### 2.4 Create your account

1. Click **Create one** to switch to signup mode.
2. Enter your email and a password (6+ characters).
3. Click **Sign up**.

If you turned off email confirmation in step 1.3, you'll be logged straight in. If you left it on, check your email and click the confirmation link first.

You should now see your DayDesk dashboard with the default categories already created (Meetings, Documentation, Coding, Analysis, Ideating). Try adding a task!

---

## Part 3 — Deploy to Vercel

### 3.1 Push to GitHub

1. Create a new repository on GitHub (private is fine). Don't initialize it with a README — just create an empty one.
2. In your terminal, in the project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

(Replace `YOUR_USERNAME/YOUR_REPO` with your actual GitHub repo path.)

### 3.2 Connect Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (use your GitHub account for easy linking).
2. Click **Add New** → **Project**.
3. Find your `daydesk` repo and click **Import**.
4. Under **Environment Variables**, add the same two variables from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon key
5. Click **Deploy**.

After about 2 minutes you'll get a URL like `daydesk-yourname.vercel.app`. That's your live app.

### 3.3 Update Supabase redirect URLs

For email confirmation links to point at production (not localhost):

1. Go back to Supabase → **Authentication** → **URL Configuration**.
2. Set **Site URL** to your Vercel URL (e.g. `https://daydesk-yourname.vercel.app`).
3. Under **Redirect URLs**, add both:
   - `https://daydesk-yourname.vercel.app/**`
   - `http://localhost:3000/**` (so local dev still works)
4. Click **Save**.

---

## You're done

Every git push to `main` will redeploy automatically. To make changes:

```bash
git add .
git commit -m "describe what you changed"
git push
```

---

## Troubleshooting

**"Failed to fetch" or "Invalid API key" errors:** Double-check your `.env.local` values match exactly what's in Supabase. No quotes, no spaces. Restart `npm run dev` after editing `.env.local`.

**Can sign up but tasks don't appear / "Failed to fetch tasks":** The schema didn't run cleanly. Re-run `supabase/schema.sql` in the SQL editor. The `create policy` lines may say "policy already exists" — that's fine, but every other line should succeed.

**"Email not confirmed" on login:** You left email confirmation on in Supabase. Either click the link in your inbox, or turn off the "Confirm email" toggle in Auth → Providers → Email.

**Build fails on Vercel:** Make sure the env vars are set on Vercel (Project → Settings → Environment Variables). After adding them, redeploy from the Deployments tab.

**Want to wipe your data and start over:** In Supabase SQL Editor, run `delete from public.tasks;` (or `truncate public.tasks, public.areas, public.categories cascade;` to nuke everything except your account).

---

## What's in the project

- `src/app/` — Next.js App Router pages (login + main app)
- `src/components/` — React components (AppProvider, TopBar, Views, NewTaskModal, SidePanel, TaskRow, Toast, AppShell)
- `src/lib/` — Supabase clients (browser + server) and date helpers
- `src/types/` — TypeScript types matching the database schema
- `src/middleware.ts` — Auth route protection (redirects unauthed users to /login)
- `supabase/schema.sql` — Database schema and Row Level Security policies
- `src/app/globals.css` — Warm amber theme (light + dark) and focused mode

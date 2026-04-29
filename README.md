# DayDesk

Personal task tracking — Next.js + Supabase + Vercel.

A multi-user web app version of DayDesk. Each user signs in with email and password and sees only their own tasks (enforced by Postgres Row Level Security).

## Features

- **Today / Week / Someday / History views** — plan your week, focus on today
- **Dashboard** — at-a-glance stats, priority pipeline, upcoming tasks
- **Auto-rollover** — pending tasks from previous days move to today automatically
- **Recurring tasks** — daily, weekdays, weekly (specific days), monthly
- **Areas, Categories (with colors), Tags** — flexible organization
- **Priority** (High/Medium/Low) shown as colored pip
- **Light + Dark themes** with warm amber palette
- **Focused mode** — hides everything except your active view
- **Search** across all tasks
- **Backups** — export to JSON or CSV
- **Keyboard shortcuts** — N (new), F (focus), T (theme), Cmd+K (search)

## Quick start

👉 **Open [SETUP.md](./SETUP.md) for the full step-by-step guide.**

The short version:
1. Create a Supabase project, paste `supabase/schema.sql` into its SQL editor and run.
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL + anon key.
3. `npm install && npm run dev`
4. Push to GitHub, import to Vercel, paste the same env vars there.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS (mostly via CSS variables for the theme)
- Supabase (Auth + Postgres + RLS)
- `@supabase/ssr` for cookie-based session handling

## License

Personal project — use however you like.

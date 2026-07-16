# 🎉 PMSA Fest Dashboard

A modern **dashboard web app** built for the **PMSA Arts Fest** — a centralized interface to manage and view event data, participants, schedules, and insights for the college arts festival.

🔗 **Live Demo:** pmsafestdashboard.vercel.app

---

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in your Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

3. Run the database migration in Supabase SQL editor, or push it with the Supabase CLI:

```bash
supabase db push
```

The executable schema lives at `supabase/migrations/20260716000000_initial_schema.sql`. It creates the tables, enums, indexes, row-level security policies, seed config rows, and the `site-assets` storage bucket used by the admin assets page.

4. Start the app:

```bash
npm run dev
```

## 🚀 Overview

This project is a **Next.js** and **TypeScript** powered dashboard created as the digital hub for the **PMSA Arts Fest 2025–26**. It provides a responsive UI, dynamic content routing, and easy-to-use components that help admins and attendees interact with festival information.

Some examples of what the dashboard can include:

- 🎭 Event schedule overview  
- 📊 Participation stats & analytics  
- 🧑‍💼 Admin panels for event organizers  
- 📱 Fully responsive mobile-first design

---
## 🧱 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router), TypeScript |
| Styling | Tailwind CSS |
| Deployment | Vercel |
| Components | Custom reusable UI components |

---

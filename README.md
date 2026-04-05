# وصيتي — Wasiyati

Post-mortem messaging platform. Users write messages that auto-send to loved ones when they stop logging in.

## Stack
- Next.js 14 (App Router)
- NextAuth v4 (Google OAuth)
- Prisma ORM + PostgreSQL (Neon)
- Google Drive API (message backup)
- Tailwind CSS

## Setup

1. Copy `.env.example` to `.env.local` and fill values
2. `npm install`
3. `npx prisma db push`
4. `npm run dev`

## Env vars needed
- DATABASE_URL — from neon.tech
- NEXTAUTH_SECRET — run: openssl rand -base64 32
- GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET — Google Cloud Console
- CRON_SECRET — run: openssl rand -base64 32

## Make yourself admin
After first login, run in Neon SQL editor:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
```

## Deploy
```bash
vercel deploy --prod
```

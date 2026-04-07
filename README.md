# وصيتي — Wasiyati

Post-mortem messaging platform. Users write messages that auto-send to loved ones when they stop logging in.

## Stack
- Next.js 14 (App Router)
- NextAuth v4 (Google OAuth)
- Prisma ORM + PostgreSQL (Neon)
- Google Drive API (message backup)
- Tailwind CSS

## Quick Start

1. Copy `.env.example` to `.env.local` and fill values
2. `npm install`
3. `npx prisma db push`
4. `npm run dev`

## Environment Variables

Required:
- `DATABASE_URL` — from neon.tech
- `NEXTAUTH_SECRET` — run: `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
- `CRON_SECRET` — run: `openssl rand -base64 32`
- `RESEND_API_KEY` — from Resend (for email)
- `EMAIL_FROM` — sender email address

## Admin Setup

After first login, make yourself admin:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
```

## Google Drive Setup

For Google Drive integration:
- See [GOOGLE_DRIVE_SETUP.md](GOOGLE_DRIVE_SETUP.md) for complete setup guide
- See [GOOGLE_DRIVE_ERRORS.md](GOOGLE_DRIVE_ERRORS.md) for troubleshooting

### Quick Google Drive Checklist
- [ ] Create Google Cloud Project
- [ ] Enable Google Drive API
- [ ] Create OAuth 2.0 credentials
- [ ] Set authorized redirect URIs
- [ ] Add credentials to environment variables
- [ ] Test with `/api/admin/debug/google-api`

## Debugging & Development

### Debug Endpoints (Admin only)
- `GET /api/admin/debug/google-api` — Check Google credentials & API status
- `GET /api/admin/debug/drive` — Check Drive integration for current user
- `GET /api/admin/debug/auth-accounts` — See all user Google accounts

### Available Scripts
- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run start` — Start production server
- `npm run lint` — Run ESLint
- `npm run db:push` — Push Prisma schema changes
- `npm run db:studio` — Open Prisma Studio
- `npm run check-accounts` — Check Google accounts in database

## Troubleshooting

### Common Issues

**Google Drive API not enabled?**
- See [GOOGLE_DRIVE_ERRORS.md](GOOGLE_DRIVE_ERRORS.md#-error-google-drive-api-has-not-been-used-in-project-xxx)
- Use `/api/admin/debug/google-api` endpoint

**Access token missing?**
- See [GOOGLE_DRIVE_TROUBLESHOOTING.md](GOOGLE_DRIVE_TROUBLESHOOTING.md)
- Make sure to click "Allow" when prompted for permissions

**Issues with authentication?**
- Use `/api/admin/debug/auth-accounts` to check account status
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct

## Deployment

### Vercel
```bash
vercel deploy --prod
```

Make sure to set environment variables in Vercel dashboard:
- Settings → Environment Variables
- Add all required variables (see Environment Variables section)

## Documentation

- [Google Drive Setup Guide](GOOGLE_DRIVE_SETUP.md) — Complete guide for setting up Google Drive
- [Google Drive Troubleshooting](GOOGLE_DRIVE_TROUBLESHOOTING.md) — Solutions for common issues
- [Google Drive Errors Reference](GOOGLE_DRIVE_ERRORS.md) — Detailed error messages and solutions


## Deploy
```bash
vercel deploy --prod
```

# Wasiyati Deployment Quick Start

## Installation & Deployment Guide

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL database (Neon.tech recommended)
- Google OAuth credentials
- Environment variables set up

### Installation Steps

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
# Create .env.local with:
# - DATABASE_URL
# - NEXTAUTH_SECRET
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET
# - CRON_SECRET
# - RESEND_API_KEY
# - EMAIL_FROM

# 3. Push database schema
npx prisma db push

# 4. Run development server
npm run dev

# 5. Open http://localhost:3000
```

### Vercel Deployment

```bash
# 1. Push code to GitHub
git add .
git commit -m "Wasiyati professional transformation"
git push origin main

# 2. Connect to Vercel
# Visit: https://vercel.com
# Import project from GitHub

# 3. Set environment variables in Vercel dashboard
# Settings → Environment Variables

# 4. Deploy
# Automatic deployment on push
```

### Key URLs After Deployment

- **Homepage:** https://wasiyati.app
- **Features:** https://wasiyati.app/features
- **FAQ:** https://wasiyati.app/faq
- **Security:** https://wasiyati.app/security
- **Privacy:** https://wasiyati.app/privacy
- **Terms:** https://wasiyati.app/terms
- **About:** https://wasiyati.app/about
- **Contact:** https://wasiyati.app/contact

### SEO Verification

After deployment, verify:

```bash
# 1. Check sitemap
# https://wasiyati.app/sitemap.xml

# 2. Verify robots.txt
# https://wasiyati.app/robots.txt

# 3. Submit to Google Search Console
# https://search.google.com/search-console

# 4. Submit to Bing Webmaster
# https://www.bing.com/webmasters
```

### Security Verification

```bash
# 1. Check security headers
# https://securityheaders.com/?q=wasiyati.app

# 2. SSL check
# https://www.sslshopper.com/ssl-checker.html

# 3. OWASP check
# Use: https://owasp.org/www-project-web-security-testing-guide/
```

### Lighthouse Audit

After deployment:

```bash
# 1. Open Chrome DevTools
# 2. Navigate to Lighthouse tab
# 3. Audit homepage
# Target scores:
# - Performance: 85+
# - Accessibility: 95+
# - Best Practices: 90+
# - SEO: 100
```

### Analytics Setup

Recommended privacy-first analytics:

```bash
# Option 1: Plausible Analytics
# 1. Sign up: https://plausible.io
# 2. Add script to public/analytics.html
# 3. Include in layout.tsx

# Option 2: Fathom Analytics
# 1. Sign up: https://usefathom.com
# 2. Similar setup process

# Option 3: Umami
# Self-hosted option
```

### Monitoring & Alerts

Set up monitoring for:

- ✅ Uptime monitoring (Uptime Robot)
- ✅ Error tracking (Sentry)
- ✅ Performance monitoring (New Relic)
- ✅ Log aggregation (LogRocket)

### Database Backups

Configure automated backups:

```bash
# Neon.tech automatically backs up
# Adjust retention in dashboard
# Recommended: 7-day retention minimum
```

### CDN Configuration

After deployment:

```bash
# 1. Enable Vercel Edge Caching
# Settings → Functions

# 2. Configure image optimization
# Already configured in next.config.js
# Automatic image caching at edge

# 3. Add custom domain
# Domains & DNS in Vercel dashboard
```

### Performance Optimization

After deployment monitor:

```bash
# 1. Core Web Vitals
# https://web.dev/vitals/

# 2. PageSpeed Insights
# https://pagespeed.web.dev/

# 3. WebPageTest
# https://www.webpagetest.org/
```

### Maintenance Tasks

**Weekly:**
- Check error logs
- Monitor uptime
- Review analytics

**Monthly:**
- Security updates
- Dependencies update
- Performance review

**Quarterly:**
- SEO audit
- Security audit
- Feature review

---

## 📧 Email Configuration

For transactional emails:

```bash
# Using Resend (recommended)
# 1. Sign up: https://resend.com
# 2. Verify domain
# 3. Add API key to .env.local
# 4. Emails now send automatically
```

---

## 🔐 SSL/TLS Certificate

Vercel provides automatic SSL:
- ✅ Automatic renewal
- ✅ Free for all deployments
- ✅ A+ rating expected
- ✅ No manual configuration needed

---

## 💡 Next Steps After Deployment

1. **Monitor SEO Rankings** (2-3 months)
2. **Gather User Feedback** (first 30 days)
3. **Optimize Conversions** (A/B testing)
4. **Expand Content** (Blog/case studies)
5. **Implement Advanced Features** (2FA, payments)

---

## 🆘 Troubleshooting

### Homepage not loading?
```
Check: Next.js build output
Run: npm run build
Verify: NODE_ENV=production
```

### SEO not indexing?
```
Check: robots.txt accessible
Verify: sitemap.xml valid
Submit: Google Search Console
Wait: 4-6 weeks for ranking
```

### Dark mode not working?
```
Check: next-themes installed
Verify: HTML has suppressHydrationWarning
Clear: Browser cache
```

### Security headers not showing?
```
Check: middleware.ts in place
Verify: Build successful
Rebuild: npm run build
Deploy: Redeploy to Vercel
```

---

## 📞 Support

- **Documentation:** See PROFESSIONAL_TRANSFORMATION_REPORT.md
- **Email:** support@wasiyati.app
- **Security:** security@wasiyati.app
- **Legal:** legal@wasiyati.app

---

**Last Updated:** May 19, 2026  
**Status:** Production Ready ✅

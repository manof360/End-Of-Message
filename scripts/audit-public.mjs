// Read-only checks against a locally running production build; no account or external services.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const base = process.argv[2] || 'http://localhost:3000'
const origin = 'https://end-of-message.vercel.app'
const publicPaths = ['/', '/about', '/features', '/faq', '/privacy', '/security', '/contact']
const noindexPaths = ['/terms', '/login', '/error', '/keyholder/confirmed', '/keyholder/already-confirmed']
const results = []
const titles = new Set()
const localLinks = new Set()
const pages = new Map()

function attrs(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]))
}
function meta(html, name) {
  return [...html.matchAll(/<meta\s[^>]+>/g)].map(match => attrs(match[0])).find(a => a.name === name || a.property === name)?.content
}
function canonical(html) {
  return [...html.matchAll(/<link\s[^>]+>/g)].map(match => attrs(match[0])).find(a => a.rel === 'canonical')?.href
}
async function get(path) {
  const response = await fetch(new URL(path, base), { redirect: 'manual' })
  return { response, html: await response.text() }
}

for (const path of [...publicPaths, ...noindexPaths]) {
  const { response, html } = await get(path)
  assert.equal(response.status, 200, `${path}: status`)
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1]
  assert.ok(title && !titles.has(title), `${path}: unique title`)
  titles.add(title)
  assert.ok(meta(html, 'description')?.length > 20, `${path}: description`)
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path}: one H1 in server HTML`)
  assert.match(html, /<html[^>]+lang="ar"[^>]+dir="rtl"/, `${path}: Arabic/RTL`)
  assert.equal(canonical(html), `${origin}${path === '/' ? '' : path}`, `${path}: canonical`)
  const isPrivate = noindexPaths.includes(path)
  for (const robot of ['robots', 'googlebot']) {
    assert.match(meta(html, robot), isPrivate ? /noindex/ : /^index,/, `${path}: ${robot}`)
  }
  assert.equal(meta(html, 'og:url'), `${origin}${path === '/' ? '' : path}`)
  assert.ok(meta(html, 'og:image')?.startsWith(`${origin}/opengraph-image`))
  assert.equal(meta(html, 'twitter:card'), 'summary_large_image')
  assert.equal(meta(html, 'og:title'), title)
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  assert.doesNotMatch(markup, /AES-256|ISO 27001|محمية 100%|support@wasiyati.com/)
  for (const match of markup.matchAll(/<a\s[^>]+>/g)) {
    const href = attrs(match[0]).href
    if (href?.startsWith('/') && !href.startsWith('//')) localLinks.add(href)
  }
  pages.set(path, html)
  results.push({ check: `HTML/metadata ${path}`, status: 'pass' })
}

const home = pages.get('/')
for (const id of ['hero-title', 'how-it-works', 'features', 'faq']) assert.ok(home.includes(`id="${id}"`))
assert.match(home, /اكتب لأحبائك اليوم/)
assert.match(home, /هل الخدمة مجانية/)
assert.match(home, /محتوى الرسائل ليس مشفراً/)
const schemas = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
assert.equal(schemas.length, 1)
assert.equal(schemas[0]['@type'], 'WebApplication')
assert.equal(schemas[0].url, origin)
assert.equal(schemas[0].aggregateRating, undefined)
assert.equal(schemas[0].offers, undefined)
results.push({ check: 'Server-rendered home, visible FAQ and factual schema', status: 'pass' })

const sitemap = await get('/sitemap.xml')
assert.equal(sitemap.response.status, 200)
const urls = [...sitemap.html.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]).sort()
assert.deepEqual(urls, publicPaths.map(path => `${origin}${path === '/' ? '' : path}`).sort())
const robots = await get('/robots.txt')
assert.equal(robots.response.status, 200)
assert.match(robots.html, /Disallow: \/api\//)
assert.match(robots.html, /Disallow: \/dashboard/)
assert.match(robots.html, /Disallow: \/admin/)
assert.match(robots.html, new RegExp(`Sitemap: ${origin.replaceAll('.', '\\.')}\/sitemap.xml`))
assert.doesNotMatch(robots.html, /Disallow: \/_next|Disallow: \/login/)
results.push({ check: 'Sitemap public allowlist, robots and crawlable login noindex', status: 'pass' })

for (const href of localLinks) {
  const url = new URL(href, base)
  const path = url.pathname
  const { response, html } = pages.has(path) ? { response: { status: 200 }, html: pages.get(path) } : await get(path)
  assert.equal(response.status, 200, `Link ${href}`)
  if (url.hash) assert.ok(html.includes(`id="${url.hash.slice(1)}"`), `Anchor ${href}`)
}
for (const path of ['/dashboard', '/dashboard/messages', '/dashboard/messages/new', '/dashboard/switch', '/dashboard/keyholders', '/dashboard/drive', '/dashboard/settings', '/dashboard/test', '/admin']) {
  const { response } = await get(path)
  assert.equal(response.status, 307, `${path}: original unauthenticated redirect`)
  assert.equal(new URL(response.headers.get('location'), base).pathname, '/login')
}
results.push({ check: `${localLinks.size} internal links and 9 protected redirects`, status: 'pass' })

const missing = await get('/this-page-does-not-exist')
assert.equal(missing.response.status, 404)
assert.match(missing.html, /لم نعثر على هذه الصفحة/)
assert.match(meta(missing.html, 'robots'), /noindex/)
for (const path of ['/opengraph-image', '/icon.svg', '/manifest.json']) {
  const response = await fetch(new URL(path, base))
  assert.equal(response.status, 200, `${path}: asset`)
  if (path === '/opengraph-image') {
    assert.match(response.headers.get('content-type'), /image\/png/)
    const data = Buffer.from(await response.arrayBuffer())
    assert.equal(data.readUInt32BE(16), 1200)
    assert.equal(data.readUInt32BE(20), 630)
  } else if (path === '/manifest.json') {
    const manifest = await response.json()
    for (const icon of manifest.icons) assert.equal((await fetch(new URL(icon.src, base))).status, 200)
  }
}
results.push({ check: 'Real 404, working PNG share image, SVG icon and manifest', status: 'pass' })

const protectedPaths = ['prisma', 'src/app/api', 'src/app/dashboard', 'src/app/admin', 'src/components/layout', 'src/middleware.ts', 'src/lib/auth.ts', 'src/lib/email.ts', 'src/lib/google-drive.ts', 'src/lib/switch-engine.ts', 'src/lib/prisma.ts', 'src/types', 'package.json', 'package-lock.json', 'next.config.js', 'tailwind.config.ts', 'tsconfig.json', 'vercel.json', '.env.example']
execFileSync('git', ['diff', '--exit-code', 'HEAD', '--', ...protectedPaths], { stdio: 'pipe' })
const original = path => execFileSync('git', ['show', `HEAD:${path}`], { encoding: 'utf8' })
const rootBody = text => text.slice(text.indexOf('export default async function Home')).trim()
assert.equal(rootBody(readFileSync('src/app/page.tsx', 'utf8')), rootBody(original('src/app/page.tsx')))
const googleHandler = text => text.slice(text.indexOf('  const handleGoogleSignIn'), text.indexOf("  if (status === 'loading')")).replaceAll('\r\n', '\n').trim()
assert.equal(googleHandler(readFileSync('src/app/login/page.tsx', 'utf8')), googleHandler(original('src/app/login/page.tsx')))
assert.match(readFileSync('src/app/layout.tsx', 'utf8'), /robots: \{ index: false, follow: false/)
results.push({ check: 'Protected source/config byte equality, original home redirect and Google handler', status: 'pass' })

mkdirSync('docs/verification', { recursive: true })
writeFileSync('docs/verification/public-audit.json', JSON.stringify({ base, sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), results }, null, 2) + '\n')
console.log(JSON.stringify({ checks: results.length, status: 'pass', results }, null, 2))

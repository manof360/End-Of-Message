import type { MetadataRoute } from 'next'
import { SITE_URL, PUBLIC_PATHS } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map(path => ({ url: `${SITE_URL}${path === '/' ? '' : path}` }))
}

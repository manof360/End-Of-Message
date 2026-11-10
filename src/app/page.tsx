import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/app/landing'
import { pageMetadata, SITE_DESCRIPTION } from '@/lib/site'

export const metadata = pageMetadata('رسائل لأحبائك في الوقت الذي تختاره', SITE_DESCRIPTION, '/')

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')
  return <LandingPage />
}

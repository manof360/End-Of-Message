/**
 * Check and verify Google accounts in database
 * Run: npx ts-node scripts/check-accounts.ts
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  try {
    console.log('🔍 Checking Google accounts in database...\n')

    // Get all Google accounts
    const accounts = await prisma.account.findMany({
      where: { provider: 'google' },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    })

    console.log(`Found ${accounts.length} Google accounts\n`)

    // Analyze each account
    let issuesFound = 0
    accounts.forEach((acc, idx) => {
      const hasAccessToken = !!acc.access_token
      const hasRefreshToken = !!acc.refresh_token
      const hasScope = !!acc.scope
      const scopeHasDrive = acc.scope?.includes('drive') ?? false

      const icon = hasAccessToken && hasScope ? '✅' : '⚠️'

      console.log(`${icon} Account ${idx + 1}`)
      console.log(`   User: ${acc.user?.email} (${acc.user?.name})`)
      console.log(`   Access Token: ${hasAccessToken ? '✅' : '❌'}`)
      console.log(`   Refresh Token: ${hasRefreshToken ? '✅' : '❌'}`)
      console.log(`   Scope: ${hasScope ? '✅' : '❌'}`)
      console.log(`   Has Drive Scope: ${scopeHasDrive ? '✅' : '❌'}`)
      console.log(`   Expires At: ${acc.expires_at ? new Date(acc.expires_at * 1000).toISOString() : 'Not set'}`)
      console.log(`   Scope Value: ${acc.scope || 'None'}`)
      console.log()

      if (!hasAccessToken || !hasScope || !scopeHasDrive) {
        issuesFound++
      }
    })

    console.log(`\n📊 Summary:`)
    console.log(`   Total accounts: ${accounts.length}`)
    console.log(`   Accounts with issues: ${issuesFound}`)

    if (issuesFound > 0) {
      console.log(`\n⚠️  Issues found! These users need to re-authenticate with Google Drive.`)
      console.log(`   Ask them to:`)
      console.log(`   1. Sign out from the app`)
      console.log(`   2. Click "Sign in with Google"`)
      console.log(`   3. Click "ربط Google Drive الآن" button`)
      console.log(`   4. Make sure to click "Allow" on the Google Drive permission screen`)
    } else {
      console.log(`\n✅ All accounts look good!`)
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

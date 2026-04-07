// src/lib/google-drive.ts
import { google } from 'googleapis'
import { prisma } from './prisma'

class DriveError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: string,
  ) {
    super(message)
    this.name = 'DriveError'
  }
}

/**
 * Check if Google credentials are configured
 */
export async function areGoogleCredentialsValid(): Promise<boolean> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  return !!(
    clientId &&
    clientId !== 'placeholder' &&
    clientSecret &&
    clientSecret !== 'placeholder'
  )
}

/**
 * Validate account has Drive scope
 */
async function validateDriveScope(account: any): Promise<void> {
  if (!account?.scope?.includes('drive')) {
    throw new DriveError(
      'Drive scope not granted',
      'NO_DRIVE_SCOPE',
      'User has not granted Google Drive permission. Please re-authenticate with Drive access.',
    )
  }
}

/**
 * Get OAuth2 client for a user using their stored tokens
 */
async function getOAuth2Client(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
  })

  console.log('[Drive] getOAuth2Client called for user:', userId)
  console.log('[Drive] Account check:', {
    accountExists: !!account,
    hasAccessToken: !!account?.access_token,
    hasRefreshToken: !!account?.refresh_token,
    hasScope: !!account?.scope,
    scopeValue: account?.scope || 'null',
  })

  if (!account) {
    throw new DriveError(
      'No Google account linked',
      'NO_ACCOUNT',
      'User has not linked a Google account.',
    )
  }

  if (!account.access_token) {
    console.error('[Drive] No access token found. Account details:', {
      accountId: account.id,
      userId: account.userId,
      provider: account.provider,
      scope: account.scope,
      refresh_token: !!account.refresh_token,
      tokenType: account.token_type,
      expiresAt: account.expires_at,
    })
    throw new DriveError(
      'Access token missing',
      'NO_ACCESS_TOKEN',
      'Google access token is missing. User may need to re-authenticate.',
    )
  }

  // Validate Drive scope is present
  await validateDriveScope(account)

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret || clientId === 'placeholder' || clientSecret === 'placeholder') {
    throw new DriveError(
      'Google credentials not configured',
      'MISSING_CREDENTIALS',
      'Server is missing Google OAuth credentials.',
    )
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
  )

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  })

  // Auto-refresh if needed and save new token
  oauth2Client.on('tokens', async (tokens) => {
    try {
      if (tokens.access_token && tokens.refresh_token) {
        console.log('[Drive] Token refreshed, saving to DB')
        await prisma.account.update({
          where: { id: account.id },
          data: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expiry_date
              ? Math.floor(tokens.expiry_date / 1000)
              : undefined,
          },
        })
      }
    } catch (error) {
      console.error('[Drive] Failed to save refreshed token:', error)
    }
  })

  return oauth2Client
}


/**
 * Get or create the Wasiyati folder in user's Google Drive
 */
export async function getOrCreateWasiyatiFolder(userId: string): Promise<string> {
  try {
    // Check if we already have the folder ID
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user?.driveFolderId) {
      console.log('[Drive] Using cached folder ID:', user.driveFolderId)
      return user.driveFolderId
    }

    const auth = await getOAuth2Client(userId)
    const drive = google.drive({ version: 'v3', auth })

    // Search for existing folder
    console.log('[Drive] Searching for Wasiyati folder...')
    const searchRes = await drive.files.list({
      q: "name='وصيتي - Wasiyati' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)',
      spaces: 'drive',
    })

    let folderId: string

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      folderId = searchRes.data.files[0].id!
      console.log('[Drive] Found existing folder:', folderId)
    } else {
      // Create the folder
      console.log('[Drive] Creating new Wasiyati folder...')
      const folderRes = await drive.files.create({
        requestBody: {
          name: 'وصيتي - Wasiyati',
          mimeType: 'application/vnd.google-apps.folder',
          description: 'رسائلي ووصاياي المحفوظة عبر تطبيق وصيتي | Messages saved by Wasiyati app',
        },
        fields: 'id',
        spaces: 'drive',
      })
      folderId = folderRes.data.id!
      console.log('[Drive] Created new folder:', folderId)
    }

    // Save folder ID to user record
    await prisma.user.update({
      where: { id: userId },
      data: { driveFolderId: folderId },
    })

    return folderId
  } catch (error) {
    const msg = (error as any)?.message || String(error)
    console.error('[Drive] Error in getOrCreateWasiyatiFolder:', msg)

    if (msg.includes('insufficientPermissions') || msg.includes('Insufficient Permission')) {
      throw new DriveError(
        'Insufficient permissions to access Google Drive',
        'INSUFFICIENT_PERMISSION',
        'Please ensure you have granted the app permission to access your Google Drive.',
      )
    }

    if (msg.includes('invalid_grant') || msg.includes('Token has been expired')) {
      throw new DriveError(
        'Google authentication token expired',
        'TOKEN_EXPIRED',
        'Please sign out and sign back in to refresh your Google authentication.',
      )
    }

    throw error
  }
}


/**
 * Save a message to Google Drive as a JSON file
 */
export async function saveMessageToDrive(
  userId: string,
  messageId: string,
  messageData: {
    title: string
    content: string
    recipients: { name: string; email?: string; channel: string }[]
    triggerType: string
    scheduledAt?: string | null
    createdAt: string
  }
): Promise<string> {
  try {
    const auth = await getOAuth2Client(userId)
    const drive = google.drive({ version: 'v3', auth })
    const folderId = await getOrCreateWasiyatiFolder(userId)

    const fileContent = JSON.stringify(
      {
        ...messageData,
        wasiyatiMessageId: messageId,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    )

    // Check if file already exists (update vs create)
    const existingMsg = await prisma.message.findUnique({
      where: { id: messageId },
      select: { driveFileId: true },
    })

    let driveFileId: string

    if (existingMsg?.driveFileId) {
      // Update existing file
      console.log('[Drive] Updating existing file:', existingMsg.driveFileId)
      await drive.files.update({
        fileId: existingMsg.driveFileId,
        requestBody: { name: `${messageData.title}.json` },
        media: {
          mimeType: 'application/json',
          body: fileContent,
        },
        fields: 'id',
      })
      driveFileId = existingMsg.driveFileId
    } else {
      // Create new file
      console.log('[Drive] Creating new message file')
      const res = await drive.files.create({
        requestBody: {
          name: `${messageData.title}.json`,
          parents: [folderId],
          description: `وصية: ${messageData.title}`,
        },
        media: {
          mimeType: 'application/json',
          body: fileContent,
        },
        fields: 'id',
      })
      driveFileId = res.data.id!
    }

    // Update message with Drive file ID
    await prisma.message.update({
      where: { id: messageId },
      data: { driveFileId },
    })

    console.log('[Drive] Message saved to Drive:', driveFileId)
    return driveFileId
  } catch (error) {
    const msg = (error as any)?.message || String(error)
    console.error('[Drive] Error saving message:', msg)
    throw error
  }
}

/**
 * Delete a message from Google Drive
 */
export async function deleteMessageFromDrive(userId: string, driveFileId: string): Promise<void> {
  try {
    const auth = await getOAuth2Client(userId)
    const drive = google.drive({ version: 'v3', auth })
    console.log('[Drive] Deleting file:', driveFileId)
    await drive.files.delete({ fileId: driveFileId })
    console.log('[Drive] File deleted successfully')
  } catch (error) {
    // Don't throw - Drive deletion is best effort
    const msg = (error as any)?.message || String(error)
    console.error('[Drive] Failed to delete from Drive:', msg)
  }
}

/**
 * List all message files from user's Drive folder
 */
export async function listMessagesFromDrive(userId: string) {
  try {
    const auth = await getOAuth2Client(userId)
    const drive = google.drive({ version: 'v3', auth })
    const folderId = await getOrCreateWasiyatiFolder(userId)

    console.log('[Drive] Listing messages from folder:', folderId)
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, createdTime, modifiedTime, size)',
      orderBy: 'modifiedTime desc',
      spaces: 'drive',
    })

    console.log('[Drive] Found', res.data.files?.length || 0, 'files')
    return res.data.files || []
  } catch (error) {
    const msg = (error as any)?.message || String(error)
    console.error('[Drive] Error listing messages:', msg)
    throw error
  }
}

/**
 * Get Drive status for a user - used for debugging
 */
export async function getDriveStatus(userId: string) {
  try {
    // Check credentials
    const credsValid = await areGoogleCredentialsValid()
    if (!credsValid) {
      return {
        status: 'error',
        message: 'Server: Google credentials not configured',
        hasAccount: false,
        hasScope: false,
        hasFolderId: false,
        details: {},
      }
    }

    // Check account
    const account = await prisma.account.findFirst({
      where: { userId, provider: 'google' },
      select: {
        access_token: !!true,
        refresh_token: !!true,
        scope: true,
        expires_at: true,
      },
    })

    if (!account) {
      return {
        status: 'error',
        message: 'User: No Google account linked',
        hasAccount: false,
        hasScope: false,
        hasFolderId: false,
        details: {},
      }
    }

    const hasAccessToken = !!account.access_token
    const hasRefreshToken = !!account.refresh_token
    const hasScope = account.scope?.includes('drive') ?? false
    const hasExpiry = !!account.expires_at

    // Check folder
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { driveFolderId: true },
    })
    const hasFolderId = !!user?.driveFolderId

    // Determine overall status
    let status = 'ok'
    let message = 'All good'

    if (!hasAccessToken) {
      status = 'error'
      message = 'User: Missing access token - need to re-authenticate'
    } else if (!hasScope) {
      status = 'warning'
      message = 'User: Drive scope not granted - need to re-authenticate with Drive access'
    } else if (!hasRefreshToken) {
      status = 'warning'
      message = 'User: No refresh token - tokens may expire without ability to refresh'
    }

    return {
      status,
      message,
      hasAccount: true,
      hasAccessToken,
      hasRefreshToken,
      hasScope,
      hasFolderId,
      tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : null,
      scope: account.scope,
      folderId: user?.driveFolderId || null,
    }
  } catch (error) {
    const msg = (error as any)?.message || String(error)
    return {
      status: 'error',
      message: `Error checking Drive status: ${msg}`,
      hasAccount: false,
      hasScope: false,
      hasFolderId: false,
      details: { error: msg },
    }
  }
}

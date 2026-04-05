// src/lib/google-drive.ts
import { google } from 'googleapis'
import { prisma } from './prisma'

/**
 * Get OAuth2 client for a user using their stored tokens
 */
async function getOAuth2Client(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
  })

  if (!account?.access_token) {
    throw new Error('No Google account linked or access token missing')
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  })

  // Auto-refresh if needed and save new token
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          expires_at: tokens.expiry_date
            ? Math.floor(tokens.expiry_date / 1000)
            : undefined,
        },
      })
    }
  })

  return oauth2Client
}

/**
 * Get or create the Wasiyati folder in user's Google Drive
 */
export async function getOrCreateWasiyatiFolder(userId: string): Promise<string> {
  // Check if we already have the folder ID
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.driveFolderId) return user.driveFolderId

  const auth = await getOAuth2Client(userId)
  const drive = google.drive({ version: 'v3', auth })

  // Search for existing folder
  const searchRes = await drive.files.list({
    q: "name='وصيتي - Wasiyati' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id, name)',
  })

  let folderId: string

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    folderId = searchRes.data.files[0].id!
  } else {
    // Create the folder
    const folderRes = await drive.files.create({
      requestBody: {
        name: 'وصيتي - Wasiyati',
        mimeType: 'application/vnd.google-apps.folder',
        description: 'رسائلي ووصاياي المحفوظة عبر تطبيق وصيتي | Messages saved by Wasiyati app',
      },
      fields: 'id',
    })
    folderId = folderRes.data.id!
  }

  // Save folder ID to user record
  await prisma.user.update({
    where: { id: userId },
    data: { driveFolderId: folderId },
  })

  return folderId
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

  return driveFileId
}

/**
 * Delete a message from Google Drive
 */
export async function deleteMessageFromDrive(userId: string, driveFileId: string): Promise<void> {
  try {
    const auth = await getOAuth2Client(userId)
    const drive = google.drive({ version: 'v3', auth })
    await drive.files.delete({ fileId: driveFileId })
  } catch (error) {
    // Don't throw - Drive deletion is best effort
    console.error('Failed to delete from Drive:', error)
  }
}

/**
 * List all message files from user's Drive folder
 */
export async function listMessagesFromDrive(userId: string) {
  const auth = await getOAuth2Client(userId)
  const drive = google.drive({ version: 'v3', auth })
  const folderId = await getOrCreateWasiyatiFolder(userId)

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, createdTime, modifiedTime, size)',
    orderBy: 'modifiedTime desc',
  })

  return res.data.files || []
}

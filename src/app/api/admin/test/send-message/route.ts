import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { triggerMessages } from '@/lib/switch-engine'
import { NextResponse } from 'next/server'

/**
 * Test endpoint to send a message immediately
 * Useful for debugging message delivery across all channels
 * 
 * POST /api/admin/test/send-message
 * Body: {
 *   messageId?: string,  // If provided, send this message
 *   triggerType?: 'SWITCH'|'DATE'|'KEYHOLDER',  // Filter messages by type
 *   channelFilter?: 'EMAIL'|'SMS'|'WHATSAPP',  // Only send to this channel
 * }
 * 
 * Response: {
 *   success: boolean,
 *   messagesTriggered: number,
 *   messagesFound: number,
 *   details: {
 *     messageId,
 *     recipientCount,
 *     channels: string[],
 *     deliveryStatus: {
 *       channel: string,
 *       count: number,
 *       status: 'SENT'|'FAILED'|'PENDING'
 *     }[]
 *   }[]
 * }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only admins can test messages
    if (!session?.user?.email || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { messageId, triggerType, channelFilter } = body

    console.log('[TEST ENDPOINT] Message test triggered', { messageId, triggerType, channelFilter })

    // Find messages to test
    let messagesQuery: any = {
      where: { status: 'ACTIVE' },
      include: {
        recipients: true,
        user: { select: { email: true, name: true, id: true } },
      },
    }

    if (messageId) {
      messagesQuery.where.id = messageId
    } else if (triggerType) {
      messagesQuery.where.triggerType = triggerType
    }

    const messagesToTest = await prisma.message.findMany(messagesQuery)

    if (messagesToTest.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active messages found',
        messagesFound: 0,
        messagesTriggered: 0,
      })
    }

    // Process each message
    const results: any[] = []
    for (const message of messagesToTest as any[]) {
      // Filter recipients by channel if specified
      let recipientsToSend = message.recipients
      if (channelFilter) {
        recipientsToSend = message.recipients.filter((r: any) => r.channel === channelFilter)
      }

      if (recipientsToSend.length === 0) {
        console.log(`[TEST ENDPOINT] No recipients for message ${message.id} with filter ${channelFilter}`)
        results.push({
          messageId: message.id,
          title: message.title,
          triggerType: message.triggerType,
          recipientCount: 0,
          channels: [],
          deliveryStatus: [],
          skipped: true,
          reason: `No recipients with channel ${channelFilter}`,
        })
        continue
      }

      try {
        // Create a modified message object with filtered recipients
        const messageWithFiltered = {
          ...message,
          recipients: recipientsToSend,
        }

        console.log(
          `[TEST ENDPOINT] Triggering message ${message.id} to ${recipientsToSend.length} recipients`
        )

        // Trigger the message
        await triggerMessages(message.userId, [messageWithFiltered] as any)

        // Get updated delivery statuses
        const updatedRecipients = await prisma.recipient.findMany({
          where: { messageId: message.id },
        })

        const deliveryByChannel = updatedRecipients.reduce(
          (acc: any[], r: any) => {
            const existing = acc.find(x => x.channel === r.channel)
            if (existing) {
              existing.count++
              if (r.status) existing.status = r.status
            } else {
              acc.push({ channel: r.channel, count: 1, status: r.status })
            }
            return acc
          },
          []
        )

        results.push({
          messageId: message.id,
          title: message.title,
          triggerType: message.triggerType,
          recipientCount: recipientsToSend.length,
          channels: Array.from(new Set(recipientsToSend.map((r: any) => r.channel))),
          deliveryStatus: deliveryByChannel,
          success: true,
        })

        console.log(
          `[TEST ENDPOINT] ✅ Message ${message.id} delivered to ${recipientsToSend.length} recipients`
        )
      } catch (error) {
        console.error(`[TEST ENDPOINT] ❌ Failed to trigger message ${message.id}:`, error)
        results.push({
          messageId: message.id,
          title: message.title,
          triggerType: message.triggerType,
          recipientCount: message.recipients.length,
          channels: Array.from(new Set(message.recipients.map((r: any) => r.channel))),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: successCount > 0,
      messagesFound: messagesToTest.length,
      messagesTriggered: successCount,
      details: results,
      summary: {
        total: messagesToTest.length,
        succeeded: successCount,
        failed: messagesToTest.length - successCount,
        tested_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('[TEST ENDPOINT] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to test messages',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to list available messages for testing
 * GET /api/admin/test/send-message
 * Query: ?isActive=true&triggerType=DATE
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive') === 'true'
    const triggerType = searchParams.get('triggerType') as any

    // Build query
    const whereClause: any = {}
    if (isActive) whereClause.status = 'ACTIVE'
    if (triggerType) whereClause.triggerType = triggerType

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        recipients: { select: { channel: true, status: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Calculate channel counts
    const enriched = messages.map(m => ({
      id: m.id,
      title: m.title,
      triggerType: m.triggerType,
      status: m.status,
      scheduledAt: m.scheduledAt,
      createdAt: m.createdAt,
      recipientCount: m.recipients.length,
      channels: Array.from(new Set(m.recipients.map((r: any) => r.channel))),
      owner: m.user.name,
      deliveryStatus: m.recipients.reduce(
        (acc: any[], r: any) => {
          const existing = acc.find(x => x.channel === r.channel)
          if (existing) {
            if (r.status === 'SENT') existing.sent++
            else if (r.status === 'FAILED') existing.failed++
            else existing.pending++
          } else {
            acc.push({
              channel: r.channel,
              sent: r.status === 'SENT' ? 1 : 0,
              failed: r.status === 'FAILED' ? 1 : 0,
              pending: r.status === 'SENT' ? 0 : r.status === 'FAILED' ? 0 : 1,
            })
          }
          return acc
        },
        [] as any[]
      ),
    }))

    return NextResponse.json({
      success: true,
      count: enriched.length,
      messages: enriched,
    })
  } catch (error) {
    console.error('[TEST ENDPOINT] GET Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch messages',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

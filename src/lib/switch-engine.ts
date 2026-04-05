// src/lib/switch-engine.ts
import { prisma } from './prisma'
import { sendEmail } from './email'

/**
 * Main cron job function - run daily
 * Check all users with active switches and process accordingly
 */
export async function processSwitches() {
  const now = new Date()
  
  const usersWithActiveSwitch = await prisma.user.findMany({
    where: {
      switchEnabled: true,
      switchStatus: { in: ['ACTIVE', 'WARNING', 'CRITICAL'] },
    },
    include: {
      messages: {
        where: { status: 'ACTIVE', triggerType: 'SWITCH' },
        include: { recipients: true },
      },
    },
  })

  console.log(`[Switch Engine] Processing ${usersWithActiveSwitch.length} users`)

  for (const user of usersWithActiveSwitch) {
    const daysSinceCheckin = Math.floor(
      (now.getTime() - new Date(user.switchLastCheckin).getTime()) / (1000 * 60 * 60 * 24)
    )
    const intervalDays = user.switchIntervalDays

    if (daysSinceCheckin < intervalDays) {
      // User is active — no action needed
      continue
    }

    const overdueDays = daysSinceCheckin - intervalDays

    if (overdueDays < 3) {
      // Stage 1: First warning
      if (user.switchStatus === 'ACTIVE') {
        await sendWarningEmail(user.id, user.email!, user.name, 1, intervalDays)
        await prisma.user.update({
          where: { id: user.id },
          data: { switchStatus: 'WARNING' },
        })
        await logSwitchEvent(user.id, 'REMINDER_SENT', `First warning sent. ${overdueDays} days overdue`)
      }
    } else if (overdueDays < 7) {
      // Stage 2: Critical warning + notify keyholder
      if (user.switchStatus === 'WARNING') {
        await sendWarningEmail(user.id, user.email!, user.name, 2, intervalDays)
        await notifyKeyholders(user.id, user.name)
        await prisma.user.update({
          where: { id: user.id },
          data: { switchStatus: 'CRITICAL' },
        })
        await logSwitchEvent(user.id, 'CRITICAL_SENT', `Critical warning. Keyholder notified. ${overdueDays} days overdue`)
      }
    } else {
      // Stage 3: TRIGGER — send all messages
      if (user.switchStatus === 'CRITICAL') {
        await triggerMessages(user.id, user.messages as any)
        await prisma.user.update({
          where: { id: user.id },
          data: { switchStatus: 'TRIGGERED' },
        })
        await logSwitchEvent(user.id, 'TRIGGERED', `Messages triggered after ${overdueDays} days of inactivity`)
      }
    }
  }

  // Also process DATE-triggered messages
  await processDateTriggers()
}

/**
 * Process messages with a specific scheduled date
 */
async function processDateTriggers() {
  const now = new Date()
  
  const scheduledMessages = await prisma.message.findMany({
    where: {
      triggerType: 'DATE',
      status: 'ACTIVE',
      scheduledAt: { lte: now },
    },
    include: {
      recipients: true,
      user: { select: { email: true, name: true } },
    },
  })

  for (const message of scheduledMessages) {
    await triggerMessages(message.userId, [message] as any)
    console.log(`[Switch Engine] Date-triggered message sent: ${message.id}`)
  }
}

/**
 * Actually send all messages for a user
 */
export async function triggerMessages(userId: string, messages: any[]) {
  for (const message of messages) {
    for (const recipient of message.recipients) {
      try {
        if (recipient.channel === 'EMAIL' && recipient.email) {
          await sendEmail({
            to: recipient.email,
            subject: `رسالة مهمة من ${message.user?.name || 'شخص عزيز'} | Important message`,
            html: generateMessageEmailHTML(message, recipient.name),
          })

          await prisma.recipient.update({
            where: { id: recipient.id },
            data: { status: 'SENT', deliveredAt: new Date() },
          })
        }
        // WhatsApp and SMS would be handled here with respective APIs
      } catch (error) {
        console.error(`Failed to send to ${recipient.email}:`, error)
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: { status: 'FAILED' },
        })
      }
    }

    // Mark message as sent
    await prisma.message.update({
      where: { id: message.id },
      data: { status: 'SENT', sentAt: new Date() },
    })
  }
}

async function sendWarningEmail(userId: string, email: string, name: string | null, stage: number, intervalDays: number) {
  const isFirstWarning = stage === 1
  await sendEmail({
    to: email,
    subject: isFirstWarning
      ? '⚠️ وصيتي: تذكير بتسجيل الدخول | Check-in reminder'
      : '🚨 وصيتي: تحذير أخير | Final warning',
    html: generateCheckinEmailHTML(name || 'المستخدم', intervalDays, isFirstWarning),
  })
}

async function notifyKeyholders(userId: string, userName: string | null) {
  const keyholders = await prisma.keyholder.findMany({
    where: { userId },
  })

  for (const keyholder of keyholders) {
    await sendEmail({
      to: keyholder.email,
      subject: `وصيتي: طلب تأكيد من ${userName || 'المستخدم'}`,
      html: generateKeyholderEmailHTML(keyholder.name, userName || 'المستخدم', keyholder.activationToken),
    })
    await logSwitchEvent(userId, 'KEYHOLDER_NOTIFIED', `Notified keyholder: ${keyholder.email}`)
  }
}

async function logSwitchEvent(userId: string, event: any, details?: string) {
  await prisma.switchLog.create({
    data: { userId, event, details },
  })
}

// Email templates
function generateCheckinEmailHTML(name: string, intervalDays: number, isFirst: boolean): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #1A1208; color: #FDF8F0; padding: 40px 20px; direction: rtl;">
  <div style="max-width: 500px; margin: 0 auto; background: #2A1F0E; border: 1px solid rgba(184,134,11,0.3); border-radius: 12px; padding: 32px;">
    <h1 style="color: #D4A017; font-size: 24px; margin-bottom: 8px;">وصيتي</h1>
    <h2 style="color: #FDF8F0; font-size: 18px; margin-bottom: 24px;">
      ${isFirst ? '⚠️ تذكير بتسجيل الدخول' : '🚨 تحذير أخير'}
    </h2>
    <p style="color: rgba(253,248,240,0.8); line-height: 1.8;">عزيزي ${name}،</p>
    <p style="color: rgba(253,248,240,0.8); line-height: 1.8;">
      لم تسجّل دخولك إلى وصيتي منذ أكثر من ${intervalDays} يوماً.
      ${isFirst 
        ? 'نذكّرك بأن رسائلك ستُرسَل تلقائياً إن استمر الغياب.' 
        : 'هذا آخر تحذير قبل أن يتم إبلاغ الشاهد الموثوق.'}
    </p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/checkin?userId=TOKEN_PLACEHOLDER"
       style="display: inline-block; margin-top: 24px; background: #D4A017; color: #1A1208; padding: 14px 28px; border-radius: 99px; text-decoration: none; font-weight: bold;">
      ✅ أنا بخير — تأكيد الحضور
    </a>
    <p style="margin-top: 24px; color: rgba(253,248,240,0.4); font-size: 12px;">
      يمكنك أيضاً تسجيل الدخول مباشرة على ${process.env.NEXT_PUBLIC_APP_URL}
    </p>
  </div>
</body>
</html>`
}

function generateKeyholderEmailHTML(keyholderName: string, userName: string, token: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #1A1208; color: #FDF8F0; padding: 40px 20px; direction: rtl;">
  <div style="max-width: 500px; margin: 0 auto; background: #2A1F0E; border: 1px solid rgba(184,134,11,0.3); border-radius: 12px; padding: 32px;">
    <h1 style="color: #D4A017; font-size: 24px;">وصيتي</h1>
    <h2 style="color: #FDF8F0;">طلب تأكيد عاجل</h2>
    <p style="color: rgba(253,248,240,0.8); line-height: 1.8;">عزيزي ${keyholderName}،</p>
    <p style="color: rgba(253,248,240,0.8); line-height: 1.8;">
      لقد عيّنك <strong style="color: #D4A017">${userName}</strong> شاهداً موثوقاً في تطبيق وصيتي.
      لم يتمكن من تسجيل الدخول منذ فترة طويلة، ونطلب منك التأكيد.
    </p>
    <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: rgba(253,248,240,0.6); font-size: 13px; margin: 0;">إذا كنت تعلم أنه توفي، اضغط على زر التأكيد لإرسال رسائله لأحبائه.</p>
    </div>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/keyholder/confirm?token=${token}"
       style="display: inline-block; margin-top: 16px; background: #D4A017; color: #1A1208; padding: 14px 28px; border-radius: 99px; text-decoration: none; font-weight: bold;">
      تأكيد وإرسال الرسائل
    </a>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/keyholder/deny?token=${token}"
       style="display: inline-block; margin-top: 12px; margin-right: 12px; border: 1px solid rgba(253,248,240,0.2); color: rgba(253,248,240,0.6); padding: 14px 28px; border-radius: 99px; text-decoration: none;">
      إلغاء — لا يزال بخير
    </a>
  </div>
</body>
</html>`
}

function generateMessageEmailHTML(message: any, recipientName: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #1A1208; color: #FDF8F0; padding: 40px 20px; direction: rtl;">
  <div style="max-width: 560px; margin: 0 auto; background: #2A1F0E; border: 1px solid rgba(184,134,11,0.3); border-radius: 12px; padding: 32px;">
    <h1 style="color: #D4A017; font-size: 24px;">وصيتي</h1>
    <h2 style="color: #FDF8F0; font-size: 18px;">رسالة خاصة لـ ${recipientName}</h2>
    <div style="border-top: 1px solid rgba(184,134,11,0.2); margin: 20px 0; padding-top: 20px;">
      <h3 style="color: #D4A017;">${message.title}</h3>
      <div style="color: rgba(253,248,240,0.85); line-height: 1.9; white-space: pre-wrap;">${message.content}</div>
    </div>
    <p style="margin-top: 32px; color: rgba(253,248,240,0.3); font-size: 12px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
      هذه الرسالة أُرسلت عبر خدمة وصيتي بناءً على تعليمات صاحبها المسبقة.
    </p>
  </div>
</body>
</html>`
}

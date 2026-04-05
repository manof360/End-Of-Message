// src/app/api/cron/process-switches/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { processSwitches } from '@/lib/switch-engine'

// This endpoint is called daily by Vercel Cron
// Configure in vercel.json:
// { "crons": [{ "path": "/api/cron/process-switches", "schedule": "0 8 * * *" }] }

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await processSwitches()
    return NextResponse.json({
      success: true,
      message: 'Switch processing complete',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Switch processing failed:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

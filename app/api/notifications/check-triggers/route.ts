import { NextRequest, NextResponse } from 'next/server';
import { runNotificationChecks } from '@/lib/notification-scheduler';

// POST /api/notifications/check-triggers - Run notification checks
// This endpoint can be called by a cron job or scheduled task
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check for cron jobs
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run all notification checks
    await runNotificationChecks();

    return NextResponse.json({
      success: true,
      message: 'Notification checks completed'
    });
  } catch (error) {
    console.error('Error in notification trigger check:', error);
    return NextResponse.json({
      error: 'Failed to run notification checks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

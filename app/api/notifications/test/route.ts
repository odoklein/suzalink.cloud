import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createNotification } from '@/lib/notification-utils';
import { NotificationType, NotificationPriority } from '@/types/notification';

// POST /api/notifications/test - Create a test notification
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a test notification
    const notification = await createNotification({
      userId: session.user.id,
      type: NotificationType.TASK_ASSIGNED,
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working!',
      priority: NotificationPriority.MEDIUM,
      data: { test: true },
      actionUrl: '/dashboard',
      actionLabel: 'Go to Dashboard',
    });

    return NextResponse.json({
      success: true,
      message: 'Test notification created',
      notification
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    return NextResponse.json({ error: 'Failed to create test notification' }, { status: 500 });
  }
}

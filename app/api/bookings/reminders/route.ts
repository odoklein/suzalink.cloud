import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/notification-service';

// POST /api/bookings/reminders - Send reminders for upcoming bookings
export async function POST(req: NextRequest) {
  try {
    // This endpoint can be called by a cron job or scheduled task
    const upcomingBookings = await NotificationService.getUpcomingBookingsForReminders();
    
    const results = [];
    
    for (const booking of upcomingBookings) {
      try {
        await NotificationService.sendBookingReminder(booking);
        results.push({
          bookingId: booking.id,
          status: 'success',
          message: 'Reminder sent successfully'
        });
      } catch (error) {
        results.push({
          bookingId: booking.id,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      totalProcessed: upcomingBookings.length
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/bookings/reminders - Get upcoming bookings that need reminders
export async function GET(req: NextRequest) {
  try {
    const upcomingBookings = await NotificationService.getUpcomingBookingsForReminders();
    
    return NextResponse.json({ 
      upcomingBookings,
      count: upcomingBookings.length
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
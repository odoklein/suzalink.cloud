import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST /api/bookings/test-notification - Test the notification system
export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Get the booking with all related data
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        meeting_types (
          name,
          duration_minutes
        ),
        users!host_user_id (
          full_name,
          email
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // TODO: Implement notification service when needed
    return NextResponse.json({ 
      success: true, 
      message: 'Notification service not implemented yet',
      booking: {
        id: booking.id,
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        host_name: booking.users.full_name,
        host_email: booking.users.email,
        meeting_type: booking.meeting_types.name,
        start_time: booking.start_time
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/bookings/test-notification - Get test booking info
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get the most recent booking for the user
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        meeting_types (
          name,
          duration_minutes
        ),
        users!host_user_id (
          full_name,
          email
        )
      `)
      .eq('host_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'No bookings found for user' }, { status: 404 });
    }

    return NextResponse.json({ 
      booking: {
        id: booking.id,
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        host_name: booking.users.full_name,
        host_email: booking.users.email,
        meeting_type: booking.meeting_types.name,
        start_time: booking.start_time,
        end_time: booking.end_time
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
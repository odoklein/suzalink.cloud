import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/bookings/test - Test if booking tables exist
export async function GET(req: NextRequest) {
  try {
    // Test if bookings table exists
    const { data: bookingsTest, error: bookingsError } = await supabase
      .from('bookings')
      .select('count')
      .limit(1);

    // Test if meeting_types table exists
    const { data: meetingTypesTest, error: meetingTypesError } = await supabase
      .from('meeting_types')
      .select('count')
      .limit(1);

    // Test if user_calendar_settings table exists
    const { data: calendarTest, error: calendarError } = await supabase
      .from('user_calendar_settings')
      .select('count')
      .limit(1);

    return NextResponse.json({
      bookings: {
        exists: !bookingsError,
        error: bookingsError?.message
      },
      meeting_types: {
        exists: !meetingTypesError,
        error: meetingTypesError?.message
      },
      user_calendar_settings: {
        exists: !calendarError,
        error: calendarError?.message
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
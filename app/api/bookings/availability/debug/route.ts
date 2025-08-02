import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/bookings/availability/debug - Debug availability issues
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const meetingTypeId = searchParams.get('meetingTypeId');
    const date = searchParams.get('date');

    if (!userId || !meetingTypeId || !date) {
      return NextResponse.json({ error: 'User ID, meeting type ID, and date are required' }, { status: 400 });
    }

    // Test calendar settings
    const { data: calendarSettings, error: calendarError } = await supabase
      .from('user_calendar_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Test meeting type
    const { data: meetingType, error: meetingTypeError } = await supabase
      .from('meeting_types')
      .select('*')
      .eq('id', meetingTypeId)
      .single();

    // Test existing bookings
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: existingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('host_user_id', userId)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .neq('status', 'cancelled');

    return NextResponse.json({
      userId,
      meetingTypeId,
      date,
      calendarSettings: {
        exists: !!calendarSettings,
        data: calendarSettings,
        error: calendarError?.message
      },
      meetingType: {
        exists: !!meetingType,
        data: meetingType,
        error: meetingTypeError?.message
      },
      existingBookings: {
        count: existingBookings?.length || 0,
        data: existingBookings,
        error: bookingsError?.message
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST /api/bookings/setup-test - Create test data for booking system
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Create a test meeting type
    const { data: meetingType, error: meetingTypeError } = await supabase
      .from('meeting_types')
      .insert([{
        user_id: userId,
        name: 'Consultation Test',
        description: 'Une consultation de test pour vérifier le système de réservation',
        duration_minutes: 30,
        price: 50,
        color: '#3B82F6',
        is_active: true
      }])
      .select()
      .single();

    if (meetingTypeError) {
      return NextResponse.json({ error: meetingTypeError.message }, { status: 500 });
    }

    // Create default calendar settings
    const { data: calendarSettings, error: calendarError } = await supabase
      .from('user_calendar_settings')
      .insert([{
        user_id: userId,
        timezone: 'Europe/Paris',
        working_hours: {
          monday: { start: "09:00", end: "17:00" },
          tuesday: { start: "09:00", end: "17:00" },
          wednesday: { start: "09:00", end: "17:00" },
          thursday: { start: "09:00", end: "17:00" },
          friday: { start: "09:00", end: "17:00" }
        },
        break_time_minutes: 60,
        slot_duration_minutes: 30,
        advance_booking_days: 30
      }])
      .select()
      .single();

    if (calendarError && !calendarError.message.includes('duplicate')) {
      return NextResponse.json({ error: calendarError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      meetingType,
      bookingUrl: `/book/${meetingType.id}`
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
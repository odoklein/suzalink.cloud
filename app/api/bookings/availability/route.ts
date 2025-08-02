import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/bookings/availability - Get available time slots
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const meetingTypeId = searchParams.get('meetingTypeId');
    const date = searchParams.get('date'); // YYYY-MM-DD format
    const excludeBookingId = searchParams.get('excludeBookingId'); // Optional: exclude this booking from conflict check

    if (!userId || !meetingTypeId || !date) {
      return NextResponse.json({ error: 'User ID, meeting type ID, and date are required' }, { status: 400 });
    }

    // Get user's calendar settings
    let { data: calendarSettings } = await supabase
      .from('user_calendar_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

           // Create default calendar settings if they don't exist
       if (!calendarSettings) {
         const defaultSettings = {
           user_id: userId,
           timezone: 'Europe/Paris',
           working_hours: {
             monday: { start: "09:00", end: "17:00", enabled: true },
             tuesday: { start: "09:00", end: "17:00", enabled: true },
             wednesday: { start: "09:00", end: "17:00", enabled: true },
             thursday: { start: "09:00", end: "17:00", enabled: true },
             friday: { start: "09:00", end: "17:00", enabled: true },
             saturday: { start: "09:00", end: "17:00", enabled: false },
             sunday: { start: "09:00", end: "17:00", enabled: false }
           },
           break_time_minutes: 60,
           slot_duration_minutes: 30,
           advance_booking_days: 30
         };

      const { data: newSettings, error: createError } = await supabase
        .from('user_calendar_settings')
        .insert([defaultSettings])
        .select()
        .single();

      if (createError) {
        console.error('Error creating default calendar settings:', createError);
        return NextResponse.json({ error: 'Failed to create calendar settings' }, { status: 500 });
      }

      calendarSettings = newSettings;
    }

    // Get meeting type details
    const { data: meetingType } = await supabase
      .from('meeting_types')
      .select('*')
      .eq('id', meetingTypeId)
      .single();

    if (!meetingType) {
      return NextResponse.json({ error: 'Meeting type not found' }, { status: 404 });
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = new Date(date).getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    // Check if user works on this day
    const workingHours = calendarSettings.working_hours;
    const daySchedule = workingHours[dayName];

    if (!daySchedule || !daySchedule.enabled || !daySchedule.start || !daySchedule.end) {
      return NextResponse.json({ availableSlots: [] });
    }

    // Get existing bookings for this user on this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let query = supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('host_user_id', userId)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .neq('status', 'cancelled');

    // Exclude the current booking if specified (for edit mode)
    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data: existingBookings } = await query;

    // Get unavailable times for this user on this date
    const { data: unavailableTimes } = await supabase
      .from('user_unavailable_times')
      .select('start_time, end_time, is_all_day')
      .eq('user_id', userId)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString());

    // Generate available time slots
    const availableSlots = generateAvailableSlots(
      date,
      daySchedule,
      calendarSettings.slot_duration_minutes,
      meetingType.duration_minutes,
      existingBookings || [],
      unavailableTimes || []
    );

    console.log('Availability debug:', {
      date,
      dayName,
      daySchedule,
      slotDuration: calendarSettings.slot_duration_minutes,
      meetingDuration: meetingType.duration_minutes,
      existingBookingsCount: existingBookings?.length || 0,
      availableSlotsCount: availableSlots.length
    });

    return NextResponse.json({ availableSlots });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateAvailableSlots(
  date: string,
  daySchedule: { start: string; end: string },
  slotDuration: number,
  meetingDuration: number,
  existingBookings: any[],
  unavailableTimes: any[]
): string[] {
  const slots: string[] = [];
  const [startHour, startMinute] = daySchedule.start.split(':').map(Number);
  const [endHour, endMinute] = daySchedule.end.split(':').map(Number);

  const startTime = new Date(date);
  startTime.setHours(startHour, startMinute, 0, 0);

  const endTime = new Date(date);
  endTime.setHours(endHour, endMinute, 0, 0);

  // Generate slots
  let currentTime = new Date(startTime);
  while (currentTime < endTime) {
    const slotEnd = new Date(currentTime.getTime() + meetingDuration * 60000);
    
    if (slotEnd <= endTime) {
      // Check if this slot conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);
        return (
          (currentTime >= bookingStart && currentTime < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (currentTime <= bookingStart && slotEnd >= bookingEnd)
        );
      });

      // Check if this slot conflicts with unavailable times
      const hasUnavailableConflict = unavailableTimes.some(unavailable => {
        if (unavailable.is_all_day) return true;
        
        const unavailableStart = new Date(unavailable.start_time);
        const unavailableEnd = new Date(unavailable.end_time);
        return (
          (currentTime >= unavailableStart && currentTime < unavailableEnd) ||
          (slotEnd > unavailableStart && slotEnd <= unavailableEnd) ||
          (currentTime <= unavailableStart && slotEnd >= unavailableEnd)
        );
      });

      if (!hasConflict && !hasUnavailableConflict) {
        slots.push(currentTime.toISOString());
      }
    }

    // Move to next slot
    currentTime.setMinutes(currentTime.getMinutes() + slotDuration);
  }

  return slots;
} 
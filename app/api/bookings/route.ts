import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ActivityHelpers } from '@/lib/activity-logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/bookings - Get user's bookings
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    let query = supabase
      .from('bookings')
      .select(`
        *,
        meeting_types (
          id,
          name,
          duration_minutes,
          color
        )
      `)
      .eq('host_user_id', userId)
      .order('start_time', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('start_time', startDate);
    }

    if (endDate) {
      query = query.lte('start_time', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookings: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/bookings - Create a new booking
export async function POST(req: NextRequest) {
  try {
    const {
      meeting_type_id,
      host_user_id,
      guest_name,
      guest_email,
      guest_phone,
      start_time,
      end_time,
      notes,
      meeting_link,
      location,
      client_id,
      prospect_id,
      answers
    } = await req.json();

    // Validate required fields
    if (!meeting_type_id || !host_user_id || !guest_name || !guest_email || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if the time slot is available
    const { data: conflictingBookings } = await supabase
      .from('bookings')
      .select('id, start_time, end_time')
      .eq('host_user_id', host_user_id)
      .neq('status', 'cancelled');

    // Check for conflicts manually
    const hasConflict = conflictingBookings?.some(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      const newStart = new Date(start_time);
      const newEnd = new Date(end_time);
      
      return (
        (newStart >= bookingStart && newStart < bookingEnd) ||
        (newEnd > bookingStart && newEnd <= bookingEnd) ||
        (newStart <= bookingStart && newEnd >= bookingEnd)
      );
    });

    if (hasConflict) {
      return NextResponse.json({ 
        error: 'Time slot is not available',
        details: {
          requestedSlot: { start_time, end_time },
          conflictingBookings: conflictingBookings
        }
      }, { status: 409 });
    }

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        meeting_type_id,
        host_user_id,
        guest_name,
        guest_email,
        guest_phone,
        start_time,
        end_time,
        notes,
        meeting_link,
        location,
        client_id,
        prospect_id
      }])
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
      .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    // Save booking answers if provided
    if (answers && Array.isArray(answers)) {
      const answerRows = answers.map((answer: any) => ({
        booking_id: booking.id,
        question_id: answer.question_id,
        answer: answer.answer
      }));

      const { error: answersError } = await supabase
        .from('booking_answers')
        .insert(answerRows);

      if (answersError) {
        console.error('Error saving booking answers:', answersError);
      }
    }

    // TODO: Send email notifications when notification service is implemented
    console.log('Booking created successfully:', booking.id);

    // Log booking creation activity
    try {
      const meetingTypeName = booking.meeting_types?.name || 'Unknown meeting type';
      const bookingDate = new Date(booking.start_time).toLocaleDateString('fr-FR');
      await ActivityHelpers.logBookingCreated(host_user_id, meetingTypeName, bookingDate);
    } catch (logError) {
      console.error('Error logging booking creation:', logError);
    }

    return NextResponse.json({ booking });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
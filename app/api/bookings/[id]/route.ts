import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/bookings/[id] - Get a single booking
export async function GET(
  req: NextRequest,
  { params }: any
) {
  try {
    console.log('GET /api/bookings/[id] - Fetching booking with ID:', params.id);
    
    // First, try to get the booking without the prospects join to see if it exists
    let { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        meeting_types (
          id,
          name,
          duration_minutes,
          color
        ),
        clients (
          id,
          name,
          contact_email
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (!data) {
      console.log('No booking found with ID:', params.id);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // If the booking has a prospect_id, try to fetch the prospect separately
    if (data.prospect_id) {
      try {
        const { data: prospectData } = await supabase
          .from('prospects')
          .select('id, name, email')
          .eq('id', data.prospect_id)
          .single();
        
        if (prospectData) {
          data.prospects = prospectData;
        }
      } catch (prospectError) {
        console.log('Could not fetch prospect data:', prospectError);
        // Continue without prospect data
      }
    }

    console.log('Booking found:', data);
    return NextResponse.json({ booking: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/bookings/[id] - Update a booking
export async function PATCH(
  req: NextRequest,
  { params }: any
) {
  try {
    const updateData = await req.json();

    // If meeting_type_id is being updated, we need to recalculate end_time
    if (updateData.meeting_type_id) {
      // Get the meeting type to calculate new duration
      const { data: meetingType } = await supabase
        .from('meeting_types')
        .select('duration_minutes')
        .eq('id', updateData.meeting_type_id)
        .single();

      if (meetingType && updateData.start_time) {
        const startTime = new Date(updateData.start_time);
        const endTime = new Date(startTime.getTime() + meetingType.duration_minutes * 60000);
        updateData.end_time = endTime.toISOString();
      }
    }

    // Check for conflicts if time is being changed
    if (updateData.start_time || updateData.end_time) {
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('start_time, end_time, host_user_id')
        .eq('id', params.id)
        .single();

      if (existingBooking) {
        const startTime = updateData.start_time || existingBooking.start_time;
        const endTime = updateData.end_time || existingBooking.end_time;

        // Check for conflicts with other bookings
        const { data: conflicts } = await supabase
          .from('bookings')
          .select('id')
          .eq('host_user_id', existingBooking.host_user_id)
          .neq('id', params.id)
          .neq('status', 'cancelled')
          .or(`start_time.lt.${endTime},end_time.gt.${startTime}`)
          .limit(1);

        if (conflicts && conflicts.length > 0) {
          return NextResponse.json({ 
            error: 'Ce créneau n\'est plus disponible. Veuillez en sélectionner un autre.' 
          }, { status: 409 });
        }
      }
    }

    let { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        meeting_types (
          id,
          name,
          duration_minutes,
          color
        ),
        clients (
          id,
          name,
          contact_email
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If the booking has a prospect_id, try to fetch the prospect separately
    if (data.prospect_id) {
      try {
        const { data: prospectData } = await supabase
          .from('prospects')
          .select('id, name, email')
          .eq('id', data.prospect_id)
          .single();
        
        if (prospectData) {
          data.prospects = prospectData;
        }
      } catch (prospectError) {
        console.log('Could not fetch prospect data:', prospectError);
        // Continue without prospect data
      }
    }

    return NextResponse.json({ booking: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/bookings/[id] - Delete a booking
export async function DELETE(
  req: NextRequest,
  { params }: any
) {
  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';
import { auth } from '@/auth';

// PUT /api/prospects/interlocuteurs/[id] - Update an interlocuteur
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const interlocuteurId = params.id;
    const body = await req.json();
    const { name, email, phone, position, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if interlocuteur exists and get prospect info for logging
    const { data: existingInterlocuteur, error: fetchError } = await supabase
      .from('prospect_interlocuteurs')
      .select('*, prospects(data)')
      .eq('id', interlocuteurId)
      .single();

    if (fetchError || !existingInterlocuteur) {
      return NextResponse.json({ error: 'Interlocuteur not found' }, { status: 404 });
    }

    // Update interlocuteur
    const { data, error } = await supabase
      .from('prospect_interlocuteurs')
      .update({
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        position: position?.trim() || null,
        notes: notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', interlocuteurId)
      .select()
      .single();

    if (error) {
      console.error('Error updating interlocuteur:', error);
      return NextResponse.json({ error: 'Failed to update interlocuteur' }, { status: 500 });
    }

    // Log activity
    const prospectName = existingInterlocuteur.prospects?.data?.name || 'Unknown prospect';
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'interlocuteur_updated',
      `Updated interlocuteur "${name}" for prospect "${prospectName}"`
    );

    return NextResponse.json({ interlocuteur: data });
  } catch (error) {
    console.error('Error in PUT /api/prospects/interlocuteurs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/prospects/interlocuteurs/[id] - Delete an interlocuteur
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const interlocuteurId = params.id;

    // Check if interlocuteur exists and get info for logging
    const { data: existingInterlocuteur, error: fetchError } = await supabase
      .from('prospect_interlocuteurs')
      .select('*, prospects(data)')
      .eq('id', interlocuteurId)
      .single();

    if (fetchError || !existingInterlocuteur) {
      return NextResponse.json({ error: 'Interlocuteur not found' }, { status: 404 });
    }

    // Delete interlocuteur
    const { error } = await supabase
      .from('prospect_interlocuteurs')
      .delete()
      .eq('id', interlocuteurId);

    if (error) {
      console.error('Error deleting interlocuteur:', error);
      return NextResponse.json({ error: 'Failed to delete interlocuteur' }, { status: 500 });
    }

    // Log activity
    const prospectName = existingInterlocuteur.prospects?.data?.name || 'Unknown prospect';
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'interlocuteur_deleted',
      `Deleted interlocuteur "${existingInterlocuteur.name}" from prospect "${prospectName}"`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/prospects/interlocuteurs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

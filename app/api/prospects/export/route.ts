import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

// GET /api/prospects/export?listId=xxx - Export prospects to CSV
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const listId = url.searchParams.get('listId');

    if (!listId) {
      return NextResponse.json({ error: 'List ID is required' }, { status: 400 });
    }

    // Get user profile to check role
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get prospects
    const { data: prospects, error } = await supabase
      .from('prospects')
      .select(`
        id,
        data,
        status,
        created_at,
        updated_at,
        prospect_interlocuteurs(name, email, phone, position)
      `)
      .eq('list_id', listId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching prospects:', error);
      return NextResponse.json({ error: 'Failed to fetch prospects' }, { status: 500 });
    }

    // ROLE-BASED FILTERING: Commercial users export control
    // Note: Since assigned_to column is removed, commercial users can export all prospects for now
    // Later implement list-based filtering
    let filteredProspects = prospects;
    if (userProfile.role === 'commercial') {
      // For now, allow export of all prospects for commercial users
      // Later implement list-based permissions
    }

    // Create CSV content
    const csvHeaders = [
      'Nom de l\'entreprise',
      'Email',
      'Téléphone',
      'Secteur',
      'Site web',
      'Statut',
      'Interlocuteurs',
      'Créé le',
      'Mis à jour le'
    ];

    const csvRows = filteredProspects.map(prospect => {
      const interlocuteurs = prospect.prospect_interlocuteurs
        ?.map(int => `${int.name}${int.email ? ` (${int.email})` : ''}${int.phone ? ` - ${int.phone}` : ''}`)
        ?.join('; ') || '';

      return [
        prospect.data?.name || '',
        prospect.data?.email || '',
        prospect.data?.phone || '',
        prospect.data?.industry || '',
        prospect.data?.website || '',
        prospect.status || '',
        interlocuteurs,
        new Date(prospect.created_at).toLocaleDateString('fr-FR'),
        new Date(prospect.updated_at).toLocaleDateString('fr-FR')
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=prospects_${new Date().toISOString().split('T')[0]}.csv`
      }
    });

  } catch (error) {
    console.error('Error in GET /api/prospects/export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


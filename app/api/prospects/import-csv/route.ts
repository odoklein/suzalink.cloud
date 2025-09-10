import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';
import { auth } from '@/auth';

// POST /api/prospects/import-csv - Import prospects from CSV
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { prospects } = body;
    
    console.log('Import CSV - Received prospects:', prospects?.length || 0);
    console.log('Import CSV - First prospect:', prospects?.[0]);
    
    if (!prospects || !Array.isArray(prospects)) {
      return NextResponse.json({ error: 'Invalid prospects data' }, { status: 400 });
    }
    
    if (prospects.length === 0) {
      return NextResponse.json({ error: 'No prospects to import' }, { status: 400 });
    }
    
    // Validate required fields
    const validProspects = prospects.filter(prospect => {
      const hasName = prospect.name && prospect.name.trim();
      const hasListId = prospect.listId;
      console.log('Validating prospect:', { name: prospect.name, listId: prospect.listId, hasName, hasListId });
      return hasName && hasListId;
    });
    
    console.log('Valid prospects:', validProspects.length, 'out of', prospects.length);
    
    if (validProspects.length === 0) {
      return NextResponse.json({ error: 'No valid prospects found. Each prospect must have a name and listId.' }, { status: 400 });
    }
    
    // Prepare prospects for insertion
    const prospectsToInsert = validProspects.map(prospect => {
      // Build the data JSONB object
      const data: any = {
        name: prospect.name.trim(),
      };
      
      // Add other fields to data if they exist
      if (prospect.email?.trim()) data.email = prospect.email.trim();
      if (prospect.phone?.trim()) data.phone = prospect.phone.trim();
      if (prospect.industry?.trim()) data.industry = prospect.industry.trim();
      if (prospect.website?.trim()) data.website = prospect.website.trim();
      if (prospect.notes?.trim()) data.notes = prospect.notes.trim();
      
      const prospectData: any = {
        list_id: prospect.listId,
        data: data,
        status: prospect.status || 'nouveau',
        created_by: session.user.id
      };
      
      // Note: assigned_to column has been removed from prospects table
      // Individual prospect assignment functionality has been replaced by list assignments
      
      return prospectData;
    });
    
    // Insert prospects in batches to avoid timeout
    const batchSize = 100;
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < prospectsToInsert.length; i += batchSize) {
      const batch = prospectsToInsert.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('prospects')
        .insert(batch)
        .select('id');
      
      if (error) {
        console.error('Error inserting batch:', error);
        errors += batch.length;
      } else {
        imported += data?.length || 0;
      }
    }
    
    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'prospects_imported',
      `Imported ${imported} prospects from CSV`
    );
    
    return NextResponse.json({
      success: true,
      imported,
      errors,
      total: prospects.length,
      skipped: prospects.length - validProspects.length
    });
    
  } catch (error) {
    console.error('Error in POST /api/prospects/import-csv:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

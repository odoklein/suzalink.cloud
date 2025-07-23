import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const { listId } = await params;
  const { columns: newColumns, prospects: newProspects } = await req.json();

  if (!listId || !newColumns || !newProspects) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // Step 1: Fetch the current list to get existing columns
    const { data: listData, error: listError } = await supabase
      .from('prospection_lists')
      .select('columns')
      .eq('id', listId)
      .single();

    if (listError) throw listError;

    // Step 2: Merge existing columns with new columns, avoiding duplicates
    const existingColumns = listData.columns || [];
    const existingColumnKeys = new Set(existingColumns.map((c: any) => c.key));
    const mergedColumns = [...existingColumns];

    newColumns.forEach((newCol: any) => {
      if (!existingColumnKeys.has(newCol.key)) {
        mergedColumns.push(newCol);
      }
    });

    // Step 3: Update the list with the new merged columns
    const { error: updateError } = await supabase
      .from('prospection_lists')
      .update({ columns: mergedColumns, updated_at: new Date().toISOString() })
      .eq('id', listId);

    if (updateError) throw updateError;

    // Step 4: Prepare prospect data for insertion
    const prospectsToInsert = newProspects.map((prospect: any) => ({
      list_id: listId,
      data: prospect,
    }));

    // Step 5: Bulk insert new prospects
    const { data: insertedProspects, error: insertError } = await supabase
      .from('prospects')
      .insert(prospectsToInsert)
      .select();

    if (insertError) throw insertError;

    return NextResponse.json({ 
      message: 'Import successful',
      importedCount: insertedProspects.length 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Import failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

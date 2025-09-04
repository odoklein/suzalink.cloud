import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create server-side Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params;
    const { columns: incomingColumns, prospects: incomingProspects } = await req.json();

    console.log('🚀 CSV API DEBUG: Import request received');
    console.log('  - listId:', listId);
    console.log('  - columns:', incomingColumns?.length);
    console.log('  - prospects:', incomingProspects?.length);

    if (!listId || !Array.isArray(incomingColumns) || !Array.isArray(incomingProspects)) {
      console.log('❌ CSV API DEBUG: Invalid request data');
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    if (incomingProspects.length === 0) {
      console.log('⚠️ CSV API DEBUG: No prospects to import');
      return NextResponse.json({ message: 'No prospects to import', importedCount: 0 }, { status: 200 });
    }
    // 1) Fetch current list columns
    console.log('📋 CSV API DEBUG: Fetching current list data...');
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('columns')
      .eq('id', listId)
      .single();
    
    if (listError) {
      console.error('❌ CSV API DEBUG: Failed to fetch list:', listError);
      throw listError;
    }

    console.log('📋 CSV API DEBUG: Current list columns:', listData?.columns);
    const existingColumns: string[] = Array.isArray(listData?.columns) ? listData.columns : [];
    const mergedColumns = Array.from(new Set([...(existingColumns || []), ...incomingColumns]));
    console.log('📋 CSV API DEBUG: Merged columns:', mergedColumns);

    // 2) Update list columns if changed
    if (JSON.stringify(existingColumns) !== JSON.stringify(mergedColumns)) {
      console.log('🔄 CSV API DEBUG: Updating list columns...');
      const { error: updateError } = await supabase
        .from('lists')
        .update({ columns: mergedColumns, updated_at: new Date().toISOString() })
        .eq('id', listId);
      if (updateError) {
        console.error('❌ CSV API DEBUG: Failed to update list columns:', updateError);
        throw updateError;
      }
      console.log('✅ CSV API DEBUG: List columns updated successfully');
    } else {
      console.log('ℹ️ CSV API DEBUG: No column changes needed');
    }

    // 3) Prepare and insert items into list_items
    console.log('📊 CSV API DEBUG: Preparing items for insertion...');
    const columnsSet = new Set(mergedColumns);
    const itemsToInsert = incomingProspects.map((row: Record<string, any>, index: number) => {
      const filtered: Record<string, any> = {};
      for (const key of Object.keys(row)) {
        if (columnsSet.has(key)) {
          filtered[key] = row[key];
        }
      }
      
      // Log first few rows for debugging
      if (index < 3) {
        console.log(`📊 CSV API DEBUG: Sample row ${index + 1}:`, filtered);
      }
      
      return { list_id: listId, data: filtered };
    });

    console.log('💾 CSV API DEBUG: Inserting', itemsToInsert.length, 'items...');
    
    if (itemsToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('list_items')
        .insert(itemsToInsert)
        .select('id');
        
      if (insertError) {
        console.error('❌ CSV API DEBUG: Failed to insert items:', insertError);
        throw insertError;
      }
      
      const insertedCount = inserted?.length ?? 0;
      console.log('✅ CSV API DEBUG: Successfully inserted', insertedCount, 'items');
      
      return NextResponse.json({ 
        message: 'Import successful', 
        importedCount: insertedCount,
        columnsUpdated: JSON.stringify(existingColumns) !== JSON.stringify(mergedColumns)
      }, { status: 200 });
    }

    console.log('⚠️ CSV API DEBUG: No items to insert');
    return NextResponse.json({ message: 'Nothing to import', importedCount: 0 }, { status: 200 });
    
  } catch (error: any) {
    console.error('💥 CSV API DEBUG: Import failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

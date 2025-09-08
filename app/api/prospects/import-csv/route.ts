import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';
import { auth } from '@/auth';

// Helper function to detect column types
function detectColumnType(values: string[]): {
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'boolean';
  isPhone: boolean;
} {
  // Sample the first 10 non-empty values or all if less than 10
  const sampleValues = values.filter(v => v).slice(0, 10);
  
  if (sampleValues.length === 0) {
    return { type: 'text', isPhone: false };
  }
  
  // Check for email pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (sampleValues.some(v => emailRegex.test(v))) {
    return { type: 'email', isPhone: false };
  }
  
  // Check for phone pattern
  const phoneRegex = /^\+?[\d\s\-\(\)\.]{7,20}$/;
  if (sampleValues.some(v => phoneRegex.test(v))) {
    return { type: 'phone', isPhone: true };
  }
  
  // Check for number pattern
  const numberRegex = /^-?\d+(\.\d+)?$/;
  if (sampleValues.every(v => numberRegex.test(v))) {
    return { type: 'number', isPhone: false };
  }
  
  // Check for date pattern (simple check)
  const dateRegex = /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/;
  if (sampleValues.some(v => dateRegex.test(v))) {
    return { type: 'date', isPhone: false };
  }
  
  // Check for boolean pattern
  const boolValues = ['true', 'false', 'yes', 'no', '1', '0'];
  if (sampleValues.every(v => boolValues.includes(v.toLowerCase()))) {
    return { type: 'boolean', isPhone: false };
  }
  
  // Default to text
  return { type: 'text', isPhone: false };
}

// POST /api/prospects/import-csv - Import prospects from CSV
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const {
      listId,
      listName,
      clientId,
      contributors,
      headers,
      data,
      columnMappings,
      phoneColumns = []
    } = body;
    
    if (!headers || !Array.isArray(headers) || !data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid CSV data format' }, { status: 400 });
    }
    
    // Create a new list if listId is not provided
    let targetListId = listId;
    
    if (!targetListId) {
      if (!listName) {
        return NextResponse.json({ error: 'List name is required for new lists' }, { status: 400 });
      }
      
      const { data: newList, error: listError } = await supabase
        .from('prospect_lists')
        .insert({
          name: listName,
          client_id: clientId || null,
          created_by: session.user.id,
          status: 'active',
          prospect_count: data.length
        })
        .select()
        .single();

      if (listError) {
        console.error('Error creating list:', listError);
        return NextResponse.json({ error: listError.message }, { status: 500 });
      }

      targetListId = newList.id;

      // Add contributors if provided
      if (contributors && Array.isArray(contributors) && contributors.length > 0) {
        const contributorInserts = contributors.map((contributorId: string) => ({
          prospect_list_id: targetListId,
          user_id: contributorId,
          assigned_by: session.user.id
        }));

        const { error: contributorError } = await supabase
          .from('prospect_list_contributors')
          .insert(contributorInserts);

        if (contributorError) {
          console.error('Error adding contributors:', contributorError);
          // Don't fail the whole operation, just log the error
        }
      }

      // Log activity for new list
      await ActivityHelpers.logUserActivity(
        session.user.id,
        'prospect_list_created',
        `Created prospect list from CSV import: ${listName}${contributors?.length ? ` with ${contributors.length} contributors` : ''}`
      );
    } else {
      // Update prospect count for existing list
      await supabase
        .from('prospect_lists')
        .update({ 
          prospect_count: supabase.rpc('get_prospect_count', { list_id: targetListId }),
          updated_at: new Date().toISOString()
        })
        .eq('id', targetListId);
    }
    
    // Process column mappings or detect automatically
    const finalMappings = columnMappings || headers;
    
    // First, check if there are existing columns for this list and delete them if this is an update
    if (listId) {
      const { error: deleteError } = await supabase
        .from('prospect_columns')
        .delete()
        .eq('list_id', targetListId);
      
      if (deleteError) {
        console.error('Error deleting existing columns:', deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    }
    
    // Create columns for the list - ensure column names are unique
    const columnsToInsert = [];
    const columnTypes: Record<string, { type: string; isPhone: boolean }> = {};
    const uniqueColumnNames = new Set<string>();
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      let columnName = finalMappings[i] || header;
      
      // Ensure column name is unique by appending a number if needed
      let counter = 1;
      let uniqueColumnName = columnName;
      while (uniqueColumnNames.has(uniqueColumnName)) {
        uniqueColumnName = `${columnName}_${counter}`;
        counter++;
      }
      uniqueColumnNames.add(uniqueColumnName);
      columnName = uniqueColumnName;
      
      const isPhoneColumn = phoneColumns.includes(header);
      
      // Extract all values for this column to detect type
      const columnValues = data.map(row => row[i]).filter(Boolean);
      
      // If it's marked as a phone column, force type to phone
      let type = 'text';
      let isPhone = isPhoneColumn;
      
      if (!isPhoneColumn) {
        // Only detect type if not explicitly marked as phone
        const detected = detectColumnType(columnValues);
        type = detected.type;
        isPhone = detected.isPhone;
      } else {
        type = 'phone';
      }
      
      columnsToInsert.push({
        list_id: targetListId,
        column_name: columnName,
        column_type: type,
        is_phone: isPhone || isPhoneColumn,
        display_order: i
      });
      
      columnTypes[columnName] = { type, isPhone: isPhone || isPhoneColumn };
    }
    
    // Insert columns
    if (columnsToInsert.length > 0) {
      const { error: columnsError } = await supabase
        .from('prospect_columns')
        .insert(columnsToInsert);
      
      if (columnsError) {
        console.error('Error creating columns:', columnsError);
        return NextResponse.json({ error: columnsError.message }, { status: 500 });
      }
    }
    
    // Process and insert prospects
    const prospectsToInsert = data.map(row => {
      const prospectData: Record<string, any> = {};
      let hasPhone = false;
      let phoneNumber = null;
      let phoneColumn = null;
      
      // Convert row array to object using mapped column names
      for (let i = 0; i < row.length && i < headers.length; i++) {
        const headerName = headers[i];
        // Use the unique column name we generated
        const columnName = Array.from(uniqueColumnNames)[i];
        prospectData[columnName] = row[i];
        
        // Check if this is a phone column and has a value
        if ((columnTypes[columnName]?.isPhone || phoneColumns.includes(headerName)) && row[i]) {
          hasPhone = true;
          phoneNumber = row[i];
          phoneColumn = columnName;
        }
      }
      
      return {
        list_id: targetListId,
        data: prospectData,
        has_phone: hasPhone,
        phone_number: phoneNumber,
        phone_column: phoneColumn,
        created_by: session.user.id
      };
    });
    
    // Insert prospects in batches of 100
    const batchSize = 100;
    const results = [];
    
    for (let i = 0; i < prospectsToInsert.length; i += batchSize) {
      const batch = prospectsToInsert.slice(i, i + batchSize);
      const { data: insertedBatch, error: batchError } = await supabase
        .from('prospects')
        .insert(batch)
        .select('id');
      
      if (batchError) {
        console.error(`Error inserting prospects batch ${i / batchSize + 1}:`, batchError);
        return NextResponse.json({ error: batchError.message }, { status: 500 });
      }
      
      results.push(...insertedBatch);
    }
    
    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'prospects_imported',
      `Imported ${prospectsToInsert.length} prospects to list`
    );
    
    return NextResponse.json({
      success: true,
      listId: targetListId,
      importedCount: results.length,
      columns: columnsToInsert.map(c => ({ name: c.column_name, type: c.column_type, isPhone: c.is_phone }))
    });
  } catch (error) {
    console.error('Error in POST /api/prospects/import-csv:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
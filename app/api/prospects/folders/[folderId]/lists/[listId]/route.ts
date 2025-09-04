import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createClient } from '@supabase/supabase-js';

// Create server-side Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string; listId: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { folderId, listId } = await params;
    
    console.log('🔍 API DEBUG: Fetching list data');
    console.log('  - folderId:', folderId);
    console.log('  - listId:', listId);
    console.log('  - userId:', session.user.id);

    // Fetch list metadata - validate it belongs to the correct folder
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('*')
      .eq('id', listId)
      .eq('folder_id', folderId)
      .single();

    console.log('📡 API DEBUG: List query result:');
    console.log('  - data:', listData);
    console.log('  - error:', listError);

    if (listError) {
      console.error('❌ API DEBUG: List error:', listError);
      return NextResponse.json({ error: 'Failed to fetch list: ' + listError.message }, { status: 500 });
    }

    if (!listData) {
      console.error('❌ API DEBUG: No list data found');
      return NextResponse.json({ error: 'List not found or doesn\'t belong to this folder' }, { status: 404 });
    }

    console.log('✅ API DEBUG: List found:', listData.name);

    // Fetch prospects for this list
    const { data: prospectRows, error: prospectsError } = await supabase
      .from('list_items')
      .select('id, data')
      .eq('list_id', listId);

    console.log('📡 API DEBUG: Prospects query result:');
    console.log('  - data length:', prospectRows?.length);
    console.log('  - error:', prospectsError);

    if (prospectsError) {
      console.error('❌ API DEBUG: Prospects error:', prospectsError);
      return NextResponse.json({ error: 'Failed to load prospects: ' + prospectsError.message }, { status: 500 });
    }

    console.log('✅ API DEBUG: Returning data successfully');
    
    return NextResponse.json({
      list: listData,
      prospects: prospectRows || []
    });

  } catch (error: any) {
    console.error('💥 API DEBUG: Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handles GET (get folder details and its lists)
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest, { params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await params;
  try {
    // Get folder details
    const { data: folder, error: folderError } = await supabase.from('folders').select('*').eq('id', folderId).single();
    if (folderError) throw folderError;
    // Get lists in this folder
    const { data: lists, error: listsError } = await supabase.from('lists').select('*').eq('folder_id', folderId);
    if (listsError) throw listsError;
    return NextResponse.json({ folder, lists });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

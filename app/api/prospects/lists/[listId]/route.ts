// Handles GET (get list metadata and parse CSV)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

// Create server-side Supabase client with service role key to bypass RLS
// Fallback to anon key if service role key is not available (for production compatibility)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function fetchCsv(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch CSV');
  return await res.text();
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  try {
    // Get list metadata
    const { data: list, error: listError } = await supabaseAdmin.from('lists').select('*').eq('id', listId).single();
    if (listError) throw listError;
    // Fetch and parse CSV
    const csvText = await fetchCsv(list.csv_url);
    const parsed = Papa.parse(csvText, { header: true });
    if (parsed.errors.length) throw new Error(parsed.errors[0].message);
    // Filter only selected columns
    const filteredData = parsed.data.map((row: any) => {
      const filteredRow: any = {};
      for (const col of list.columns) {
        filteredRow[col] = row[col];
      }
      return filteredRow;
    });
    return NextResponse.json({ list, data: filteredData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

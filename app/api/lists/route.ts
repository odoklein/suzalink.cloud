import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET: fetch lists, optionally by folderId or id
export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get("folderId");
  const id = req.nextUrl.searchParams.get("id");
  let query = supabase.from("prospection_lists").select("id, name, folder_id, columns, created_at, updated_at");
  if (folderId) query = query.eq("folder_id", folderId);
  if (id) {
    const { data: singleData, error: singleError } = await query.eq("id", id).single();
    if (singleError) {
      console.error("Error fetching single list:", singleError);
      return NextResponse.json({ error: singleError.message }, { status: 500 });
    }
    return NextResponse.json({
      id: singleData.id,
      name: singleData.name,
      folderId: singleData.folder_id,
      columns: singleData.columns,
      createdAt: singleData.created_at,
      updatedAt: singleData.updated_at,
    });
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching lists:", error);
    return NextResponse.json([], { status: 200 }); // Return empty array on error
  }
  if (!data) {
    return NextResponse.json([], { status: 200 }); // Return empty array if no data
  }
  return NextResponse.json(data.map(row => ({
    id: row.id,
    name: row.name,
    folderId: row.folder_id,
    columns: row.columns,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })));
}

// POST: create new list with columns
export async function POST(req: NextRequest) {
  const { name, folderId, columns } = await req.json();
  if (!name || !folderId || !columns) return NextResponse.json({ error: "Missing name, folderId, or columns" }, { status: 400 });
  const { data, error } = await supabase
    .from("prospection_lists")
    .insert([{ name, folder_id: folderId, columns }])
    .select("id, name, folder_id, columns, created_at, updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    id: data.id,
    name: data.name,
    folderId: data.folder_id,
    columns: data.columns,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }, { status: 201 });
}

// PUT: update list (name or columns)
export async function PUT(req: NextRequest) {
  const { id, name, columns } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const update: any = { updated_at: new Date().toISOString() };
  if (name) update.name = name;
  if (columns) update.columns = columns;
  const { data, error } = await supabase
    .from("prospection_lists")
    .update(update)
    .eq("id", id)
    .select("id, name, folder_id, columns, created_at, updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    id: data.id,
    name: data.name,
    folderId: data.folder_id,
    columns: data.columns,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
}

// DELETE: remove list
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabase
    .from("prospection_lists")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

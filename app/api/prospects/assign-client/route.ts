import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST: Assign folder or list to a client
export async function POST(req: NextRequest) {
  try {
    const { type, id, client_id } = await req.json();

    if (!type || !id) {
      return NextResponse.json(
        { error: "Type and ID are required" },
        { status: 400 }
      );
    }

    let tableName: string;
    if (type === 'folder') {
      tableName = 'folders';
    } else if (type === 'list') {
      tableName = 'lists';
    } else {
      return NextResponse.json(
        { error: "Type must be 'folder' or 'list'" },
        { status: 400 }
      );
    }

    // Update the folder or list with client_id
    const { data, error } = await supabase
      .from(tableName)
      .update({ client_id: client_id || null })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating ${type}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `${type} assigned successfully`,
      data 
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET: Get folders and lists assigned to a specific client
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const client_id = searchParams.get("client_id");

    if (!client_id) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    // Get folders assigned to this client
    const { data: folders, error: foldersError } = await supabase
      .from("folders")
      .select("id, name, created_at, user_id")
      .eq("client_id", client_id)
      .order("created_at", { ascending: false });

    if (foldersError) {
      console.error("Error fetching folders:", foldersError);
      return NextResponse.json({ error: foldersError.message }, { status: 500 });
    }

    // Get lists assigned to this client
    const { data: lists, error: listsError } = await supabase
      .from("lists")
      .select("id, name, folder_id, created_at, csv_url, columns")
      .eq("client_id", client_id)
      .order("created_at", { ascending: false });

    if (listsError) {
      console.error("Error fetching lists:", listsError);
      return NextResponse.json({ error: listsError.message }, { status: 500 });
    }

    return NextResponse.json({
      folders: folders || [],
      lists: lists || []
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 
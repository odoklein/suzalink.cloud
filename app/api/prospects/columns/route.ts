import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { list_id, column_name, column_type, display_order } = await req.json();

    if (!list_id || !column_name || !column_type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check if user has access to this list
    const { data: list, error: listError } = await supabase
      .from("prospect_lists")
      .select("id, created_by")
      .eq("id", list_id)
      .single();

    if (listError || !list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.created_by !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create new column
    const { data: newColumn, error: insertError } = await supabase
      .from("prospect_columns")
      .insert({
        list_id,
        column_name,
        column_type,
        display_order: display_order || 1,
        is_phone: column_type === "phone"
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating column:", insertError);
      return NextResponse.json(
        { error: "Failed to create column" },
        { status: 500 }
      );
    }

    return NextResponse.json(newColumn);
  } catch (error) {
    console.error("Error in POST /api/prospects/columns:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

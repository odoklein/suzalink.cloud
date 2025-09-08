import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { list_id, columns } = await req.json();

    if (!list_id || !Array.isArray(columns)) {
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

    // Update each column's display order
    const updatePromises = columns.map(async (column: any) => {
      const { error } = await supabase
        .from("prospect_columns")
        .update({
          display_order: column.display_order
        })
        .eq("id", column.id)
        .eq("list_id", list_id); // Extra security check

      if (error) {
        console.error(`Error updating column ${column.id}:`, error);
        throw error;
      }
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT /api/prospects/columns/bulk-update:", error);
    return NextResponse.json(
      { error: "Failed to update columns" },
      { status: 500 }
    );
  }
}

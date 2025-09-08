import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ columnId: string }> }
) {
  try {
    const { columnId } = await context.params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { column_name, column_type } = await req.json();

    if (!column_name || !column_type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check if user has access to this column
    const { data: column, error: columnError } = await supabase
      .from("prospect_columns")
      .select(`
        id,
        list_id,
        prospect_lists!inner(created_by)
      `)
      .eq("id", columnId)
      .single();

    if (columnError || !column) {
      console.error("Column lookup error:", columnError);
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    if (column.prospect_lists.created_by !== session.user.id) {
      console.error("Access denied - User:", session.user.id, "Owner:", column.prospect_lists.created_by);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update column
    const { data: updatedColumn, error: updateError } = await supabase
      .from("prospect_columns")
      .update({
        column_name,
        column_type,
        is_phone: column_type === "phone"
      })
      .eq("id", columnId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating column:", updateError);
      return NextResponse.json(
        { error: "Failed to update column" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedColumn);
  } catch (error) {
    console.error("Error in PUT /api/prospects/columns/[columnId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ columnId: string }> }
) {
  try {
    const { columnId } = await context.params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user has access to this column
    const { data: column, error: columnError } = await supabase
      .from("prospect_columns")
      .select(`
        id,
        list_id,
        column_name,
        prospect_lists!inner(created_by)
      `)
      .eq("id", columnId)
      .single();

    if (columnError || !column) {
      console.error("Column lookup error:", columnError);
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    if (column.prospect_lists.created_by !== session.user.id) {
      console.error("Access denied - User:", session.user.id, "Owner:", column.prospect_lists.created_by);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Remove the column data from all prospects in this list
    const { data: prospects, error: prospectsError } = await supabase
      .from("prospects")
      .select("id, data")
      .eq("list_id", column.list_id);

    if (prospectsError) {
      console.error("Error fetching prospects:", prospectsError);
      return NextResponse.json(
        { error: "Failed to fetch prospects" },
        { status: 500 }
      );
    }

    // Update each prospect to remove the column data
    if (prospects && prospects.length > 0) {
      for (const prospect of prospects) {
        const updatedData = { ...prospect.data };
        delete updatedData[column.column_name];

        await supabase
          .from("prospects")
          .update({ data: updatedData })
          .eq("id", prospect.id);
      }
    }

    // Delete the column
    const { error: deleteError } = await supabase
      .from("prospect_columns")
      .delete()
      .eq("id", columnId);

    if (deleteError) {
      console.error("Error deleting column:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete column" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/prospects/columns/[columnId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

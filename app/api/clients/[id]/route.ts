import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ActivityHelpers } from "@/lib/activity-logger";
import { auth } from "@/auth";

// GET: fetch single client by ID
export async function GET(req: NextRequest, { params }: any) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
      console.error("Error fetching client:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client: data });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: update client
export async function PUT(req: NextRequest, { params }: any) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, contact_email, company, status, region } = await req.json();

    // Validation
    if (!name || !contact_email) {
      return NextResponse.json(
        { error: "Name and contact email are required" },
        { status: 400 }
      );
    }

    // Check if email already exists for other clients
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("contact_email", contact_email)
      .neq("id", params.id)
      .single();

    if (existingClient) {
      return NextResponse.json(
        { error: "A client with this email already exists" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("clients")
      .update({
        name,
        contact_email,
        company,
        status,
        region
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
      console.error("Error updating client:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    try {
      await ActivityHelpers.logClientCreated(session.user.id, name, params.id);
    } catch (logError) {
      console.error('Error logging client update:', logError);
    }

    return NextResponse.json({ client: data });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: delete client
export async function DELETE(req: NextRequest, { params }: any) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if client has associated projects
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("client_id", params.id);

    if (projects && projects.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete client with associated projects" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", params.id);

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
      console.error("Error deleting client:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    try {
      await ActivityHelpers.logClientCreated(session.user.id, 'Deleted client', params.id);
    } catch (logError) {
      console.error('Error logging client deletion:', logError);
    }

    return NextResponse.json({ message: "Client deleted successfully" });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 
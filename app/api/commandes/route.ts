import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// CORS headers
const corsHeaders = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});

// Handle preflight CORS requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

// Handle Elementor or other POST requests
export async function POST(req: Request) {
  let data: any;

  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle JSON or form-urlencoded
    if (contentType.includes("application/json")) {
      data = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formText = await req.text();
      data = Object.fromEntries(new URLSearchParams(formText));
    } else {
      return new NextResponse(
        JSON.stringify({ error: "Unsupported Content-Type" }),
        { status: 415, headers: corsHeaders() }
      );
    }

    const { error } = await supabase.from("commandes").insert([
      {
        data,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      return new NextResponse(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders() }
      );
    }

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err: any) {
    return new NextResponse(
      JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 400, headers: corsHeaders() }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return new NextResponse(
        JSON.stringify({ error: "Missing commande id" }),
        { status: 400, headers: corsHeaders() }
      );
    }
    const { error } = await supabase.from("commandes").update({ opened: true }).eq("id", id);
    if (error) {
      return new NextResponse(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders() }
      );
    }
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err: any) {
    return new NextResponse(
      JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 400, headers: corsHeaders() }
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url || "", "http://localhost");
  if (url.searchParams.get("unopened") === "1") {
    // Return count of unopened commandes
    const { count, error } = await supabase
      .from("commandes")
      .select("id", { count: "exact", head: true })
      .eq("opened", false);
    if (error) {
      return new NextResponse(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders() }
      );
    }
    return new NextResponse(
      JSON.stringify({ count }),
      { status: 200, headers: corsHeaders() }
    );
  }
  // Optionally, return 404 or empty for other GETs
  return new NextResponse(null, { status: 404, headers: corsHeaders() });
}

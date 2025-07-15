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

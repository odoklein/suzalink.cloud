import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Store the entire payload in the 'data' column
    const { error } = await supabase.from("commandes").insert([
      {
        data,
        created_at: new Date().toISOString()
      }
    ]);

    if (error) {
      return NextResponse.json({ error: error.message, received: data }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 400 });
  }
} 
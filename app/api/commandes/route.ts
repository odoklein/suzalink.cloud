import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    // Destructure and sanitize expected fields
    const {
      "nom_et_prenom": nom_et_prenom,
      "nom_de_lentreprise": nom_de_lentreprise,
      "secteur_dactivite": secteur_dactivite,
      "date_de_rendez_vous": date_de_rendez_vous,
      "heure_du_rendez_vous": heure_du_rendez_vous
    } = data;

    // Insert into commandes table (create if not exists)
    const { error } = await supabase.from("commandes").insert([
      {
        nom_et_prenom,
        nom_de_lentreprise,
        secteur_dactivite,
        date_de_rendez_vous,
        heure_du_rendez_vous,
        created_at: new Date().toISOString()
      }
    ]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 400 });
  }
} 
"use client";
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

interface Commande {
  id: string;
  nom_et_prenom: string;
  nom_de_lentreprise: string;
  secteur_dactivite: string;
  date_de_rendez_vous: string;
  heure_du_rendez_vous: string;
  created_at: string;
}

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCommandes() {
      setLoading(true);
      const { data, error } = await supabase
        .from("commandes")
        .select("*")
        .order("created_at", { ascending: false });
      setCommandes(data || []);
      setLoading(false);
    }
    fetchCommandes();
  }, []);

  return (
    <div className="p-8 w-full min-h-screen bg-muted">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Commandes</h1>
        <p className="text-gray-600 max-w-2xl">
          Cette section affiche les commandes reçues depuis le formulaire de tarifs sur suzaliconseil.com. Lorsqu'un utilisateur choisit un pack et remplit le formulaire, une commande apparaît ici.
        </p>
      </div>
      <Card className="border-[1.5px] border-black/20 shadow-lg bg-white/90 max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Liste des Commandes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : commandes.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-lg">
              (Aucune commande à afficher pour l'instant)
            </div>
          ) : (
            <div className="space-y-4">
              {commandes.map((commande) => (
                <div
                  key={commande.id}
                  className="p-4 rounded-lg border bg-gray-50 flex flex-col gap-1"
                >
                  <div className="font-semibold text-gray-800">{commande.nom_et_prenom}</div>
                  <div className="text-sm text-gray-600">{commande.nom_de_lentreprise}</div>
                  <div className="text-sm text-gray-600">{commande.secteur_dactivite}</div>
                  <div className="text-xs text-gray-500">
                    {commande.date_de_rendez_vous} à {commande.heure_du_rendez_vous}
                  </div>
                  <div className="text-xs text-gray-400">
                    Reçu le {new Date(commande.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
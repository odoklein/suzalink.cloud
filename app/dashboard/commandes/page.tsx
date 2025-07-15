"use client";
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export default function CommandesPage() {
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
          <div className="py-12 text-center text-gray-400 text-lg">
            (Aucune commande à afficher pour l'instant)
            <br />
            <span className="text-xs text-gray-300">L'intégration avec le formulaire tarifs sera bientôt active.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
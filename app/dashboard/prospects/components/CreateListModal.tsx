"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { User } from "lucide-react";

interface CreateListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateListModal({ open, onOpenChange, onSuccess }: CreateListModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultInterlocuteurName, setDefaultInterlocuteurName] = useState("");
  const [defaultInterlocuteurEmail, setDefaultInterlocuteurEmail] = useState("");
  const [defaultInterlocuteurPhone, setDefaultInterlocuteurPhone] = useState("");
  const [defaultInterlocuteurPosition, setDefaultInterlocuteurPosition] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Le nom de la liste est requis");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/prospects/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          defaultInterlocuteurName: defaultInterlocuteurName.trim() || null,
          defaultInterlocuteurEmail: defaultInterlocuteurEmail.trim() || null,
          defaultInterlocuteurPhone: defaultInterlocuteurPhone.trim() || null,
          defaultInterlocuteurPosition: defaultInterlocuteurPosition.trim() || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      toast.success("Liste créée avec succès");
      setName("");
      setDescription("");
      setDefaultInterlocuteurName("");
      setDefaultInterlocuteurEmail("");
      setDefaultInterlocuteurPhone("");
      setDefaultInterlocuteurPosition("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating list:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle liste</DialogTitle>
          <DialogDescription>
            Créez une nouvelle liste de prospects pour organiser vos campagnes B2B.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom de la liste *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Prospects IT Lyon"
                required
              />
                        </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de la liste (optionnel)"
                rows={3}
            />
                      </div>
            
            {/* Interlocuteur Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Interlocuteur par défaut (optionnel)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Définissez un interlocuteur par défaut qui sera automatiquement ajouté aux nouveaux prospects de cette liste.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="interlocuteur-name">Nom</Label>
                  <Input
                    id="interlocuteur-name"
                    value={defaultInterlocuteurName}
                    onChange={(e) => setDefaultInterlocuteurName(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="interlocuteur-position">Poste</Label>
                  <Input
                    id="interlocuteur-position"
                    value={defaultInterlocuteurPosition}
                    onChange={(e) => setDefaultInterlocuteurPosition(e.target.value)}
                    placeholder="Ex: Directeur Commercial"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="interlocuteur-email">Email</Label>
                  <Input
                    id="interlocuteur-email"
                    type="email"
                    value={defaultInterlocuteurEmail}
                    onChange={(e) => setDefaultInterlocuteurEmail(e.target.value)}
                    placeholder="jean.dupont@entreprise.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="interlocuteur-phone">Téléphone</Label>
                  <Input
                    id="interlocuteur-phone"
                    value={defaultInterlocuteurPhone}
                    onChange={(e) => setDefaultInterlocuteurPhone(e.target.value)}
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>
            </div>
                    </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              disabled={loading}
              >
                Annuler
              </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer la liste"}
                </Button>
              </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


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

interface CreateListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateListModal({ open, onOpenChange, onSuccess }: CreateListModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      toast.success("Liste créée avec succès");
      setName("");
      setDescription("");
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
      <DialogContent className="sm:max-w-[425px]">
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


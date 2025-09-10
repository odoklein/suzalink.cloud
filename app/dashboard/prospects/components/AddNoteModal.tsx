"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface AddNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId: string;
  prospectName: string;
  onSuccess: () => void;
}

export function AddNoteModal({
  open,
  onOpenChange,
  prospectId,
  prospectName,
  onSuccess
}: AddNoteModalProps) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    setLoading(true);

    try {
      const res = await fetch('/api/prospects/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prospectId,
          activityType: 'note',
          description: note.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erreur lors de l\'ajout de la note');
      }

      toast.success("Note ajoutée avec succès");
      onOpenChange(false);
      setNote("");
      onSuccess();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter une note</DialogTitle>
          <DialogDescription>
            Ajoutez une note pour le prospect: <strong>{prospectName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Écrivez votre note ici..."
              rows={4}
              required
            />
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
            <Button type="submit" disabled={loading || !note.trim()}>
              {loading ? 'Ajout...' : 'Ajouter la note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
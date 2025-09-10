"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface ChangeStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId: string;
  currentStatus: string;
  prospectName: string;
  onSuccess: () => void;
}

const statusOptions = [
  { value: 'nouveau', label: 'Nouveau', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacte', label: 'Contacté', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'interesse', label: 'Intéressé', color: 'bg-green-100 text-green-800' },
  { value: 'rappel', label: 'Rappel', color: 'bg-purple-100 text-purple-800' },
  { value: 'ferme', label: 'Client', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'non_interesse', label: 'Pas intéressé', color: 'bg-red-100 text-red-800' },
];

export function ChangeStatusModal({ 
  open, 
  onOpenChange, 
  prospectId, 
  currentStatus, 
  prospectName,
  onSuccess 
}: ChangeStatusModalProps) {
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          isDataField: false
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erreur lors du changement de statut');
      }

      // If notes are provided, add them as an activity
      if (notes.trim()) {
        await fetch('/api/prospects/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prospectId,
            activityType: 'note',
            description: `Statut changé vers "${statusOptions.find(s => s.value === newStatus)?.label}": ${notes}`,
          }),
        });
      }

      toast.success("Statut mis à jour avec succès");
      onOpenChange(false);
      setNotes("");
      onSuccess();
    } catch (error) {
      console.error('Error changing status:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Changer le statut</DialogTitle>
          <DialogDescription>
            Modifiez le statut du prospect: <strong>{prospectName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Nouveau statut</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajoutez des notes sur ce changement de statut..."
              rows={3}
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
            <Button type="submit" disabled={loading || newStatus === currentStatus}>
              {loading ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


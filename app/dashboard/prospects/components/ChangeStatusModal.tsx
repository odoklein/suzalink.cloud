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
  { value: 'none', label: 'Status', color: 'bg-gray-100 text-gray-800' },
  { value: 'NRP', label: 'NRP', color: 'bg-gray-100 text-gray-800' },
  { value: 'Rappel', label: 'Rappel', color: 'bg-purple-100 text-purple-800' },
  { value: 'Relance', label: 'Relance', color: 'bg-orange-100 text-orange-800' },
  { value: 'Mail', label: 'Mail', color: 'bg-blue-100 text-blue-800' },
  { value: 'pas interessé', label: 'Pas intéressé', color: 'bg-red-100 text-red-800' },
  { value: 'barrage', label: 'Barrage', color: 'bg-red-200 text-red-900' },
  { value: 'devis', label: 'Devis', color: 'bg-green-100 text-green-800' },
  { value: 'rdv', label: 'RDV', color: 'bg-emerald-100 text-emerald-800' },
];

export function ChangeStatusModal({ 
  open, 
  onOpenChange, 
  prospectId, 
  currentStatus, 
  prospectName,
  onSuccess 
}: ChangeStatusModalProps) {
  const [newStatus, setNewStatus] = useState(currentStatus || "none");
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
          status: newStatus === "none" ? null : newStatus,
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
              <SelectTrigger className="bg-white/50 border-gray-200/50 hover:bg-white/70 focus:ring-0">
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value} className="hover:bg-gray-50/50 focus:bg-gray-50/50">
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


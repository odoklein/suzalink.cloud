"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Folder, List, CheckCircle } from "lucide-react";

interface Client {
  id: string;
  name: string;
  company?: string;
  status: string;
}

interface ClientAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'folder' | 'list';
  itemId: string;
  itemName: string;
  currentClientId?: string | null;
  onAssignmentChange?: () => void;
}

export default function ClientAssignmentModal({
  open,
  onOpenChange,
  type,
  itemId,
  itemName,
  currentClientId,
  onAssignmentChange
}: ClientAssignmentModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(currentClientId || null);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients');
        if (response.ok) {
          const data = await response.json();
          setClients(data.clients || []);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
        toast.error('Erreur lors du chargement des clients');
      } finally {
        setLoadingClients(false);
      }
    };

    if (open) {
      fetchClients();
    }
  }, [open]);

  // Update selected client when currentClientId changes
  useEffect(() => {
    setSelectedClientId(currentClientId || null);
  }, [currentClientId]);

  const handleAssign = async () => {
    if (!itemId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/prospects/assign-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          id: itemId,
          client_id: selectedClientId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || `${type === 'folder' ? 'Dossier' : 'Liste'} assigné avec succès`);
        onAssignmentChange?.();
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors de l\'assignation');
      }
    } catch (error) {
      console.error('Error assigning client:', error);
      toast.error('Erreur lors de l\'assignation');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentClientName = () => {
    if (!currentClientId) return "Aucun client assigné";
    const client = clients.find(c => c.id === currentClientId);
    return client ? `${client.name}${client.company ? ` (${client.company})` : ''}` : "Client inconnu";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'folder' ? <Folder className="w-5 h-5" /> : <List className="w-5 h-5" />}
            Assigner à un client
          </DialogTitle>
          <DialogDescription>
            Assignez ce {type === 'folder' ? 'dossier' : 'liste'} à un client pour organiser vos prospections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              {type === 'folder' ? <Folder className="w-4 h-4 text-blue-600" /> : <List className="w-4 h-4 text-green-600" />}
              <span className="font-medium text-gray-900">{itemName}</span>
            </div>
            <div className="text-sm text-gray-600">
              {type === 'folder' ? 'Dossier de prospection' : 'Liste de prospects'}
            </div>
          </div>

          {/* Current Assignment */}
          {currentClientId && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Actuellement assigné à :</span>
              </div>
              <div className="text-sm text-blue-700">{getCurrentClientName()}</div>
            </div>
          )}

          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client-select">Sélectionner un client</Label>
                         <Select value={selectedClientId || "none"} onValueChange={(value) => setSelectedClientId(value === "none" ? null : value)}>
               <SelectTrigger className="w-full">
                 <SelectValue placeholder="Choisir un client..." />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="none">Aucun client (désassigner)</SelectItem>
                 {loadingClients ? (
                   <SelectItem value="loading" disabled>Chargement des clients...</SelectItem>
                 ) : (
                   clients.map((client) => (
                     <SelectItem key={client.id} value={client.id}>
                       <div className="flex items-center gap-2">
                         <span>{client.name}</span>
                         {client.company && (
                                 <Badge variant="draft" className="text-xs">
                             {client.company}
                           </Badge>
                         )}
                                                   <Badge
                            variant={client.status === 'active' ? 'default' : 'draft'}
                            className="text-xs"
                          >
                           {client.status === 'active' ? 'Actif' : client.status === 'pending' ? 'En attente' : 'Inactif'}
                         </Badge>
                       </div>
                     </SelectItem>
                   ))
                 )}
               </SelectContent>
             </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleAssign}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Assignation..." : "Assigner"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
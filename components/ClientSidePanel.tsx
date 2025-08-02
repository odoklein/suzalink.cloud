"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, Edit, Trash2, Save, Users, Building, Mail, MapPin, Calendar, Phone } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Client {
  id: string;
  name: string;
  contact_email: string;
  company: string | null;
  status: 'active' | 'pending' | 'inactive';
  region: string | null;
  created_at: string;
}

interface ClientSidePanelProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200'
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[status as keyof typeof statusColors]}`}>
    {status === 'active' ? 'Actif' : 
     status === 'pending' ? 'En attente' : 
     status === 'inactive' ? 'Inactif' : status}
  </span>
);

export default function ClientSidePanel({ client, isOpen, onClose }: ClientSidePanelProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contact_email: "",
    company: "",
    status: "active" as "active" | "pending" | "inactive",
    region: ""
  });

  // Update form when client changes
  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        contact_email: client.contact_email,
        company: client.company || "",
        status: client.status,
        region: client.region || ""
      });
    }
  }, [client]);

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, ...clientData }: Client) => {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update client');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client mis à jour avec succès");
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete client');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client supprimé avec succès");
      setDeleteModal(false);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim() || !form.contact_email.trim()) {
      toast.error("Le nom et l'email sont requis");
      return;
    }

    if (!client) return;

    const clientData = {
      name: form.name.trim(),
      contact_email: form.contact_email.trim(),
      company: form.company.trim() || null,
      status: form.status,
      region: form.region.trim() || null
    };

    updateClientMutation.mutate({ ...client, ...clientData });
  };

  const handleDelete = () => {
    if (client) {
      deleteClientMutation.mutate(client.id);
    }
  };

  if (!client) return null;

  return (
    <>
                    {/* Overlay */}
       <div 
         className={`fixed inset-0 bg-black transition-all duration-500 ease-in-out z-40 ${
           isOpen ? 'opacity-20' : 'opacity-0 pointer-events-none'
         }`}
         onClick={onClose}
       />
       
       {/* Side Panel */}
       <div 
         className={`fixed right-0 top-0 h-full w-[30%] bg-white shadow-2xl transform transition-all duration-500 ease-in-out z-50 ${
           isOpen ? 'translate-x-0 scale-100' : 'translate-x-full scale-95'
         }`}
       >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Détails du client</h2>
            <p className="text-sm text-gray-600">Informations complètes</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

                 {/* Content */}
         <div className="h-full overflow-y-auto">
           <div className={`p-8 space-y-8 transition-all duration-700 ease-in-out ${
             isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
           }`}>
                         {/* Client Info Card */}
             <Card className="border border-gray-200 rounded-lg shadow-sm">
               <CardHeader className="pb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                      {isEditing ? (
                        <Input
                          value={form.name}
                          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                          className="text-lg font-semibold border-0 p-0 focus:ring-0"
                        />
                      ) : (
                        client.name
                      )}
                    </CardTitle>
                    <StatusBadge status={isEditing ? form.status : client.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteModal(true)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditing(false)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSubmit}
                          disabled={updateClientMutation.isPending}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Save className="w-4 h-4 text-blue-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
                             <CardContent className="space-y-6">
                {/* Email */}
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</Label>
                    {isEditing ? (
                      <Input
                        value={form.contact_email}
                        onChange={(e) => setForm(prev => ({ ...prev, contact_email: e.target.value }))}
                        className="mt-1 border-gray-300"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">{client.contact_email}</p>
                    )}
                  </div>
                </div>

                {/* Company */}
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Entreprise</Label>
                    {isEditing ? (
                      <Input
                        value={form.company}
                        onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))}
                        placeholder="Nom de l'entreprise"
                        className="mt-1 border-gray-300"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">
                        {client.company || "Non spécifié"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Region */}
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Région</Label>
                    {isEditing ? (
                      <Input
                        value={form.region}
                        onChange={(e) => setForm(prev => ({ ...prev, region: e.target.value }))}
                        placeholder="Région ou pays"
                        className="mt-1 border-gray-300"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">
                        {client.region || "Non spécifié"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status */}
                {isEditing && (
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</Label>
                      <Select 
                        value={form.status} 
                        onValueChange={(value: "active" | "pending" | "inactive") => 
                          setForm(prev => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger className="mt-1 border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Actif</SelectItem>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="inactive">Inactif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Created Date */}
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date de création</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {new Date(client.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

                         {/* Quick Actions */}
             <Card className="border border-gray-200 rounded-lg shadow-sm">
               <CardHeader className="pb-4">
                 <CardTitle className="text-base font-medium text-gray-900">Actions rapides</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {/* TODO: Navigate to projects */}}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Voir les projets
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {/* TODO: Send email */}}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Envoyer un email
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {/* TODO: View invoices */}}
                >
                  <Building className="w-4 h-4 mr-2" />
                  Voir les factures
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal} onOpenChange={setDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteModal(false)}
              className="flex-1 rounded-lg border-gray-200 hover:bg-gray-50"
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleteClientMutation.isPending}
              className="flex-1 px-3 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {deleteClientMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 
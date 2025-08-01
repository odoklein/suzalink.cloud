"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  DollarSign,
  Copy,
  ExternalLink,
  Settings
} from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface MeetingType {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

export default function MeetingTypesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MeetingType | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, meetingTypeId: string | null }>({ open: false, meetingTypeId: null });
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    duration_minutes: 30,
    price: "",
    color: "#3B82F6",
    is_active: true
  });

  // Fetch meeting types
  const {
    data: meetingTypesData,
    isLoading: loadingMeetingTypes,
    refetch: refetchMeetingTypes
  } = useQuery<{ meeting_types: MeetingType[] }, Error>({
    queryKey: ["meeting-types", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/meeting-types?userId=${user?.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch meeting types');
      }
      return response.json();
    },
    enabled: !!user
  });

  // Create meeting type mutation
  const createMeetingTypeMutation = useMutation({
    mutationFn: async (meetingTypeData: Omit<MeetingType, 'id' | 'created_at'>) => {
      const response = await fetch('/api/meeting-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...meetingTypeData,
          user_id: user?.id
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create meeting type');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-types"] });
      toast.success("Type de rendez-vous créé avec succès");
      setOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Update meeting type mutation
  const updateMeetingTypeMutation = useMutation({
    mutationFn: async ({ id, ...meetingTypeData }: MeetingType) => {
      const response = await fetch(`/api/meeting-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingTypeData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update meeting type');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-types"] });
      toast.success("Type de rendez-vous mis à jour avec succès");
      setOpen(false);
      setEditing(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Delete meeting type mutation
  const deleteMeetingTypeMutation = useMutation({
    mutationFn: async (meetingTypeId: string) => {
      const response = await fetch(`/api/meeting-types/${meetingTypeId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete meeting type');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-types"] });
      toast.success("Type de rendez-vous supprimé avec succès");
      setDeleteModal({ open: false, meetingTypeId: null });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const meetingTypes = meetingTypesData?.meeting_types || [];

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      duration_minutes: 30,
      price: "",
      color: "#3B82F6",
      is_active: true
    });
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (meetingType: MeetingType) => {
    setEditing(meetingType);
    setForm({
      name: meetingType.name,
      description: meetingType.description || "",
      duration_minutes: meetingType.duration_minutes,
      price: meetingType.price?.toString() || "",
      color: meetingType.color,
      is_active: meetingType.is_active
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    const meetingTypeData = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      duration_minutes: form.duration_minutes,
      price: form.price ? parseFloat(form.price) : null,
      color: form.color,
      is_active: form.is_active
    };

    if (editing) {
      updateMeetingTypeMutation.mutate({ ...editing, ...meetingTypeData });
    } else {
      createMeetingTypeMutation.mutate(meetingTypeData);
    }
  };

  const handleDelete = (meetingTypeId: string) => {
    deleteMeetingTypeMutation.mutate(meetingTypeId);
  };

  const copyBookingLink = (meetingTypeId: string) => {
    const link = `${window.location.origin}/book/${meetingTypeId}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien de réservation copié dans le presse-papiers");
  };

  if (loadingMeetingTypes) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Types de rendez-vous</h1>
          <p className="text-gray-600">Créez et gérez vos différents types de rendez-vous</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/bookings">
            <Button 
              variant="outline"
              className="px-3 py-2.5 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Retour aux RDV
            </Button>
          </Link>
          <Button 
            onClick={openCreate}
            className="px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouveau type
          </Button>
        </div>
      </div>

      {/* Meeting Types Grid */}
      {meetingTypes.length === 0 ? (
        <Card className="border border-gray-200 rounded-lg shadow-sm p-8">
          <div className="text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun type de rendez-vous</h3>
            <p className="text-gray-600 mb-4">
              Créez votre premier type de rendez-vous pour commencer à recevoir des réservations.
            </p>
            <Button onClick={openCreate} className="px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Créer un type de RDV
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {meetingTypes.map((meetingType) => (
            <Card key={meetingType.id} className="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: meetingType.color }}
                      />
                      <CardTitle className="text-lg font-semibold text-gray-900">{meetingType.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={meetingType.is_active ? "default" : "draft"}>
                        {meetingType.is_active ? "Actif" : "Inactif"}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {meetingType.duration_minutes} min
                      </div>
                      {meetingType.price && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <DollarSign className="w-4 h-4" />
                          {meetingType.price}€
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyBookingLink(meetingType.id)}
                      className="p-1.5 bg-white rounded-full border border-gray-200 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-200"
                    >
                      <Copy className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(meetingType)}
                      className="p-1.5 bg-white rounded-full border border-gray-200 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-200"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteModal({ open: true, meetingTypeId: meetingType.id })}
                      className="p-1.5 bg-white rounded-full border border-gray-200 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {meetingType.description && (
                  <p className="text-sm text-gray-600">{meetingType.description}</p>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    Créé le {new Date(meetingType.created_at).toLocaleDateString('fr-FR')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/book/${meetingType.id}`, '_blank')}
                    className="text-xs px-2 py-1"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Voir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le type de rendez-vous" : "Nouveau type de rendez-vous"}</DialogTitle>
            <DialogDescription>
              {editing ? "Modifiez les informations du type de rendez-vous." : "Créez un nouveau type de rendez-vous pour vos clients."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Consultation, Démo, Suivi..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du rendez-vous..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Durée (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 30 }))}
                  min="15"
                  max="480"
                  step="15"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Prix (€)</Label>
                <Input
                  id="price"
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="color">Couleur</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="color"
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
                <span className="text-sm text-gray-600">Choisissez une couleur pour identifier ce type de RDV</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Actif (visible pour les réservations)
              </Label>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border-gray-200 hover:bg-gray-50"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createMeetingTypeMutation.isPending || updateMeetingTypeMutation.isPending}
                className="flex-1 px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {createMeetingTypeMutation.isPending || updateMeetingTypeMutation.isPending ? "Enregistrement..." : (editing ? "Mettre à jour" : "Créer")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ open, meetingTypeId: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce type de rendez-vous ? Cette action est irréversible et supprimera également tous les rendez-vous associés.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false, meetingTypeId: null })}
              className="flex-1 rounded-lg border-gray-200 hover:bg-gray-50"
            >
              Annuler
            </Button>
            <Button
              onClick={() => deleteModal.meetingTypeId && handleDelete(deleteModal.meetingTypeId)}
              disabled={deleteMeetingTypeMutation.isPending}
              className="flex-1 px-3 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {deleteMeetingTypeMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
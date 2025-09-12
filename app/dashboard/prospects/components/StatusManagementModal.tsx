"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, GripVertical, Palette } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StatusOption {
  id: string;
  name: string;
  color: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface StatusManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusOptionsChange?: () => void;
}

const PREDEFINED_COLORS = [
  '#6B7280', // Gray
  '#8B5CF6', // Purple
  '#F59E0B', // Orange
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#DC2626', // Dark Red
  '#10B981', // Green
  '#059669', // Emerald
  '#F97316', // Orange-500
  '#84CC16', // Lime
  '#06B6D4', // Cyan
  '#8B5A2B', // Brown
];

export function StatusManagementModal({ isOpen, onClose, onStatusOptionsChange }: StatusManagementModalProps) {
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusOption | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    color: '#6B7280',
    description: '',
    is_active: true,
    sort_order: 0
  });

  // Fetch status options
  const fetchStatusOptions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/prospects/status-options?includeInactive=true');
      const data = await res.json();
      
      if (data.statusOptions) {
        setStatusOptions(data.statusOptions);
      }
    } catch (error) {
      console.error("Error fetching status options:", error);
      toast.error("Erreur lors du chargement des options de statut");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatusOptions();
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Le nom du statut est requis");
      return;
    }

    try {
      const url = editingStatus 
        ? `/api/prospects/status-options/${editingStatus.id}`
        : '/api/prospects/status-options';
      
      const method = editingStatus ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      const data = await res.json();
      
      if (editingStatus) {
        toast.success("Statut mis à jour avec succès");
      } else {
        toast.success("Statut créé avec succès");
      }

      // Reset form and refresh data
      setFormData({
        name: '',
        color: '#6B7280',
        description: '',
        is_active: true,
        sort_order: 0
      });
      setEditingStatus(null);
      setShowAddForm(false);
      await fetchStatusOptions();
      onStatusOptionsChange?.();
    } catch (error) {
      console.error('Error saving status option:', error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la sauvegarde");
    }
  };

  // Handle edit
  const handleEdit = (status: StatusOption) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      color: status.color,
      description: status.description || '',
      is_active: status.is_active,
      sort_order: status.sort_order
    });
    setShowAddForm(true);
  };

  // Handle delete
  const handleDelete = async (status: StatusOption) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le statut "${status.name}" ?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/prospects/status-options/${status.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      toast.success("Statut supprimé avec succès");
      await fetchStatusOptions();
      onStatusOptionsChange?.();
    } catch (error) {
      console.error('Error deleting status option:', error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression");
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (status: StatusOption) => {
    try {
      const res = await fetch(`/api/prospects/status-options/${status.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !status.is_active
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      toast.success(`Statut ${!status.is_active ? 'activé' : 'désactivé'} avec succès`);
      await fetchStatusOptions();
      onStatusOptionsChange?.();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la mise à jour");
    }
  };

  // Get color class for display
  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      '#6B7280': 'bg-gray-100 text-gray-800',
      '#8B5CF6': 'bg-purple-100 text-purple-800',
      '#F59E0B': 'bg-orange-100 text-orange-800',
      '#3B82F6': 'bg-blue-100 text-blue-800',
      '#EF4444': 'bg-red-100 text-red-800',
      '#DC2626': 'bg-red-200 text-red-900',
      '#10B981': 'bg-green-100 text-green-800',
      '#059669': 'bg-emerald-100 text-emerald-800',
      '#F97316': 'bg-orange-100 text-orange-800',
      '#84CC16': 'bg-lime-100 text-lime-800',
      '#06B6D4': 'bg-cyan-100 text-cyan-800',
      '#8B5A2B': 'bg-amber-100 text-amber-800',
    };
    return colorMap[color] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestion des statuts de prospects</DialogTitle>
          <DialogDescription>
            Créez et gérez les statuts disponibles pour vos prospects. Les statuts inactifs ne seront plus disponibles pour de nouveaux prospects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add/Edit Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  {editingStatus ? 'Modifier le statut' : 'Nouveau statut'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom du statut *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Nouveau client"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="color">Couleur</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            id="color"
                            value={formData.color}
                            onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                            placeholder="#6B7280"
                            className="font-mono"
                          />
                        </div>
                        <div 
                          className="w-10 h-10 rounded border border-gray-300"
                          style={{ backgroundColor: formData.color }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Palette de couleurs</Label>
                    <div className="flex flex-wrap gap-2">
                      {PREDEFINED_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={cn(
                            "w-8 h-8 rounded border-2 transition-all",
                            formData.color === color ? "border-gray-900 scale-110" : "border-gray-300 hover:border-gray-500"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => setFormData(prev => ({ ...prev, color }))}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description optionnelle du statut"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                      />
                      <Label htmlFor="is_active">Statut actif</Label>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="sort_order">Ordre d'affichage</Label>
                      <Input
                        id="sort_order"
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingStatus ? 'Mettre à jour' : 'Créer'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingStatus(null);
                        setFormData({
                          name: '',
                          color: '#6B7280',
                          description: '',
                          is_active: true,
                          sort_order: 0
                        });
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Status Options List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Statuts existants</h3>
              {!showAddForm && (
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau statut
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {statusOptions
                  .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
                  .map((status) => (
                    <Card key={status.id} className={cn(
                      "transition-all",
                      !status.is_active && "opacity-60"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div 
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: status.color }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge className={cn("text-xs", getColorClass(status.color))}>
                                  {status.name}
                                </Badge>
                                {!status.is_active && (
                                  <Badge variant="outline" className="text-xs">
                                    Inactif
                                  </Badge>
                                )}
                              </div>
                              {status.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {status.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                Ordre: {status.sort_order}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(status)}
                              className="h-8 w-8 p-0"
                              title={status.is_active ? 'Désactiver' : 'Activer'}
                            >
                              <Switch
                                checked={status.is_active}
                                className="pointer-events-none"
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(status)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(status)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}

            {statusOptions.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                <Palette className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun statut configuré</p>
                <p className="text-sm">Créez votre premier statut pour commencer</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

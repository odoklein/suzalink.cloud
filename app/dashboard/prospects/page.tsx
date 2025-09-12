"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Users, Building, Phone, Mail, Calendar, Filter, Download, Upload, BarChart3, Table, UserPlus, MoreHorizontal, Settings, Target, Edit, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CreateListModal } from "./components/CreateListModal";
import { CreateProspectModal } from "./components/CreateProspectModal";
import { ImportCsvModal } from "./components/ImportCsvModal";
import { AssignListModal } from "./components/AssignListModal";

interface ProspectList {
  id: string;
  name: string;
  description?: string;
  status: string;
  prospect_count: number;
  created_at: string;
  created_by: string;
}

export default function ProspectsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ProspectList[]>([]);
  const [loading, setLoading] = useState(true);
  const [createListModalOpen, setCreateListModalOpen] = useState(false);
  const [createProspectModalOpen, setCreateProspectModalOpen] = useState(false);
  const [importCsvModalOpen, setImportCsvModalOpen] = useState(false);
  const [assignListModalOpen, setAssignListModalOpen] = useState(false);
  const [selectedListForAssignment, setSelectedListForAssignment] = useState<{ id: string; name: string } | null>(null);
  const [deletingList, setDeletingList] = useState<string | null>(null);
  const [editingList, setEditingList] = useState<ProspectList | null>(null);
  const [editListName, setEditListName] = useState('');
  const [editListDescription, setEditListDescription] = useState('');


  // Delete prospect list
  const handleDeleteList = async (listId: string, listName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la liste "${listName}" ? Cette action est irréversible et supprimera tous les prospects associés.`)) {
      return;
    }

    setDeletingList(listId);
    try {
      const res = await fetch(`/api/prospects/lists/${listId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }

      toast.success(`Liste "${listName}" supprimée avec succès`);
      setLists(prev => prev.filter(list => list.id !== listId));

    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingList(null);
    }
  };

  // Edit prospect list
  const handleEditList = (list: ProspectList) => {
    setEditingList(list);
    setEditListName(list.name);
    setEditListDescription(list.description || '');
  };

  const handleSaveEditList = async () => {
    if (!editingList) return;

    try {
      const res = await fetch(`/api/prospects/lists/${editingList.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editListName.trim(),
          description: editListDescription.trim() || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erreur lors de la modification');
      }

      toast.success(`Liste "${editListName}" modifiée avec succès`);
      setEditingList(null);
      setEditListName('');
      setEditListDescription('');
      fetchLists(); // Refresh the lists

    } catch (error) {
      console.error('Error editing list:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la modification');
    }
  };

  // Fetch lists
  const fetchLists = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prospects/lists");
      const data = await res.json();
      
      console.log("API Response:", data);
      
      if (data.lists) {
        console.log("Setting lists:", data.lists);
        setLists(data.lists);
      } else {
        console.log("No lists in response");
      }
    } catch (error) {
      console.error("Error fetching prospect lists:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);


  return (
    <div className="w-full py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Prospects</h1>
          <p className="text-slate-600">
            Gérez vos listes de prospects et campagnes B2B
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCreateListModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Liste
          </Button>
          <Button
            onClick={() => setCreateProspectModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Prospect
          </Button>
        </div>
      </div>

      {/* Lists Overview */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Gestion des listes</h2>
          <p className="text-sm text-muted-foreground">
            Cliquez sur une liste pour ouvrir l'interface de gestion des prospects, ou utilisez le menu ⋮ pour modifier/supprimer
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          lists.map((list) => (
            <Card
              key={list.id}
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => window.open(`/dashboard/prospects/${list.id}`, '_blank')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{list.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedListForAssignment({ id: list.id, name: list.name });
                        setAssignListModalOpen(true);
                      }}
                      title="Assigner des utilisateurs"
                    >
                      <UserPlus className="h-3 w-3" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditList(list);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Modifier la liste</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteList(list.id, list.name);
                          }}
                          disabled={deletingList === list.id}
                          className="flex items-center gap-2 text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>
                            {deletingList === list.id ? 'Suppression...' : 'Supprimer la liste'}
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Badge
                      variant={list.status === 'active' ? 'default' : 'draft'}
                      className="text-xs"
                    >
                      {list.status}
                    </Badge>
                  </div>
                </div>
                {list.description && (
                  <CardDescription className="text-sm">
                    {list.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium">{list.prospect_count}</span>
                    <span className="text-xs text-slate-500">prospects</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>


      {/* Empty State */}
      {!loading && lists.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Aucune liste de prospects
            </h3>
            <p className="text-slate-500 text-center mb-6">
              Créez votre première liste de prospects pour commencer à gérer vos campagnes B2B.
            </p>
            <Button onClick={() => setCreateListModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une liste
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CreateListModal
        open={createListModalOpen}
        onOpenChange={setCreateListModalOpen}
        onSuccess={fetchLists}
      />

      <CreateProspectModal
        open={createProspectModalOpen}
        onOpenChange={setCreateProspectModalOpen}
        listId={null}
        onSuccess={() => {
          // Refresh the lists
          fetchLists();
        }}
      />

      <ImportCsvModal
        open={importCsvModalOpen}
        onOpenChange={setImportCsvModalOpen}
        listId={''}
        onSuccess={() => {
          // Refresh the lists
          fetchLists();
        }}
      />

      <AssignListModal
        open={assignListModalOpen}
        onOpenChange={setAssignListModalOpen}
        listId={selectedListForAssignment?.id || ''}
        listName={selectedListForAssignment?.name || ''}
      />

      {/* Edit List Modal */}
      <Dialog open={!!editingList} onOpenChange={() => setEditingList(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier la liste</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la liste de prospects
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nom de la liste</Label>
              <Input
                id="edit-name"
                value={editListName}
                onChange={(e) => setEditListName(e.target.value)}
                placeholder="Nom de la liste"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editListDescription}
                onChange={(e) => setEditListDescription(e.target.value)}
                placeholder="Description de la liste (optionnel)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingList(null);
                setEditListName('');
                setEditListDescription('');
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveEditList}
              disabled={!editListName.trim()}
            >
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Plus, Folder, Calendar, List, Users, UserCheck } from "lucide-react";
import { toast } from "sonner";
import ClientAssignmentModal from "@/components/ClientAssignmentModal";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNextAuth } from "@/lib/nextauth-context";
import { ActivityHelpers } from "@/lib/activity-logger";

interface Folder {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
  lists_count?: number;
  client_id?: string | null;
  client?: {
    id: string;
    name: string;
    company?: string;
    status: string;
  } | null;
}

export default function ProspectsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useNextAuth();
  const queryClient = useQueryClient();
  
  const [open, setOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string>("");
  
  // Client assignment modal state
  const [assignmentModal, setAssignmentModal] = useState<{
    open: boolean;
    type: 'folder' | 'list';
    itemId: string;
    itemName: string;
    currentClientId?: string | null;
  }>({
    open: false,
    type: 'folder',
    itemId: '',
    itemName: '',
    currentClientId: null
  });

  // Fetch folders with React Query
  const {
    data: folders = [],
    isLoading: loadingFolders,
    error: foldersError,
    refetch: refetchFolders
  } = useQuery<Folder[]>({
    queryKey: ["prospects", "folders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Fetch folders and count lists per folder, including client information
      const { data, error } = await supabase
        .from("folders")
        .select(`
          id, 
          name, 
          created_at, 
          user_id, 
          client_id,
          lists(count),
          client:clients(id, name, company, status)
        `)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching folders:", error);
        toast.error("Échec du chargement des dossiers");
        throw error;
      }
      
      return data.map((folder: any) => ({
        ...folder,
        lists_count: folder.lists?.length ?? 0,
      }));
    },
    enabled: !!user
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("folders")
        .insert({ name: folderName.trim(), user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["prospects", "folders"] });
      setOpen(false);
      setNewFolderName("");
      toast.success("Dossier créé avec succès");
      
      // Log prospect folder creation activity
      try {
        await ActivityHelpers.logProspectCreated(user?.id || '', `Created prospect folder: ${data.name}`);
      } catch (logError) {
        console.error('Error logging prospect folder creation:', logError);
      }
    },
    onError: (error: Error) => {
      setCreateError(error.message || "Échec de la création du dossier");
      toast.error("Échec de la création du dossier");
    }
  });

  const handleCreateFolder = async () => {
    setCreateError("");
    if (!newFolderName.trim()) return;
    
    setCreating(true);
    createFolderMutation.mutate(newFolderName.trim());
    setCreating(false);
  };

  if (loadingFolders) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col min-h-[200px] justify-between transition-all duration-200">
              <div>
                <CardHeader className="p-0 mb-4">
                  <Skeleton className="h-6 w-2/3 mb-2" />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (foldersError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg font-medium">Erreur de chargement</div>
          <p className="text-gray-500 mt-2">Impossible de charger les dossiers</p>
          <Button onClick={() => refetchFolders()} className="mt-4">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dossiers de prospects</h1>
            <p className="text-gray-600 mt-1">Organisez et gérez vos listes de prospects</p>
          </div>
          <Button 
            onClick={() => setOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Nouveau dossier
          </Button>
        </div>
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {folders.length === 0 ? (
          <Card
            className="col-span-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50/60 hover:bg-blue-50 transition-all cursor-pointer min-h-[200px] shadow-none"
            onClick={() => setOpen(true)}
            tabIndex={0}
            role="button"
            aria-label="Créer un nouveau dossier"
          >
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl shadow-sm">
                <Folder className="w-8 h-8" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun dossier</h3>
                <p className="text-gray-500">Commencez par créer votre premier dossier de prospects</p>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {folders.map((folder) => (
              <Card
                key={folder.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 group relative"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                  <CardTitle 
                    className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1 cursor-pointer"
                    onClick={() => router.push(`/dashboard/prospects/${folder.id}`)}
                  >
                    {folder.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssignmentModal({
                          open: true,
                          type: 'folder',
                          itemId: folder.id,
                          itemName: folder.name,
                          currentClientId: folder.client_id
                        });
                      }}
                      className="p-1.5 bg-white rounded-full border border-gray-200 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-200"
                      title="Assigner à un client"
                    >
                      <UserCheck className="w-4 h-4 text-gray-600" />
                    </Button>
                    <div
                      className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/prospects/${folder.id}`)}
                      title="Ouvrir le dossier"
                    >
                      <Folder className="w-4 h-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Créé le {format(new Date(folder.created_at), "dd/MM/yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <List className="w-4 h-4" />
                    <span>{folder.lists_count ?? 0} liste{folder.lists_count !== 1 ? 's' : ''}</span>
                  </div>
                  {folder.client && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      <UserCheck className="w-4 h-4" />
                      <span className="font-medium">{folder.client.name}</span>
                      {folder.client.company && (
                        <span className="text-xs text-blue-500">({folder.client.company})</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {/* Add Folder Card */}
            <Card
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50/60 hover:bg-blue-50 transition-all cursor-pointer min-h-[200px] shadow-none"
              onClick={() => setOpen(true)}
              tabIndex={0}
              role="button"
              aria-label="Créer un nouveau dossier"
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl shadow-sm">
                  <Plus className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Nouveau dossier</h3>
                  <p className="text-gray-500">Cliquez pour créer un dossier</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Nouveau dossier
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Créez un nouveau dossier pour organiser vos listes de prospects
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Nom du dossier</Label>
              <Input
                placeholder="Nom du dossier"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                disabled={creating}
                maxLength={50}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            {createError && (
              <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {createError}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                Annuler
              </Button>
              <Button 
                type="submit"
                disabled={creating || !newFolderName.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200"
              >
                {creating ? "Création..." : "Créer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Client Assignment Modal */}
      <ClientAssignmentModal
        open={assignmentModal.open}
        onOpenChange={(open) => setAssignmentModal(prev => ({ ...prev, open }))}
        type={assignmentModal.type}
        itemId={assignmentModal.itemId}
        itemName={assignmentModal.itemName}
        currentClientId={assignmentModal.currentClientId}
        onAssignmentChange={() => {
          // Refresh folders after assignment
          queryClient.invalidateQueries({ queryKey: ["prospects", "folders"] });
        }}
      />
    </div>
  );
}
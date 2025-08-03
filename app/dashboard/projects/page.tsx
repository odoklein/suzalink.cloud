"use client";
import { useEffect, useState } from "react";
import { useNextAuth } from "@/lib/nextauth-context";
import { supabase } from "@/lib/supabase";
import { ActivityHelpers } from "@/lib/activity-logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Filter, Search } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from "@/components/ui/skeleton";

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
  on_hold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  archived: 'bg-gray-100 text-gray-800 border-gray-200'
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
    {status === 'active' ? 'Actif' : 
     status === 'completed' ? 'Terminé' : 
     status === 'on_hold' ? 'En attente' : 
     status === 'cancelled' ? 'Annulé' : 
     status === 'archived' ? 'Archivé' : status}
  </span>
);

export default function ProjectsPage() {
  const { user } = useNextAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "active",
    client_id: "",
    start_date: "",
    end_date: "",
    budget: ""
  });
  const [editing, setEditing] = useState<any>(null);
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, projectId: string | null }>({ open: false, projectId: null });
  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [totalCount, setTotalCount] = useState<number>(0);
  // Debounced filters
  const [debouncedFilterStatus, setDebouncedFilterStatus] = useState(filterStatus);
  const [debouncedFilterClient, setDebouncedFilterClient] = useState(filterClient);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilterStatus(filterStatus), 300);
    return () => clearTimeout(t);
  }, [filterStatus]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilterClient(filterClient), 300);
    return () => clearTimeout(t);
  }, [filterClient]);

  // Fetch projects with React Query
  const {
    data: projects = [] as any[],
    isLoading: loadingProjects,
    isError: errorProjects,
    refetch: refetchProjects
  } = useQuery<any[], Error>({
    queryKey: [
      "projects",
      user?.id,
      filterStatus,
      filterClient,
      sortBy,
      sortDir,
      page,
      pageSize
    ],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from("projects")
        .select(`
          id, title, description, status, start_date, end_date, budget, progress, created_at,
          client:clients(id, name, company, contact_email, industry, status), client_id
        `, { count: "exact" });
      
      if (filterStatus && filterStatus !== "all") query = query.eq("status", filterStatus);
      if (filterClient && filterClient !== "all") query = query.eq("client_id", filterClient);
      query = query.order(sortBy, { ascending: sortDir === "asc" });
      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw new Error(error.message);
      
      if (typeof count === 'number') setTotalCount(count);
      return data || [];
    },
    enabled: !!user
  });

  // Fetch clients
  const {
    data: clients = [] as any[],
    isLoading: loadingClients,
    isError: errorClients
  } = useQuery<any[], Error>({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, company, contact_email, industry, status")
        .eq("status", "active")
        .order("name");
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!user
  });

  // Fetch users
  const {
    data: users = [] as any[],
    isLoading: loadingUsers,
    isError: errorUsers
  } = useQuery<any[], Error>({
    queryKey: ["users", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .order("full_name");
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!user
  });

  function openCreate() {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      status: "active",
      client_id: "",
      start_date: "",
      end_date: "",
      budget: ""
    });
    setOpen(true);
  }

  function openEdit(project: any) {
    setEditing(project);
    setForm({
      title: project.title,
      description: project.description || "",
      status: project.status || "active",
      client_id: project.client_id || "",
      start_date: project.start_date || "",
      end_date: project.end_date || "",
      budget: project.budget || ""
    });
    setOpen(true);
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload: any = {
      title: form.title,
      description: form.description,
      status: form.status,
      client_id: form.client_id === "" || form.client_id === "none" ? null : form.client_id,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: form.budget ? Number(form.budget) : null
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("projects").update(payload).eq("id", editing.id));
      if (error) {
        toast.error("Failed to update project", { description: error.message });
      } else {
        toast.success("Project updated successfully");
        // Log project update activity
        try {
          await ActivityHelpers.logProjectUpdated(user?.id || '', form.title, editing.id);
        } catch (logError) {
          console.error('Error logging project update:', logError);
        }
      }
    } else {
      const { data: newProject, error: insertError } = await supabase.from("projects").insert(payload).select().single();
      if (insertError) {
        toast.error("Failed to create project", { description: insertError.message });
      } else {
        toast.success("Project created successfully");
        // Log project creation activity
        try {
          await ActivityHelpers.logProjectCreated(user?.id || '', form.title, newProject?.id || '');
        } catch (logError) {
          console.error('Error logging project creation:', logError);
        }
      }
    }
    setOpen(false);
    refetchProjects();
  }

  async function handleDelete(id: string) {
    // Get project details before deletion for logging
    const { data: projectToDelete } = await supabase
      .from("projects")
      .select("title")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete project", { description: error.message });
    } else {
      toast.success("Project deleted successfully");
      // Log project deletion activity
      try {
        await ActivityHelpers.logProjectUpdated(user?.id || '', `Deleted project: ${projectToDelete?.title || 'Unknown'}`, id);
      } catch (logError) {
        console.error('Error logging project deletion:', logError);
      }
    }
    refetchProjects();
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projets</h1>
            <p className="text-gray-600 mt-1">Gérez vos projets et suivez leur progression</p>
          </div>
          <Button 
            onClick={openCreate} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Nouveau projet
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Filter className="w-4 h-4" />
                Filtres:
              </div>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="w-[160px] bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les clients</SelectItem>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{c.name}</span>
                        {c.company && <span className="text-xs text-gray-500">{c.company}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px] bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Plus récent</SelectItem>
                  <SelectItem value="title">Titre</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="px-3 py-2 border-gray-300 hover:bg-gray-50 transition-all duration-200"
                onClick={() => setSortDir(d => (d === "asc" ? "desc" : "asc"))}
                title={`Trier ${sortDir === "asc" ? "décroissant" : "croissant"}`}
              >
                {sortDir === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loadingProjects ? (
          <>
            {[...Array(pageSize)].map((_, i) => (
              <Card key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col min-h-[280px] justify-between transition-all duration-200">
                <div>
                  <CardHeader className="p-0 mb-4">
                    <Skeleton className="h-6 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="flex items-center gap-2 mb-3">
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <Skeleton className="h-4 w-1/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
              </Card>
            ))}
          </>
        ) : errorProjects ? (
          <div className="col-span-full text-center py-12">
            <div className="text-red-500 text-lg font-medium">Échec du chargement des projets</div>
            <p className="text-gray-500 mt-2">Veuillez réessayer plus tard</p>
          </div>
        ) : projects.length === 0 ? (
          <Card
            className="col-span-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50/60 hover:bg-blue-50 transition-all cursor-pointer min-h-[280px] shadow-none"
            onClick={openCreate}
            tabIndex={0}
            role="button"
            aria-label="Ajouter un nouveau projet"
          >
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl shadow-sm">
                <Plus className="w-8 h-8" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun projet</h3>
                <p className="text-gray-500">Commencez par créer votre premier projet</p>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {projects.map((project: any) => (
              <Card 
                key={project.id} 
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group"
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                  <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {project.title}
                  </CardTitle>
                  <StatusBadge status={project.status} />
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.status === 'active' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Progression</span>
                        <span className="font-medium">{Math.round((project.progress || 0) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.round((project.progress || 0) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                    {project.description || "Aucune description"}
                  </p>
                  <div className="flex justify-between items-center text-sm text-gray-500 pt-2 border-t border-gray-100">
                    <span className="font-medium">{project.client?.name || 'Aucun client'}</span>
                    <span>{new Date(project.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Add Project Card */}
            <Card
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50/60 hover:bg-blue-50 transition-all cursor-pointer min-h-[280px] shadow-none"
              onClick={openCreate}
              tabIndex={0}
              role="button"
              aria-label="Ajouter un nouveau projet"
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl shadow-sm">
                  <Plus className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Nouveau projet</h3>
                  <p className="text-gray-500">Cliquez pour créer un projet</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Pagination Controls */}
      {totalCount > pageSize && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Précédent
            </Button>
            <span className="px-4 py-1 rounded text-gray-700 bg-gray-100 text-sm font-medium">
              Page {page} sur {Math.ceil(totalCount / pageSize)}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => p + 1)} 
              disabled={page >= Math.ceil(totalCount / pageSize)}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Project Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {editing ? "Modifier le projet" : "Nouveau projet"}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {editing ? "Modifiez les informations du projet ci-dessous." : "Créez un nouveau projet en remplissant les informations ci-dessous."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Titre du projet</Label>
              <Input
                placeholder="Titre du projet"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Description</Label>
              <Input
                placeholder="Description (facultatif)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Statut</Label>
              <Select value={form.status} onValueChange={value => setForm(f => ({ ...f, status: value }))}>
                <SelectTrigger className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="on_hold">En attente</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Client</Label>
              <Select value={form.client_id || "none"} onValueChange={value => setForm(f => ({ ...f, client_id: value === "none" ? "" : value }))}>
                <SelectTrigger className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="Aucun client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun client</SelectItem>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{client.name}</span>
                        {client.company && <span className="text-xs text-gray-500">{client.company}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Date de début</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Date de fin</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Budget (€)</Label>
              <Input
                type="number"
                placeholder="Budget (facultatif)"
                value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200"
              >
                {editing ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteModal.open} onOpenChange={open => setDeleteModal(d => ({ ...d, open }))}>
        <DialogContent className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-gray-900">Supprimer le projet</DialogTitle>
            <DialogDescription className="text-gray-600">
              Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setDeleteModal({ open: false, projectId: null })}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (deleteModal.projectId) {
                  await handleDelete(deleteModal.projectId);
                }
                setDeleteModal({ open: false, projectId: null });
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200"
            >
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
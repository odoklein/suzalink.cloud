"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
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
import { ChevronDown } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from "@/components/ui/skeleton";

const statusColors = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  archived: 'bg-gray-100 text-gray-800'
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
    {status === 'active' ? 'Actif' : 
     status === 'completed' ? 'Terminé' : 
     status === 'on_hold' ? 'En attente' : 
     status === 'cancelled' ? 'Annulé' : 
     status === 'archived' ? 'Archivé' : status}
  </span>
);

export default function ProjectsPage() {
  const { user } = useAuth();
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
          id, title, description, status, start_date, end_date, budget, created_at,
          client:clients(name), client_id
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
        .select("id, name")
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
      }
    } else {
      ({ error } = await supabase.from("projects").insert(payload));
      if (error) {
        toast.error("Failed to create project", { description: error.message });
      } else {
        toast.success("Project created successfully");
      }
    }
    setOpen(false);
    refetchProjects();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete project", { description: error.message });
    } else {
      toast.success("Project deleted successfully");
    }
    refetchProjects();
  }

  if (!user) return null;

  return (
    <div>
      <div className="flex flex-col gap-6">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-4 justify-between mb-6 px-2 py-3 bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-[140px] bg-white border border-gray-200 rounded-lg shadow-sm">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les clients</SelectItem>
                {clients.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px] bg-white border border-gray-200 rounded-lg shadow-sm">
                <SelectValue placeholder="Label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] bg-white border border-gray-200 rounded-lg shadow-sm">
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
              className="px-2 border-gray-200"
              onClick={() => setSortDir(d => (d === "asc" ? "desc" : "asc"))}
              title={`Sort ${sortDir === "asc" ? "Descending" : "Ascending"}`}
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </Button>
          </div>
          <Button onClick={openCreate} className="rounded-lg font-medium shadow-sm">+ Nouveau projet</Button>
        </div>
        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {loadingProjects ? (
            <>
              {[...Array(pageSize)].map((_, i) => (
                <Card key={i} className="rounded-2xl p-4 bg-white border border--100 flex flex-col min-h-[220px] justify-between shadow-sm">
                  <div>
                    <CardHeader className="p-0 mb-2">
                      <Skeleton className="h-6 w-2/3 mb-2" /> {/* Title */}
                    </CardHeader>
                    <CardContent className="p-0">
                      <Skeleton className="h-4 w-full mb-2" /> {/* Description */}
                      <div className="flex items-center gap-2 mb-2">
                        <Skeleton className="h-7 w-7 rounded-full" /> {/* Avatar */}
                      </div>
                      <Skeleton className="h-3 w-1/2 mb-2" /> {/* Status/Client */}
                    </CardContent>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Skeleton className="h-3 w-1/4" /> {/* Date */}
                    <div className="flex gap-2 items-center">
                      <Skeleton className="h-5 w-5 rounded-full" /> {/* Star */}
                      <Skeleton className="h-5 w-5 rounded-full" /> {/* Menu */}
                    </div>
                  </div>
                </Card>
              ))}
            </>
          ) : errorProjects ? (
            <div className="text-red-500">Failed to load projects.</div>
          ) : projects.length === 0 ? (
            <Card
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50/60 hover:bg-purple-50 transition-all cursor-pointer min-h-[220px] shadow-none"
              onClick={openCreate}
              tabIndex={0}
              role="button"
              aria-label="Add new project"
            >
              <button
                className="flex flex-col items-center justify-center gap-2 focus:outline-none"
                style={{ width: '100%', height: '100%' }}
                tabIndex={-1}
                type="button"
              >
                <span className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-500 text-3xl mb-2 shadow-sm">
                  +
                </span>
                <span className="text-gray-500 font-medium">New Project</span>
              </button>
            </Card>
          ) : (
            <>
              {projects.map((project: any) => (
                <Card 
                  key={project.id} 
                  className="transition-all duration-200 hover:shadow-md hover:border-gray-300 group"
                  onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium group-hover:text-blue-600 transition-colors">
                      {project.title}
                    </CardTitle>
                    <StatusBadge status={project.status} />
                  </CardHeader>
                  <CardContent>
                    {project.status === 'active' && (
                      <div className="mt-2 mb-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{Math.round((project.progress || 0) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ width: `${Math.round((project.progress || 0) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                    <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                      <span>{project.client?.name || 'No client'}</span>
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {/* Add Project Card */}
              <Card
                className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50/60 hover:bg-purple-50 transition-all cursor-pointer min-h-[220px] shadow-none"
                onClick={openCreate}
                tabIndex={0}
                role="button"
                aria-label="Add new project"
              >
                <button
                  className="flex flex-col items-center justify-center gap-2 focus:outline-none"
                  style={{ width: '100%', height: '100%' }}
                  tabIndex={-1}
                  type="button"
                >
                  <span className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-500 text-3xl mb-2 shadow-sm">
                    +
                  </span>
                  <span className="text-gray-500 font-medium">New Project</span>
                </button>
              </Card>
            </>
          )}
        </div>
        {/* Pagination Controls */}
        {totalCount > pageSize && (
          <div className="flex justify-center mt-6 gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>&larr; Prev</Button>
            <span className="px-2 py-1 rounded text-gray-700 bg-gray-100">Page {page} of {Math.ceil(totalCount / pageSize)}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(totalCount / pageSize)}>Next &rarr;</Button>
          </div>
        )}
      </div>
      {/* Dialogs et modales */}
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier le projet" : "Nouveau projet"}</DialogTitle>
          <DialogDescription>
            {editing ? "Modifiez les informations du projet ci-dessous." : "Créez un nouveau projet en remplissant les informations ci-dessous."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Titre du projet"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
            className="rounded-lg"
          />
          <Input
            placeholder="Description (facultatif)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="rounded-lg"
          />
          <div>
            <Label>Statut</Label>
            <Select value={form.status} onValueChange={value => setForm(f => ({ ...f, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="planifié">Planifié</SelectItem>
                <SelectItem value="terminé">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Client</Label>
            <Select value={form.client_id || "none"} onValueChange={value => setForm(f => ({ ...f, client_id: value === "none" ? "" : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Aucun client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun client</SelectItem>
                {clients.map((client: any) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input
              type="date"
              value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              className="rounded-lg"
              placeholder="Date de début"
            />
            <Input
              type="date"
              value={form.end_date}
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              className="rounded-lg"
              placeholder="Date de fin"
            />
          </div>
          <Input
            type="number"
            placeholder="Budget (facultatif)"
            value={form.budget}
            onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
            className="rounded-lg"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">{editing ? "Enregistrer" : "Créer"}</Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>
      {/* Modal de confirmation de suppression */}
      <Dialog open={deleteModal.open} onOpenChange={open => setDeleteModal(d => ({ ...d, open }))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer le projet</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setDeleteModal({ open: false, projectId: null })}>Annuler</Button>
          <Button variant="destructive" onClick={async () => {
            if (deleteModal.projectId) {
              await handleDelete(deleteModal.projectId);
            }
            setDeleteModal({ open: false, projectId: null });
          }}>Supprimer</Button>
        </div>
      </DialogContent>
      </Dialog>
    </div>
  );
}
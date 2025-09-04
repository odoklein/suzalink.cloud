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
import { validateProject, validateClientExists } from "@/lib/validation";
import { showErrorToast, showSuccessToast, withRetry, handleAsyncError } from "@/lib/error-handling";
import { useFormState } from "@/hooks/use-form-state";
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
  // Project form state with validation
  const projectForm = useFormState({
    initialValues: {
      title: "",
      description: "",
      status: "active",
      client_id: "",
      start_date: "",
      end_date: "",
      budget: ""
    },
    validate: (values) => {
      const projectData = {
        ...values,
        budget: values.budget ? Number(values.budget) : null
      };
      const result = validateProject(projectData);
      if (result.success) {
        return { success: true, data: values };
      }
      return result;
    },
    onSubmit: async (values) => {
      await handleProjectSubmit(values);
    }
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
    projectForm.reset({
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
    projectForm.reset({
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

  // Handle project submission with comprehensive validation
  async function handleProjectSubmit(formValues: any) {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Validate client exists if provided
      if (formValues.client_id && formValues.client_id !== "none") {
        const clientExists = await validateClientExists(formValues.client_id, supabase);
        if (!clientExists) {
          throw new Error('Selected client no longer exists');
        }
      }

      const payload = {
        title: formValues.title.trim(),
        description: formValues.description?.trim() || null,
        status: formValues.status,
        client_id: formValues.client_id === "" || formValues.client_id === "none" ? null : formValues.client_id,
        start_date: formValues.start_date || null,
        end_date: formValues.end_date || null,
        budget: formValues.budget ? Number(formValues.budget) : null,
        user_id: user.id
      };

      if (editing) {
        // Update existing project
        await withRetry(async () => {
          const { error } = await supabase
            .from("projects")
            .update(payload)
            .eq("id", editing.id);
          if (error) throw error;
        }, 3, 1000, 'project update');

        showSuccessToast("Project updated successfully");
        
        // Log project update activity
        try {
          await ActivityHelpers.logProjectUpdated(user.id, formValues.title, editing.id);
        } catch (logError) {
          console.error('Error logging project update:', logError);
        }
      } else {
        // Create new project
        const newProject = await withRetry(async () => {
          const { data, error } = await supabase
            .from("projects")
            .insert(payload)
            .select()
            .single();
          if (error) throw error;
          return data;
        }, 3, 1000, 'project creation');

        showSuccessToast("Project created successfully");
        
        // Log project creation activity
        try {
          await ActivityHelpers.logProjectCreated(user.id, formValues.title, newProject?.id || '');
        } catch (logError) {
          console.error('Error logging project creation:', logError);
        }
      }

      setOpen(false);
      refetchProjects();
    } catch (error) {
      handleAsyncError(error, editing ? 'Project update' : 'Project creation');
      throw error; // Re-throw to let form handle it
    }
  }

  async function handleDelete(id: string) {
    try {
      // Get project details before deletion for logging
      const { data: projectToDelete } = await supabase
        .from("projects")
        .select("title")
        .eq("id", id)
        .single();

      await withRetry(async () => {
        const { error } = await supabase.from("projects").delete().eq("id", id);
        if (error) throw error;
      }, 3, 1000, 'project deletion');

      showSuccessToast("Project deleted successfully");
      
      // Log project deletion activity
      try {
        await ActivityHelpers.logProjectUpdated(
          user?.id || '', 
          `Deleted project: ${projectToDelete?.title || 'Unknown'}`, 
          id
        );
      } catch (logError) {
        console.error('Error logging project deletion:', logError);
      }

      refetchProjects();
    } catch (error) {
      handleAsyncError(error, 'Project deletion');
    }
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
          <form onSubmit={projectForm.handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Titre du projet</Label>
              <Input
                placeholder="Titre du projet"
                {...projectForm.getFieldProps('title')}
                required
                className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm ${
                  projectForm.hasError('title') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {projectForm.hasError('title') && (
                <p className="text-sm text-red-600 mt-1">{projectForm.getError('title')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Description</Label>
              <Input
                placeholder="Description (facultatif)"
                {...projectForm.getFieldProps('description')}
                className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm ${
                  projectForm.hasError('description') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {projectForm.hasError('description') && (
                <p className="text-sm text-red-600 mt-1">{projectForm.getError('description')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Statut</Label>
              <Select {...projectForm.getSelectProps('status')}>
                <SelectTrigger className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  projectForm.hasError('status') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}>
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
              {projectForm.hasError('status') && (
                <p className="text-sm text-red-600 mt-1">{projectForm.getError('status')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Client</Label>
              <Select 
                value={projectForm.values.client_id || "none"} 
                onValueChange={value => projectForm.setValue('client_id', value === "none" ? "" : value)}
                disabled={projectForm.formState.isSubmitting}
              >
                <SelectTrigger className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  projectForm.hasError('client_id') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}>
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
              {projectForm.hasError('client_id') && (
                <p className="text-sm text-red-600 mt-1">{projectForm.getError('client_id')}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Date de début</Label>
                <Input
                  type="date"
                  {...projectForm.getFieldProps('start_date')}
                  className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm ${
                    projectForm.hasError('start_date') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {projectForm.hasError('start_date') && (
                  <p className="text-sm text-red-600 mt-1">{projectForm.getError('start_date')}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Date de fin</Label>
                <Input
                  type="date"
                  {...projectForm.getFieldProps('end_date')}
                  className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm ${
                    projectForm.hasError('end_date') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {projectForm.hasError('end_date') && (
                  <p className="text-sm text-red-600 mt-1">{projectForm.getError('end_date')}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Budget (€)</Label>
              <Input
                type="number"
                placeholder="Budget (facultatif)"
                {...projectForm.getFieldProps('budget')}
                className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm ${
                  projectForm.hasError('budget') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {projectForm.hasError('budget') && (
                <p className="text-sm text-red-600 mt-1">{projectForm.getError('budget')}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setOpen(false);
                  projectForm.reset();
                }}
                disabled={projectForm.formState.isSubmitting}
                className="border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </Button>
              <Button 
                type="submit"
                disabled={projectForm.formState.isSubmitting || projectForm.hasAnyError}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {projectForm.formState.isSubmitting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
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
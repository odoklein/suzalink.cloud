"use client";
import { useEffect, useState, useMemo } from "react";
import { useNextAuth } from "@/lib/nextauth-context";
import { supabase } from "@/lib/supabase";
import { ActivityHelpers } from "@/lib/activity-logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { validateProject, validateClientExists } from "@/lib/validation";
import { showErrorToast, showSuccessToast, withRetry, handleAsyncError } from "@/lib/error-handling";
import { useFormState } from "@/hooks/use-form-state";
import { useRouter } from "next/navigation";
import { 
  ChevronDown, 
  ChevronRight,
  Plus, 
  Search,
  MoreVertical,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Play
} from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from "@/components/ui/skeleton";

// Status configuration for the new design
const STATUS_CONFIG = {
  not_started: {
    label: 'Pas Commencé',
    icon: FileText,
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-700',
    calendarColor: 'bg-gray-400'
  },
  in_progress: {
    label: 'En Cours', 
    icon: Play,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    calendarColor: 'bg-green-500'
  },
  on_hold: {
    label: 'En Attente',
    icon: Pause,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200', 
    textColor: 'text-yellow-700',
    calendarColor: 'bg-yellow-500'
  },
  cancelled: {
    label: 'Annulé',
    icon: XCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    calendarColor: 'bg-red-500'
  },
  finished: {
    label: 'Terminé',
    icon: CheckCircle,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    calendarColor: 'bg-purple-500'
  }
};

// Helper function to get member initials
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Helper function to format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
};

export default function ProjectsPage() {
  const { user } = useNextAuth();
  const router = useRouter();
  
  // UI State
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, projectIds: string[] }>({ 
    open: false, 
    projectIds: [] 
  });

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

  // Fetch all projects with related data
  const {
    data: projects = [] as any[],
    isLoading: loadingProjects,
    isError: errorProjects,
    refetch: refetchProjects
  } = useQuery<any[], Error>({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id, title, description, status, start_date, end_date, budget, created_at, user_id,
          client:clients(id, name, company, contact_email, industry, status), client_id
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!user
  });

  // Fetch all tasks for member calculation
  const {
    data: allTasks = [] as any[],
    isLoading: loadingTasks
  } = useQuery<any[], Error>({
    queryKey: ["all-tasks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("tasks")
        .select("id, project_id, assignee_id, title, status");
      
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!user
  });

  // Fetch all users for member display
  const {
    data: allUsers = [] as any[],
    isLoading: loadingUsers
  } = useQuery<any[], Error>({
    queryKey: ["all-users", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email")
        .order('full_name');
      
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!user
  });

  // Fetch clients for form dropdown
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

  // Process data for the new design
  const processedData = useMemo(() => {
    if (!projects.length || loadingTasks || loadingUsers) {
      return { groupedProjects: {}, filteredProjects: [], calendarData: [] };
    }

    // Create task lookup by project
    const tasksByProject = allTasks.reduce((acc: Record<string, any[]>, task) => {
      if (!acc[task.project_id]) acc[task.project_id] = [];
      acc[task.project_id].push(task);
      return acc;
    }, {});

    // Create user lookup
    const userLookup = allUsers.reduce((acc: Record<string, any>, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    // Determine project status for grouping
    const getProjectGroupStatus = (project: any) => {
      const projectTasks = tasksByProject[project.id] || [];
      
      if (project.status === 'completed' || project.status === 'archived') {
        return 'finished';
      } else if (project.status === 'cancelled') {
        return 'cancelled';
      } else if (project.status === 'on_hold') {
        return 'on_hold';
      } else if (project.status === 'active') {
        return projectTasks.length === 0 ? 'not_started' : 'in_progress';
      }
      return 'not_started';
    };

    // Get project members from tasks
    const getProjectMembers = (project: any) => {
      const projectTasks = tasksByProject[project.id] || [];
      const uniqueAssigneeIds = [...new Set(projectTasks.map(t => t.assignee_id).filter(Boolean))];
      return uniqueAssigneeIds.map(id => userLookup[id]).filter(Boolean);
    };

    // Search filtering
    const searchFiltered = projects.filter(project => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const projectTasks = tasksByProject[project.id] || [];
      
      return (
        project.title?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) ||
        project.client?.name?.toLowerCase().includes(query) ||
        projectTasks.some(task => task.title?.toLowerCase().includes(query))
      );
    });

    // Group projects by status
    const grouped = searchFiltered.reduce((acc: Record<string, any[]>, project) => {
      const groupStatus = getProjectGroupStatus(project);
      if (!acc[groupStatus]) acc[groupStatus] = [];
      
      acc[groupStatus].push({
        ...project,
        groupStatus,
        members: getProjectMembers(project),
        taskCount: tasksByProject[project.id]?.length || 0
      });
      return acc;
    }, {});

    return {
      groupedProjects: grouped,
      filteredProjects: searchFiltered
    };
  }, [projects, allTasks, allUsers, searchQuery, loadingTasks, loadingUsers]);


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
      await withRetry(async () => {
        const { error } = await supabase
          .from("projects")
          .delete()
          .eq("id", id);
        if (error) throw error;
      }, 3, 1000, 'project deletion');

      showSuccessToast("Project deleted successfully");
      refetchProjects();
    } catch (error) {
      handleAsyncError(error, 'Project deletion');
    }
  }

  if (!user) return null;

  const isLoading = loadingProjects || loadingTasks || loadingUsers;
  const { groupedProjects } = processedData;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Projets</h1>
              <p className="text-gray-600">Gérez vos projets et suivez leur progression</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Rechercher projets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 border-gray-300 rounded-lg"
                />
              </div>
              <Button 
                onClick={openCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2.5"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Projet
              </Button>
            </div>
          </div>
        </div>

        {/* Project List Content */}
        <div className="p-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <Skeleton className="w-8 h-8 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Status Overview */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                  const count = (groupedProjects as Record<string, any[]>)[key]?.length || 0;
                  const Icon = config.icon;
                  return (
                    <div key={key} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                          <Icon className={`w-5 h-5 ${config.textColor}`} />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-gray-900">{count}</div>
                          <div className="text-sm text-gray-600">{config.label}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Projects Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.values(groupedProjects as Record<string, any[]>).flat().map((project: any) => {
                  const statusConfig = STATUS_CONFIG[project.groupStatus as keyof typeof STATUS_CONFIG];
                  const Icon = statusConfig?.icon || FileText;
                  
                  return (
                    <div 
                      key={project.id} 
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                      onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                    >
                      {/* Project Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusConfig?.bgColor || 'bg-gray-100'}`}>
                            <Icon className={`w-5 h-5 ${statusConfig?.textColor || 'text-gray-600'}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {project.title}
                            </h3>
                            <p className="text-sm text-gray-500">{statusConfig?.label}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openEdit(project);
                            }}>
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteModal({ open: true, projectIds: [project.id] });
                              }}
                              className="text-red-600"
                            >
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Project Description */}
                      {project.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      {/* Project Stats */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {project.taskCount > 0 && (
                            <span>{project.taskCount} tâche{project.taskCount !== 1 ? 's' : ''}</span>
                          )}
                          {project.start_date && (
                            <span>{formatDate(project.start_date)}</span>
                          )}
                        </div>
                      </div>

                      {/* Project Footer */}
                      <div className="flex items-center justify-between">
                        {/* Team Members */}
                        <div className="flex items-center -space-x-2">
                          {project.members.slice(0, 3).map((member: any) => (
                            <div
                              key={member.id}
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white text-xs font-medium flex items-center justify-center border-2 border-white"
                              title={member.full_name}
                            >
                              {getInitials(member.full_name)}
                            </div>
                          ))}
                          {project.members.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 text-xs font-medium flex items-center justify-center border-2 border-white">
                              +{project.members.length - 3}
                            </div>
                          )}
                          {project.members.length === 0 && (
                            <span className="text-xs text-gray-400">Aucun membre</span>
                          )}
                        </div>

                        {/* Client Badge */}
                        {project.client && (
                          <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {project.client.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Empty State */}
              {Object.values(groupedProjects).every(group => group.length === 0) && (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun projet trouvé</h3>
                  <p className="text-gray-500 mb-6">Commencez par créer votre premier projet</p>
                  <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un Projet
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Project Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {editing ? "Modifier le Projet" : "Nouveau Projet"}
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

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal(prev => ({ ...prev, open }))}>
        <DialogContent className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-gray-900">Supprimer les Projets</DialogTitle>
            <DialogDescription className="text-gray-600">
              Êtes-vous sûr de vouloir supprimer {deleteModal.projectIds.length} projet(s) ? Cette action ne peut pas être annulée.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setDeleteModal({ open: false, projectIds: [] })}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (deleteModal.projectIds.length > 0) {
                  for (const projectId of deleteModal.projectIds) {
                    await handleDelete(projectId);
                  }
                }
                setDeleteModal({ open: false, projectIds: [] });
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
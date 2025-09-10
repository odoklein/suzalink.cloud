"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useNextAuth } from "@/lib/nextauth-context";
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
import { validateTask, validateProject, validateProjectExists, validateUserExists } from "@/lib/validation";
import { showErrorToast, showSuccessToast, withRetry, handleAsyncError } from "@/lib/error-handling";
import { notifyTaskAssigned, notifyTaskStatusChanged } from "@/lib/notification-utils";
import { useFormState } from "@/hooks/use-form-state";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PlusIcon, MoreHorizontal, CalendarDaysIcon, FolderKanban, List, ArrowLeft } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

const TASK_STATUSES = [
  { value: "todo", label: "À faire" },
  { value: "doing", label: "En cours" },
  { value: "done", label: "Terminé" },
];

const STATUS_META: Record<string, any> = {
  todo: {
    label: 'TODO',
    color: 'bg-blue-100 text-blue-600 border-blue-200',
  },
  doing: {
    label: 'IN WORK',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  done: {
    label: 'COMPLETED',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
};


// Utility functions
const getPriorityColor = (priority?: string) => {
  switch (priority?.toLowerCase()) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-gray-400';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const isOverdue = (dateString: string) => {
  return new Date(dateString) < new Date();
};

export default function ProjectDetailPage() {
  const { user } = useNextAuth();
  
  const getAssigneeInitials = (assigneeId: string) => {
    const user = usersData.find((u: {id: string; full_name: string}) => u.id === assigneeId);
    if (!user?.full_name) return '?';
    return user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  };

  const getAssigneeName = (assigneeId: string) => {
    const user = usersData.find((u: {id: string; full_name: string}) => u.id === assigneeId);
    return user?.full_name || 'Inconnu';
  };


  const params = useParams();
  if (!params?.id) {
    return <div className="p-8 text-center text-gray-500">ID de projet non trouvé</div>;
  }
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // React Query for tasks
  const {
    data: tasksData = [],
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks
  } = useQuery<any[], Error>({
    queryKey: ['tasks', id],
    queryFn: async () => {
      if (!id) return [];
      
      // First check if project exists
      const { data: projectExists } = await supabase
        .from("projects")
        .select("id")
        .eq("id", id)
        .single();
      
      if (!projectExists) {
        toast.error("Le projet n'existe plus");
        router.push("/dashboard/projects");
        return [];
      }
      
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, description, status, assignee_id, due_date, priority, created_at")
        .eq("project_id", id)
        .order("created_at", { ascending: true });
      
      if (error) {
        toast.error("Échec de récupération des tâches", { description: error.message });
        return [];
      }
      
      // Validate task data and filter out any invalid entries
      const validTasks = (data || []).filter(task => {
        if (!task || !task.id || !task.title) {
          return false;
        }
        const validStatus = TASK_STATUSES.find(s => s.value === task.status);
        if (!validStatus) {
          return false;
        }
        return true;
      });
      
      return validTasks;
    },
    enabled: !!id && !!user
  });

  const [clients, setClients] = useState<Array<{
    id: string;
    name: string;
  }>>([]);
  const [open, setOpen] = useState(false);
  // Task form state with validation
  const taskForm = useFormState({
    initialValues: {
      id: '',
      title: '',
      description: '',
      due_date: '',
      status: 'todo',
      priority: 'medium',
      assignee_id: null as string | null
    },
    validate: (values) => {
      // Only validate if not editing (editing has different validation)
      if (!editing) {
        const taskData = {
          ...values,
          project_id: id,
          created_by: user?.id || ''
        };
        const result = validateTask(taskData);
        if (result.success) {
          return { success: true, data: values };
        }
        return result;
      }
      return { success: true, data: values };
    },
    onSubmit: async (values) => {
      await handleTaskSubmit(values);
    }
  });
  const [editing, setEditing] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, taskId: string | null }>({ open: false, taskId: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [view, setView] = useState<'board' | 'list'>('board');

  const [isProjectEditOpen, setIsProjectEditOpen] = useState(false);
  // Project form state with validation
  const projectForm = useFormState({
    initialValues: {
      title: project?.title || '',
      description: project?.description || '',
      status: project?.status || 'active',
      client_id: project?.client_id || '',
      start_date: project?.start_date || '',
      end_date: project?.end_date || '',
      budget: project?.budget || ''
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
      await handleProjectEditSubmit(values);
    }
  });

  const {
    data: usersData = [],
    isLoading: loadingUsers,
    isError: errorUsers,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('id, full_name, email').order('full_name');
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!user // Only fetch users if user is authenticated
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      // Comprehensive validation before database operation
      const validationResult = validateTask(payload);
      if (!validationResult.success) {
        throw new Error(validationResult.message);
      }

      // Validate project exists
      const projectExists = await validateProjectExists(payload.project_id, supabase);
      if (!projectExists) {
        throw new Error('Project does not exist or has been deleted');
      }

      // Validate assignee exists if provided
      if (payload.assignee_id) {
        const assigneeExists = await validateUserExists(payload.assignee_id, supabase);
        if (!assigneeExists) {
          throw new Error('Assigned user does not exist');
        }
      }

      // Use retry mechanism for database operation
      return await withRetry(async () => {
        const { error, data } = await supabase.from('tasks').insert(payload).select().single();
        if (error) throw error;
        return data;
      }, 3, 1000, 'task creation');
    },
    onMutate: async (newTask: any) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', id] });
      const prevTasks = queryClient.getQueryData(['tasks', id]) || [];
      queryClient.setQueryData(['tasks', id], (old: any[] = []) => [...old, { ...newTask, id: Math.random().toString(36).slice(2) }]);
      return { prevTasks };
    },
    onError: (err: any, newTask: any, context: any) => {
      queryClient.setQueryData(['tasks', id], context.prevTasks);
      showErrorToast(err, 'Task creation failed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    },
    onSuccess: async (data: any, variables: any) => {
      showSuccessToast('Task created successfully');
      setOpen(false);
      taskForm.reset();
      
      // Send notification if task is assigned to someone other than creator
      if (variables.assignee_id && variables.assignee_id !== user?.id) {
        try {
          const assignerName = user?.name || user?.email || 'Système';
          await notifyTaskAssigned(data.id, data.title, variables.assignee_id, assignerName);
        } catch (notificationError) {
          console.error('Error sending task assignment notification:', notificationError);
          // Don't fail the task creation if notification fails
        }
      }
    }
  });

  // Mutation for task updates with optimistic updates
  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; updates: any }) => {
      const { error, data } = await supabase
        .from('tasks')
        .update(payload.updates)
        .eq('id', payload.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', id] });
      const prevTasks = queryClient.getQueryData(['tasks', id]) || [];
      queryClient.setQueryData(['tasks', id], (old: any[] = []) => 
        old.map(task => 
          task.id === variables.id 
            ? { ...task, ...variables.updates }
            : task
        )
      );
      return { prevTasks };
    },
    onError: (err: any, variables: any, context: any) => {
      queryClient.setQueryData(['tasks', id], context.prevTasks);
      showErrorToast(err, 'Task update failed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    },
    onSuccess: () => {
      showSuccessToast('Task updated successfully');
    }
  });

  // Mutation for task deletion with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      if (error) throw error;
      return taskId;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', id] });
      const prevTasks = queryClient.getQueryData(['tasks', id]) || [];
      queryClient.setQueryData(['tasks', id], (old: any[] = []) => 
        old.filter(task => task.id !== taskId)
      );
      return { prevTasks };
    },
    onError: (err: any, taskId: any, context: any) => {
      queryClient.setQueryData(['tasks', id], context.prevTasks);
      showErrorToast(err, 'Task deletion failed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    },
    onSuccess: () => {
      showSuccessToast('Task deleted successfully');
    }
  });

  // Mutation for task status updates (drag and drop) with optimistic updates
  const statusUpdateMutation = useMutation({
    mutationFn: async (payload: { taskId: string; status: string; oldStatus: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: payload.status })
        .eq('id', payload.taskId);
      if (error) throw error;
      return payload;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', id] });
      const prevTasks = queryClient.getQueryData(['tasks', id]) || [];
      queryClient.setQueryData(['tasks', id], (old: any[] = []) => 
        old.map(task => 
          task.id === variables.taskId 
            ? { ...task, status: variables.status }
            : task
        )
      );
      return { prevTasks };
    },
    onSuccess: async (variables) => {
      // Send notification to task assignee if status changed
      try {
        const task = tasks.find(t => t.id === variables.taskId);
        if (task && task.assigned_to && task.assigned_to !== user?.id) {
          const changedBy = user?.name || user?.email || 'Système';
          await notifyTaskStatusChanged(
            variables.taskId,
            task.title,
            task.assigned_to,
            variables.oldStatus,
            variables.status,
            changedBy,
            id // Pass the project ID
          );
        }
      } catch (notificationError) {
        console.error('Error sending task status change notification:', notificationError);
        // Don't fail the operation if notification fails
      }
    },
    onError: (err: any, variables: any, context: any) => {
      queryClient.setQueryData(['tasks', id], context.prevTasks);
      showErrorToast(err, 'Status update failed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    }
  });

  useEffect(() => {
    if (!id) return;
    fetchProject();
    fetchClients();
    // eslint-disable-next-line
  }, [id]);

  // Update tasks state when React Query data changes
  useEffect(() => {
    // Only update if the data has actually changed to prevent infinite loops
    setTasks(prevTasks => {
      const hasChanged = prevTasks.length !== tasksData.length ||
        prevTasks.some((task, index) => task.id !== tasksData[index]?.id);
      return hasChanged ? tasksData : prevTasks;
    });
    setLoading(tasksLoading);
  }, [tasksData, tasksLoading]);

  // Add smooth animation classes for task cards
  const getTaskCardClasses = (task: any) => {
    const baseClasses = "bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 transition-all duration-300 ease-in-out hover:shadow-md";
    const priorityClasses = getPriorityColor(task.priority);
    return `${baseClasses} ${priorityClasses}`;
  };

  async function fetchProject() {
    const { data, error } = await supabase
      .from("projects")
      .select(`
        id, title, description, status, client_id, start_date, end_date, budget,
        client:clients(id, name, company, contact_email, industry, status)
      `)
      .eq("id", id)
      .single();
    
    if (error || !data) {
      toast.error("Projet non trouvé ou inaccessible");
      router.push("/dashboard/projects");
      return;
    }
    
    setProject(data);
    projectForm.reset({
      title: data?.title || '',
      description: data?.description || '',
      status: data?.status || 'active',
      client_id: data?.client_id || '',
      start_date: data?.start_date || '',
      end_date: data?.end_date || '',
      budget: data?.budget || ''
    });
  }

  async function fetchClients() {
    const { data } = await supabase
      .from("clients")
      .select("id, name, company, contact_email, industry, status")
      .eq("status", "active")
      .order("name");
    setClients(data || []);
  }


  function openCreate(status: string) {
    setEditing(null);
    taskForm.reset({
      id: '',
      title: '',
      description: '',
      due_date: '',
      status: status || 'todo',
      priority: 'medium',
      assignee_id: null
    });
    setOpen(true);
  }

  function openEdit(task: any) {
    setEditing(task);
    taskForm.reset({
      id: task.id,
      title: task.title,
      description: task.description || '',
      due_date: task.due_date || '',
      status: task.status,
      priority: task.priority || 'medium',
      assignee_id: task.assignee_id || null
    });
    setOpen(true);
  }

  // Handle task submission with comprehensive validation
  async function handleTaskSubmit(formValues: any) {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Validate project exists before creating/updating task
      const projectExists = await validateProjectExists(id, supabase);
      if (!projectExists) {
        throw new Error('Project no longer exists');
      }

      const payload = {
        title: formValues.title.trim(),
        description: formValues.description?.trim() || null,
        due_date: formValues.due_date || null,
        status: formValues.status,
        priority: formValues.priority || 'medium',
        assignee_id: formValues.assignee_id || null,
        project_id: id,
        created_by: user.id
      };

      if (editing) {
        // Update existing task
        const updatePayload: Partial<typeof payload> = { ...payload };
        delete updatePayload.created_by; // Don't update creator
        delete updatePayload.project_id; // Don't update project

        // Use the update mutation with optimistic updates
        updateMutation.mutate({ id: editing.id, updates: updatePayload });

        // Send notification if assignee changed to someone other than current user
        if (updatePayload.assignee_id && updatePayload.assignee_id !== user?.id && updatePayload.assignee_id !== editing.assignee_id) {
          try {
            const assignerName = user?.name || user?.email || 'Système';
            await notifyTaskAssigned(editing.id, editing.title, updatePayload.assignee_id, assignerName);
          } catch (notificationError) {
            console.error('Error sending task assignment notification:', notificationError);
            // Don't fail the task update if notification fails
          }
        }

        setOpen(false);
      } else {
        // Create new task
        mutation.mutate(payload);
      }
    } catch (error) {
      handleAsyncError(error, editing ? 'Task update' : 'Task creation');
      throw error; // Re-throw to let form handle it
    }
  }

  function openDelete(taskId: string) {
    setDeleteModal({ open: true, taskId });
  }

  function closeDelete() {
    setDeleteModal({ open: false, taskId: null });
  }

  async function handleDeleteConfirmed() {
    if (!deleteModal.taskId) return;
    deleteMutation.mutate(deleteModal.taskId);
    closeDelete();
  }

  const handleProjectEditSubmit = async (formValues: any) => {
    try {
      const payload = {
        title: formValues.title.trim(),
        description: formValues.description?.trim() || null,
        status: formValues.status,
        client_id: formValues.client_id === "" || formValues.client_id === "none" ? null : formValues.client_id,
        start_date: formValues.start_date || null,
        end_date: formValues.end_date || null,
        budget: formValues.budget ? Number(formValues.budget) : null
      };

      await withRetry(async () => {
        const { error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
      }, 3, 1000, 'project update');
      
      showSuccessToast('Project updated successfully');
      setIsProjectEditOpen(false);
      fetchProject();
    } catch (error) {
      handleAsyncError(error, 'Project update');
      throw error; // Re-throw to let form handle it
    }
  };


  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  if (!project) return <div className="text-gray-400 p-8">Projet non trouvé.</div>;

  return (
    <div className="space-y-8 bg-gray-50 min-h-screen p-6">
      {/* Back Button and Project Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux projets
        </Button>
      </div>

      {/* Project Header - Inspired Design */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <span>Workspace</span>
          <span>/</span>
          <span className="text-gray-900 font-medium">{project?.title || 'Chargement...'}</span>
          <span>/</span>
          <span className="text-gray-900 font-medium">Board</span>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-4xl font-bold text-gray-900">{project?.title || 'Chargement...'}</h1>
              <div className="flex items-center gap-2">
                {/* Star Icon */}
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-gray-400 hover:text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
                {/* Lightning Icon */}
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-gray-400 hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
                {/* Share Icon */}
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1">
                  <svg className="w-5 h-5 text-gray-400 hover:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </button>
              </div>
            </div>
            
            <p className="text-gray-600 text-lg leading-relaxed mb-6">{project?.description || 'Pas de description'}</p>
            
            {/* Project Team and Client Info */}
            <div className="flex items-center gap-6">
            {project?.client && (
                <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Client:</span>
                  <span className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                  {project.client.name}
                </span>
              </div>
            )}
              
              {/* Team Members */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Team:</span>
                <div className="flex -space-x-2">
                  {usersData.slice(0, 4).map((user: any, index: number) => (
                    <div key={user.id} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                      {user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
          </div>
                  ))}
                  {usersData.length > 4 && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white">
                      +{usersData.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 ml-6">
            <Button 
              onClick={() => setOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all duration-200"
            >
              <PlusIcon className="w-5 h-5" />
              New Task
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="border-gray-300 hover:bg-gray-50 transition-all duration-200 p-3 rounded-xl">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsProjectEditOpen(true)} className="flex items-center gap-2">
                  <span>Éditer le projet</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600 flex items-center gap-2">
                  <span>Supprimer le projet</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Progress and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-sm">{tasks.length}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Tâches totales</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{tasks.length}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-emerald-700">Terminées</p>
            </div>
            <p className="text-3xl font-bold text-emerald-700">{tasks.filter(t => t.status === 'done').length}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-yellow-700">En cours</p>
            </div>
            <p className="text-3xl font-bold text-yellow-700">{tasks.filter(t => t.status === 'doing').length}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-semibold text-sm">!</span>
              </div>
              <p className="text-sm font-medium text-red-700">En retard</p>
            </div>
            <p className="text-3xl font-bold text-red-700">
              {tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length}
            </p>
          </div>
        </div>
      </div>
      
      {/* View Switcher */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Gestion des tâches</h2>
            <p className="text-gray-600">Organisez et suivez vos tâches</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={view === 'board' ? 'default' : 'outline'}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 transition-all duration-200 ${
                view === 'board' 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => setView('board')}
            >
              <FolderKanban className="w-4 h-4" /> 
              <span className="font-medium">Tableau</span>
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 transition-all duration-200 ${
                view === 'list' 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => setView('list')}
            >
              <List className="w-4 h-4" /> 
              <span className="font-medium">Liste</span>
            </Button>
          </div>
        </div>

        {view === 'list' && (
          <div className="w-full">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div className="col-span-5">Tâche</div>
                <div className="col-span-2">Statut</div>
                <div className="col-span-2">Assigné à</div>
                <div className="col-span-2">Date d'échéance</div>
                <div className="col-span-1">Actions</div>
              </div>
            
            {tasks.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune tâche trouvée</h3>
                <p className="text-gray-600 mb-6">Commencez par créer votre première tâche pour ce projet</p>
                <Button 
                  onClick={() => setOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Créer une tâche
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tasks.map((task) => (
                  <div key={task.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-all duration-200 cursor-pointer group" onClick={() => handleTaskClick(task)}>
                    <div className="col-span-5 flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-gray-500 line-clamp-1 mt-1">{task.description}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="col-span-2 flex items-center">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${STATUS_META[task.status]?.color}`}>
                        {STATUS_META[task.status]?.label}
                      </span>
                    </div>
                    
                    <div className="col-span-2 flex items-center">
                      {task.assignee_id ? (
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 text-sm font-medium">
                            {getAssigneeInitials(task.assignee_id)}
                          </div>
                          <span className="text-sm font-medium text-gray-700">{getAssigneeName(task.assignee_id)}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Non assigné</span>
                      )}
                    </div>
                    
                    <div className="col-span-2 flex items-center">
                      {task.due_date ? (
                        <div className="flex items-center gap-2">
                          <CalendarDaysIcon className={`w-4 h-4 ${isOverdue(task.due_date) ? 'text-red-500' : 'text-gray-400'}`} />
                          <span className={`text-sm font-medium ${isOverdue(task.due_date) ? 'text-red-600' : 'text-gray-700'}`}>
                            {formatDate(task.due_date)}
                            {isOverdue(task.due_date) && (
                              <span className="ml-1 text-xs text-red-500 font-normal">(en retard)</span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Pas de date d'échéance</span>
                      )}
                    </div>
                    
                    <div className="col-span-1 flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openEdit(task)} className="flex items-center gap-2">
                            <span>Éditer</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600 flex items-center gap-2"
                            onClick={() => setDeleteModal({ open: true, taskId: task.id })}
                          >
                            <span>Supprimer</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

        {view === 'board' && (
          <div className="w-full">
            {/* Filter Bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  className="border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg"
                >
                  Only My
                </Button>
              </div>
            </div>

            <DragDropContext
              onDragEnd={async (result: DropResult) => {
                const { destination, source, draggableId } = result;
                if (!destination) return;
                if (
                  destination.droppableId === source.droppableId &&
                  destination.index === source.index
                ) {
                  return;
                }
                const task = tasks.find((t) => t.id === draggableId);
                if (!task) return;
                if (task.status !== destination.droppableId) {
                  statusUpdateMutation.mutate({ 
                    taskId: task.id, 
                    status: destination.droppableId,
                    oldStatus: task.status
                  });
                }
              }}
            >
              <div className="flex gap-6 overflow-x-auto pb-4">
                {TASK_STATUSES.map((status) => (
                  <Droppable droppableId={status.value} key={status.value}>
                    {(provided) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 min-w-[320px] bg-gray-50 rounded-2xl shadow-sm"
                      >
                        <div className="sticky top-0 z-10 p-6 bg-white rounded-t-2xl flex items-center justify-between border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-gray-900 text-lg uppercase tracking-wide">{status.label}</h3>
                            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                              {tasks.filter(t => t.status === status.value).length}
                            </span>
                          </div>
                          <button 
                                                      onClick={() => {
                            openCreate(status.value);
                          }}
                            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all duration-200"
                            aria-label={`Ajouter une tâche à ${status.label}`}
                          >
                            <PlusIcon className="h-5 w-5" />
                          </button>
                        </div>
                      
                      <div className="p-6 space-y-4 min-h-[200px]">
                        {tasks
                          .filter(t => t.status === status.value)
                          .map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`${snapshot.isDragging ? 'shadow-2xl rotate-1 scale-105' : 'shadow-sm hover:shadow-md'} relative cursor-pointer group bg-white rounded-xl border border-gray-200 transition-all duration-300 ease-in-out animate-in fade-in-0 slide-in-from-bottom-2`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    transform: snapshot.isDragging
                                      ? `${provided.draggableProps.style?.transform} rotate(2deg)`
                                      : provided.draggableProps.style?.transform,
                                  }}
                                >
                                  {/* Drag Handle Area */}
                                  <div
                                    {...provided.dragHandleProps}
                                    className="absolute inset-0 z-10 rounded-xl"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTaskClick(task);
                                    }}
                                  />
                                  
                                  {/* Card Content */}
                                  <div className="p-4 space-y-3">
                                    {/* Title */}
                                    <h3 className="font-semibold text-gray-900 text-base leading-tight group-hover:text-blue-600 transition-colors">
                                      {task.title}
                                    </h3>

                                    {/* Description */}
                                    {task.description && (
                                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}


                                    {/* Task Metadata */}
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                      {/* Left side - Assignee */}
                                      <div className="flex items-center gap-2">
                                      {task.assignee_id ? (
                                          <div className="flex -space-x-1">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                                            {getAssigneeInitials(task.assignee_id)}
                                            </div>
                                        </div>
                                      ) : (
                                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                      )}
                                    </div>

                                      {/* Right side - Comments, Attachments, Date */}
                                      <div className="flex items-center gap-3 text-xs text-gray-500">

                                        {/* Due Date */}
                                        {task.due_date && (
                                    <div className="flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                            <span className={isOverdue(task.due_date) ? 'text-red-500 font-medium' : ''}>
                                          {formatDate(task.due_date)}
                                        </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Dropdown Menu */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger className="absolute top-3 right-3 z-20 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem onClick={() => openEdit(task)} className="flex items-center gap-2">
                                        <span>Éditer</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-red-600 flex items-center gap-2"
                                        onClick={() => setDeleteModal({ open: true, taskId: task.id })}
                                      >
                                        <span>Supprimer</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                            </Draggable>
                          ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        </div>
      )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="flex items-center gap-3">
          {/* More Options Button */}
          <Button
            variant="outline"
            size="icon"
            className="w-12 h-12 rounded-full border-gray-300 hover:bg-gray-50 shadow-lg"
          >
            <div className="flex flex-col gap-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
          </Button>
          
          {/* New Task Button */}
          <Button
            onClick={() => setOpen(true)}
            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
          >
            <PlusIcon className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Create/Edit Task Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-2xl shadow-xl max-w-lg">
          <DialogHeader className="space-y-4 pb-6">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {editing ? 'Mettre à jour la tâche' : 'New Task'}
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-base leading-relaxed">
              {editing ? 'Modifiez les détails de cette tâche' : 'Add a new task to this project'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={taskForm.handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Titre de la tâche</Label>
              <Input
                placeholder="Titre de la tâche"
                {...taskForm.getFieldProps('title')}
                required
                className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all duration-200 ${
                  taskForm.hasError('title') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {taskForm.hasError('title') && (
                <p className="text-sm text-red-600 mt-1">{taskForm.getError('title')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Description</Label>
              <Input
                placeholder="Description (optionnel)"
                {...taskForm.getFieldProps('description')}
                className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all duration-200 ${
                  taskForm.hasError('description') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {taskForm.hasError('description') && (
                <p className="text-sm text-red-600 mt-1">{taskForm.getError('description')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Statut</Label>
              <Select {...taskForm.getSelectProps('status')}>
                <SelectTrigger className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 ${
                  taskForm.hasError('status') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}>
                  <SelectValue placeholder="Sélectionnez un statut" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {taskForm.hasError('status') && (
                <p className="text-sm text-red-600 mt-1">{taskForm.getError('status')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Assigné à</Label>
              <Select 
                value={taskForm.values.assignee_id || "none"} 
                onValueChange={value => taskForm.setValue('assignee_id', value === "none" ? null : value)}
                disabled={taskForm.formState.isSubmitting}
              >
                <SelectTrigger className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 ${
                  taskForm.hasError('assignee_id') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}>
                  <SelectValue placeholder={loadingUsers ? 'Chargement des utilisateurs...' : 'Non assigné'} />
                </SelectTrigger>
                <SelectContent>
                  {loadingUsers ? (
                    <div className="px-4 py-2 text-gray-400">Chargement...</div>
                  ) : errorUsers ? (
                    <div className="px-4 py-2 text-red-400">Échec du chargement des utilisateurs</div>
                  ) : usersData.length === 0 ? (
                    <div className="px-4 py-2 text-gray-400">Aucun utilisateur trouvé</div>
                  ) : (
                    <>
                      <SelectItem value="none">Non assigné</SelectItem>
                      {usersData.map((u: { id: string; full_name: string }) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              {taskForm.hasError('assignee_id') && (
                <p className="text-sm text-red-600 mt-1">{taskForm.getError('assignee_id')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Priorité</Label>
              <Select {...taskForm.getSelectProps('priority')}>
                <SelectTrigger className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 ${
                  taskForm.hasError('priority') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}>
                  <SelectValue placeholder="Sélectionnez une priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                </SelectContent>
              </Select>
              {taskForm.hasError('priority') && (
                <p className="text-sm text-red-600 mt-1">{taskForm.getError('priority')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Date d'échéance</Label>
              <Input
                type="date"
                {...taskForm.getFieldProps('due_date')}
                className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all duration-200 ${
                  taskForm.hasError('due_date') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Date d'échéance"
              />
              {taskForm.hasError('due_date') && (
                <p className="text-sm text-red-600 mt-1">{taskForm.getError('due_date')}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setOpen(false);
                  taskForm.reset();
                }}
                disabled={taskForm.formState.isSubmitting}
                className="border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-medium py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </Button>
              <Button 
                type="submit"
                disabled={taskForm.formState.isSubmitting || taskForm.hasAnyError || mutation.isPending || updateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {(taskForm.formState.isSubmitting || mutation.isPending || updateMutation.isPending) && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {editing ? "Save" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteModal.open} onOpenChange={v => { if (!v) closeDelete(); }}>
        <DialogContent className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-gray-900">Supprimer la tâche</DialogTitle>
            <DialogDescription className="text-gray-600">
              Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action ne peut pas être annulée.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={closeDelete}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirmed}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200"
            >
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Project Edit Dialog */}
      <Dialog open={isProjectEditOpen} onOpenChange={setIsProjectEditOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-gray-900">Éditer le projet</DialogTitle>
            <DialogDescription className="text-gray-600">
              Modifiez les détails du projet
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
                  setIsProjectEditOpen(false);
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
                Enregistrer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Details Side Panel */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="max-w-md w-full p-6 bg-white border-l border-gray-200">
          <div className="mb-6">
            <div className="text-xs text-gray-400 mb-2">Projet / Kanban</div>
            <h2 className="text-2xl font-bold text-gray-900">{selectedTask?.title}</h2>
          </div>
          <div className="space-y-6">
            {/* Task Information Section */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="font-semibold text-gray-700 mb-3">Informations sur la tâche</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="text-gray-500">Description</div>
                <div className="text-gray-900">{selectedTask?.description || <span className="italic text-gray-400">Pas de description</span>}</div>
                <div className="text-gray-500">Statut</div>
                <div className="capitalize">{selectedTask?.status}</div>
                <div className="text-gray-500">Priorité</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(selectedTask?.priority)}`} />
                  <span className="capitalize">{selectedTask?.priority || 'Non définie'}</span>
                </div>
                <div className="text-gray-500">Assigné à</div>
                <div>{usersData.find((u: { id: string; full_name: string }) => u.id === selectedTask?.assignee_id)?.full_name || <span className="italic text-gray-400">Non assigné</span>}</div>
                <div className="text-gray-500">Date d'échéance</div>
                <div>{selectedTask?.due_date || <span className="italic text-gray-400">Pas de date d'échéance</span>}</div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => { setDrawerOpen(false); openEdit(selectedTask); }}
                className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                Éditer
              </Button>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => { setDrawerOpen(false); openDelete(selectedTask.id); }}
                className="bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
              >
                Supprimer
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setDrawerOpen(false)}
                className="hover:bg-gray-100 transition-all duration-200"
              >
                ✕
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
} 
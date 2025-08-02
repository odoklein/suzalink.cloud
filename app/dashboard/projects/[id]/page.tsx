"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Dialog as Drawer, DialogContent as DrawerContent, DialogHeader as DrawerHeader, DialogTitle as DrawerTitle, DialogDescription as DrawerDescription } from "@/components/ui/dialog";
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
import { CheckCircleIcon, FireIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PlusIcon, MoreHorizontal, CalendarDaysIcon, UserCircleIcon, FolderKanban, CalendarClock, List, Table, Filter, ArrowLeft } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

const TASK_STATUSES = [
  { value: "todo", label: "À faire" },
  { value: "doing", label: "En cours" },
  { value: "done", label: "Terminé" },
];

const STATUS_META: Record<string, any> = {
  todo: {
    label: 'À faire',
    icon: ClipboardIcon,
    color: 'bg-blue-100 text-blue-600 border-blue-200',
    border: 'border-l-4 border-blue-500',
  },
  doing: {
    label: 'En cours',
    icon: FireIcon,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    border: 'border-l-4 border-yellow-500',
  },
  done: {
    label: 'Terminé',
    icon: CheckCircleIcon,
    color: 'bg-green-100 text-green-700 border-green-200',
    border: 'border-l-4 border-green-500',
  },
};

// Color map for section/status
const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-blue-500 text-white',
  doing: 'bg-yellow-500 text-white',
  done: 'bg-green-500 text-white',
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
  const getAssigneeInitials = (assigneeId: string) => {
    const user = users.find((u: {id: string; full_name: string}) => u.id === assigneeId);
    if (!user?.full_name) return '?';
    return user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  };

  const getAssigneeName = (assigneeId: string) => {
    const user = users.find((u: {id: string; full_name: string}) => u.id === assigneeId);
    return user?.full_name || 'Inconnu';
  };

  const handleEdit = (task: any) => {
    setForm({
      id: task.id,
      title: task.title,
      description: task.description || '',
      due_date: task.due_date || '',
      status: task.status,
      priority: task.priority || 'medium',
      assignee_id: task.assignee_id || ''
    });
    setOpen(true);
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
  const [users, setUsers] = useState<Array<{
    id: string;
    full_name: string;
    email: string;
  }>>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: '',
    title: '',
    description: '',
    due_date: '',
    status: 'todo',
    priority: 'medium',
    assignee_id: ''
  });
  const [editing, setEditing] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, taskId: string | null }>({ open: false, taskId: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [view, setView] = useState<'board' | 'timeline' | 'list' | 'table' | 'filter'>('list');
  // Add state for filters
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterAssignee, setFilterAssignee] = useState<string>("");

  const [isProjectEditOpen, setIsProjectEditOpen] = useState(false);
  const [projectEditForm, setProjectEditForm] = useState({
    title: project?.title || '',
    description: project?.description || ''
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
      setUsers(data || []);
      return data || [];
    }
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error, data } = await supabase.from('tasks').insert(payload);
      if (error) throw new Error(error.message);
      return data?.[0];
    },
    onMutate: async (newTask: any) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', id] });
      const prevTasks = queryClient.getQueryData(['tasks', id]) || [];
      queryClient.setQueryData(['tasks', id], (old: any[] = []) => [...old, { ...newTask, id: Math.random().toString(36).slice(2) }]);
      return { prevTasks };
    },
    onError: (err: any, newTask: any, context: any) => {
      queryClient.setQueryData(['tasks', id], context.prevTasks);
      toast.error('Échec de la création de la tâche', { description: err.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    },
    onSuccess: () => {
      toast.success('Tâche créée avec succès');
      setOpen(false);
    }
  });

  useEffect(() => {
    if (!id) return;
    fetchProject();
    fetchTasks();
    // eslint-disable-next-line
  }, [id]);

  async function fetchProject() {
    const { data } = await supabase.from("projects").select("id, title, description").eq("id", id).single();
    setProject(data);
    setProjectEditForm({
      title: data?.title || '',
      description: data?.description || ''
    });
  }

  async function fetchTasks() {
    setLoading(true);
    console.log('Fetching tasks for project id:', id);
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, description, status, assignee_id, due_date")
      .eq("project_id", id)
      .order("created_at", { ascending: true });
    console.log('Fetched tasks:', data, 'Error:', error);
    
    // Validate task data and filter out any invalid entries
    const validTasks = (data || []).filter(task => {
      if (!task || !task.id || !task.title) {
        console.warn('Invalid task found:', task);
        return false;
      }
      const validStatus = TASK_STATUSES.find(s => s.value === task.status);
      if (!validStatus) {
        console.warn('Task has invalid status:', task.status, 'for task:', task.id, 'Valid statuses:', TASK_STATUSES.map(s => s.value));
        return false;
      }
      console.log('Task validated successfully:', task.id, 'status:', task.status);
      return true;
    });
    
    setTasks(validTasks);
    console.log('Updated tasks state:', validTasks);
    setLoading(false);
    if (error) toast.error("Échec de récupération des tâches", { description: error.message });
  }

  function openCreate(status: string) {
    setEditing(null);
    setForm({ id: '', title: '', description: '', due_date: '', status: 'todo', priority: 'medium', assignee_id: '' });
    setOpen(true);
  }

  function openEdit(task: any) {
    setEditing(task);
    setForm({ id: task.id, title: task.title, description: task.description, due_date: task.due_date, status: task.status, priority: task.priority || 'medium', assignee_id: task.assignee_id });
    setOpen(true);
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload: any = {
      id: form.id,
      title: form.title,
      description: form.description,
      due_date: form.due_date,
      status: form.status,
      priority: form.priority || 'medium',
      assignee_id: form.assignee_id || null,
      project_id: id
    };
    if (editing) {
      // (Keep edit logic as before)
      let error;
      ({ error } = await supabase.from('tasks').update(payload).eq('id', editing.id));
      if (error) {
        toast.error('Échec de la mise à jour de la tâche', { description: error.message });
      } else {
        toast.success('Tâche mise à jour avec succès');
      }
      setOpen(false);
      fetchTasks();
    } else {
      mutation.mutate(payload);
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
    const { error } = await supabase.from("tasks").delete().eq("id", deleteModal.taskId);
    if (error) {
      toast.error("Échec de la suppression de la tâche", { description: error.message });
    } else {
      toast.success("Tâche supprimée avec succès");
    }
    closeDelete();
    fetchTasks();
  }

  const handleProjectEdit = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(projectEditForm)
        .eq('id', id)
        .select();

      if (error) throw error;
      
      toast.success('Projet mis à jour avec succès');
      setIsProjectEditOpen(false);
      router.refresh();
    } catch (error) {
      toast.error('Échec de la mise à jour du projet', { 
        description: error instanceof Error ? error.message : 'Une erreur est survenue'
      });
    }
  };

  // Group tasks by status for sectioned list
  const groupedTasks = TASK_STATUSES.map(({ value, label }) => ({
    value,
    label,
    tasks: tasks.filter(t => t && t.status === value),
  }));

  // Filtered tasks for Filter view
  const filteredTasks = tasks.filter(task => {
    return (
      (!filterStatus || task.status === filterStatus) &&
      (!filterAssignee || task.assignee_id === filterAssignee)
    );
  });

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  if (!project) return <div className="text-gray-400 p-8">Projet non trouvé.</div>;

  return (
    <div className="space-y-6">
      {/* Back Button and Project Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>

      {/* Project Header */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project?.title || 'Chargement...'}</h1>
            <p className="text-gray-600 mt-2">{project?.description || 'Pas de description'}</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
            >
              <PlusIcon className="w-4 h-4" />
              Nouvelle tâche
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="border-gray-300 hover:bg-gray-50 transition-all duration-200">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsProjectEditOpen(true)}>Éditer le projet</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">Supprimer le projet</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Progress and Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Tâches totales</p>
            <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600 mb-1">Terminées</p>
            <p className="text-2xl font-bold text-green-700">{tasks.filter(t => t.status === 'done').length}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-600 mb-1">En cours</p>
            <p className="text-2xl font-bold text-yellow-700">{tasks.filter(t => t.status === 'doing').length}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600 mb-1">En retard</p>
            <p className="text-2xl font-bold text-red-700">
              {tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length}
            </p>
          </div>
        </div>
      </div>
      
      {/* View Switcher */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant={view === 'board' ? 'default' : 'outline'}
          className="flex items-center gap-2 rounded-lg px-4 py-2 transition-all duration-200"
          onClick={() => setView('board')}
        >
          <FolderKanban className="w-4 h-4" /> Tableau
        </Button>
        <Button
          variant={view === 'list' ? 'default' : 'outline'}
          className="flex items-center gap-2 rounded-lg px-4 py-2 transition-all duration-200"
          onClick={() => setView('list')}
        >
          <List className="w-4 h-4" /> Liste
        </Button>
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
              <div className="p-8 text-center text-gray-400">
                <div className="text-lg font-medium mb-2">Aucune tâche trouvée</div>
                <p className="text-sm">Commencez par créer votre première tâche</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tasks.map((task) => (
                  <div key={task.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleTaskClick(task)}>
                    <div className="col-span-5 flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                      <div>
                        <div className="font-medium text-gray-900">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-gray-500 line-clamp-1">{task.description}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="col-span-2 flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_META[task.status]?.color}`}>
                        {STATUS_META[task.status]?.label}
                      </span>
                    </div>
                    
                    <div className="col-span-2 flex items-center">
                      {task.assignee_id ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 text-xs font-medium">
                            {getAssigneeInitials(task.assignee_id)}
                          </div>
                          <span className="text-sm text-gray-700">{getAssigneeName(task.assignee_id)}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Non assigné</span>
                      )}
                    </div>
                    
                    <div className="col-span-2 flex items-center">
                      {task.due_date ? (
                        <span className={`text-sm ${isOverdue(task.due_date) ? 'text-red-600' : 'text-gray-700'}`}>
                          {formatDate(task.due_date)}
                          {isOverdue(task.due_date) && (
                            <span className="ml-1 text-xs text-red-500">(en retard)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">Pas de date d'échéance</span>
                      )}
                    </div>
                    
                    <div className="col-span-1 flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(task)}>Éditer</DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => setDeleteModal({ open: true, taskId: task.id })}
                          >
                            Supprimer
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
                await supabase
                  .from("tasks")
                  .update({ status: destination.droppableId })
                  .eq("id", task.id);
                fetchTasks();
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
                      className="flex-1 min-w-[320px] bg-gray-50 rounded-xl shadow-sm"
                    >
                      <div className={`sticky top-0 z-10 p-4 ${STATUS_META[status.value].border} bg-white rounded-t-xl flex items-center justify-between border-b border-gray-200`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${STATUS_META[status.value].color.replace('bg-', 'bg-').replace('text-', '')}`} />
                          <h3 className="font-semibold text-gray-900">{status.label}</h3>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full font-medium">
                            {tasks.filter(t => t.status === status.value).length}
                          </span>
                        </div>
                        <button 
                          onClick={() => {
                            setForm({ ...form, status: status.value });
                            setOpen(true);
                          }}
                          className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-all duration-200"
                          aria-label={`Ajouter une tâche à ${status.label}`}
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="p-4 space-y-3 min-h-[200px]">
                        {tasks
                          .filter(t => t.status === status.value)
                          .map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => handleTaskClick(task)}
                                  className={`${snapshot.isDragging ? 'shadow-lg rotate-1' : 'shadow-sm'} ${STATUS_META[task.status]?.border} bg-white rounded-lg transition-all cursor-pointer`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    transform: snapshot.isDragging 
                                      ? `${provided.draggableProps.style?.transform} rotate(2deg)`
                                      : provided.draggableProps.style?.transform
                                  }}
                                >
                                  <div className="p-4">
                                    <div className="flex justify-between items-start gap-2">
                                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger className="text-gray-400 hover:text-gray-600 transition-colors">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => handleEdit(task)}>
                                            Éditer
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            className="text-red-600"
                                            onClick={() => setDeleteModal({ open: true, taskId: task.id })}
                                          >
                                            Supprimer
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                    
                                    {task.description && (
                                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{task.description}</p>
                                    )}
                                    
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                                      <div className="flex items-center gap-2">
                                        {task.due_date && (
                                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded ${isOverdue(task.due_date) ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                            <CalendarDaysIcon className="h-3 w-3" />
                                            {formatDate(task.due_date)}
                                          </span>
                                        )}
                                        {task.assignee_id && (
                                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                            <UserCircleIcon className="h-3 w-3" />
                                            {getAssigneeName(task.assignee_id)}
                                          </span>
                                        )}
                                      </div>
                                      <span className={`px-2 py-1 rounded-full text-white ${STATUS_COLORS[task.status]}`}>
                                        {STATUS_META[task.status]?.label}
                                      </span>
                                    </div>
                                  </div>
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

      {/* Create/Edit Task Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {editing ? 'Mettre à jour la tâche' : 'Créer une tâche'}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {editing ? 'Modifiez les détails de cette tâche' : 'Ajoutez une nouvelle tâche au projet'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Titre de la tâche</Label>
              <Input
                placeholder="Titre de la tâche"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Description</Label>
              <Input
                placeholder="Description (optionnel)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Statut</Label>
              <Select value={form.status} onValueChange={value => setForm(f => ({ ...f, status: value }))}>
                <SelectTrigger className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="Sélectionnez un statut" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Assigné à</Label>
              <Select value={form.assignee_id || "none"} onValueChange={value => setForm(f => ({ ...f, assignee_id: value === "none" ? "" : value }))}>
                <SelectTrigger className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder={loadingUsers ? 'Chargement des utilisateurs...' : 'Non assigné'} />
                </SelectTrigger>
                <SelectContent>
                  {loadingUsers ? (
                    <div className="px-4 py-2 text-gray-400">Chargement...</div>
                  ) : errorUsers ? (
                    <div className="px-4 py-2 text-red-400">Échec du chargement des utilisateurs</div>
                  ) : users.length === 0 ? (
                    <div className="px-4 py-2 text-gray-400">Aucun utilisateur trouvé</div>
                  ) : (
                    <>
                      <SelectItem value="none">Non assigné</SelectItem>
                      {users.map((u: { id: string; full_name: string }) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Date d'échéance</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                placeholder="Date d'échéance"
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
          <form onSubmit={e => { e.preventDefault(); handleProjectEdit(); }} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Titre du projet</Label>
              <Input
                placeholder="Titre du projet"
                value={projectEditForm.title}
                onChange={e => setProjectEditForm(f => ({ ...f, title: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Description du projet</Label>
              <Input
                placeholder="Description du projet"
                value={projectEditForm.description}
                onChange={e => setProjectEditForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsProjectEditOpen(false)}
                className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                Annuler
              </Button>
              <Button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200"
              >
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
                <div className="text-gray-500">Assigné à</div>
                <div>{users.find((u: { id: string; full_name: string }) => u.id === selectedTask?.assignee_id)?.full_name || <span className="italic text-gray-400">Non assigné</span>}</div>
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
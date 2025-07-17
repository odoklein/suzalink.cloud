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
import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { FolderKanban, CalendarClock, List, Table, Filter } from 'lucide-react';

const TASK_STATUSES = [
  { value: "todo", label: "To Do" },
  { value: "doing", label: "In Progress" },
  { value: "done", label: "Done" },
];

const STATUS_META: Record<string, any> = {
  todo: {
    label: 'To Do',
    icon: ClipboardIcon,
    color: 'bg-blue-100 text-blue-600',
    border: 'border-blue-200',
  },
  doing: {
    label: 'In Progress',
    icon: FireIcon,
    color: 'bg-yellow-100 text-yellow-700',
    border: 'border-yellow-200',
  },
  done: {
    label: 'Done',
    icon: CheckCircleIcon,
    color: 'bg-green-100 text-green-700',
    border: 'border-green-200',
  },
};

// Color map for section/status
const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-blue-500 text-white',
  doing: 'bg-purple-500 text-white',
  done: 'bg-green-500 text-white',
};
const SECTION_BORDER_COLORS: Record<string, string> = {
  todo: 'border-l-4 border-blue-500',
  doing: 'border-l-4 border-purple-500',
  done: 'border-l-4 border-green-500',
};

export default function ProjectDetailPage() {
  const params = useParams();
const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
// Optionally, add a fallback or error if id is still empty
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo",
    assignee_id: "",
    due_date: ""
  });
  const [editing, setEditing] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, taskId: string | null }>({ open: false, taskId: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [view, setView] = useState<'board' | 'timeline' | 'list' | 'table' | 'filter'>('list');
  // Add state for filters
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterAssignee, setFilterAssignee] = useState<string>("");

  const {
    data: users = [],
    isLoading: loadingUsers,
    isError: errorUsers,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('id, full_name').order('full_name');
      if (error) throw new Error(error.message);
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
      await queryClient.cancelQueries(['tasks', id]);
      const prevTasks = queryClient.getQueryData(['tasks', id]) || [];
      queryClient.setQueryData(['tasks', id], (old: any[] = []) => [...old, { ...newTask, id: Math.random().toString(36).slice(2) }]);
      return { prevTasks };
    },
    onError: (err: any, newTask: any, context: any) => {
      queryClient.setQueryData(['tasks', id], context.prevTasks);
      toast.error('Failed to create task', { description: err.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries(['tasks', id]);
    },
    onSuccess: () => {
      toast.success('Task created successfully');
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
    if (error) toast.error("Failed to fetch tasks", { description: error.message });
  }

  function openCreate(status: string) {
    setEditing(null);
    setForm({ title: "", description: "", status, assignee_id: "", due_date: "" });
    setOpen(true);
  }

  function openEdit(task: any) {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      assignee_id: task.assignee_id || "",
      due_date: task.due_date || ""
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
      assignee_id: form.assignee_id || null,
      due_date: form.due_date || null,
      project_id: id
    };
    if (editing) {
      // (Keep edit logic as before)
      let error;
      ({ error } = await supabase.from('tasks').update(payload).eq('id', editing.id));
      if (error) {
        toast.error('Failed to update task', { description: error.message });
      } else {
        toast.success('Task updated successfully');
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
      toast.error("Failed to delete task", { description: error.message });
    } else {
      toast.success("Task deleted successfully");
    }
    closeDelete();
    fetchTasks();
  }

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

  if (!project) return <div className="text-gray-400 p-8">Project not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="w-full pt-8 px-6">
        {/* Back button */}
        <button onClick={() => router.push('/dashboard/projects')} className="mb-2 text-sm text-gray-500 hover:text-primary flex items-center gap-1 font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
          Back to Projects
        </button>
        {/* Project Details Card */}
        <div className="rounded-2xl shadow bg-white border border-gray-100 p-6 flex flex-col gap-3 w-full mt-8 mb-8 md:mt-10 md:mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">{project.title}</h2>
              <div className="text-gray-600 text-base">{project.description || <span className="italic text-gray-400">No description</span>}</div>
            </div>
            <div className="flex flex-wrap gap-3 items-center mt-2 md:mt-0">
              {/* Status Badge */}
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-semibold text-xs bg-purple-100 text-purple-700">
                <svg className="w-4 h-4 mr-1 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
                Active
              </span>
              {/* Created At (if available) */}
              {project.created_at && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 bg-gray-100">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              )}
              {/* Budget (if available) */}
              {project.budget && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-green-700 bg-green-100">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ${project.budget}
                </span>
              )}
              {/* Client (if available) */}
              {project.client?.name && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-blue-700 bg-blue-100">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
                  {project.client.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* View Switcher */}
      <div className="flex items-center gap-2 mb-6 px-8">
        <Button
          variant={view === 'board' ? 'default' : 'outline'}
          className="flex items-center gap-2 rounded-full px-4 py-2"
          onClick={() => setView('board')}
        >
          <FolderKanban className="w-4 h-4" /> Board
        </Button>
        <Button
          variant={view === 'list' ? 'default' : 'outline'}
          className="flex items-center gap-2 rounded-full px-4 py-2"
          onClick={() => setView('list')}
        >
          <List className="w-4 h-4" /> List
        </Button>
      </div>
      {view === 'list' && (
        <div className="w-full mt-8 px-6">
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-0 w-full">
            {groupedTasks.map((section, idx) => (
              <div key={section.value} className="mb-2">
                {/* Section Header */}
                <div className="flex items-center justify-between px-8 py-4 bg-gray-50 rounded-t-2xl border-b border-gray-100">
                  <div className="flex items-center gap-3 text-lg font-bold text-gray-800">
                    <span className={`inline-flex items-center justify-center rounded-full w-8 h-8 font-semibold ${STATUS_COLORS[section.value] || 'bg-gray-300 text-white'}`}>{section.label[0]}</span>
                    <span>{section.label}</span>
                    <span className={`ml-2 text-xs font-semibold rounded px-2 py-0.5 ${STATUS_COLORS[section.value] || 'bg-gray-300 text-white'}`}>{section.tasks.length}</span>
                  </div>
                  <Button size="sm" variant="outline" className="rounded font-semibold" onClick={() => openCreate(section.value)}>
                    + Add Task
                  </Button>
                </div>
                {/* Table Header */}
                <div className="grid grid-cols-6 gap-2 px-8 py-2 text-xs text-gray-500 font-semibold border-b border-gray-100 bg-white">
                  <div className="col-span-2">Name</div>
                  <div>Start Date</div>
                  <div>Due Date</div>
                  <div>Priority</div>
                  <div>People</div>
                </div>
                {/* Task Rows */}
                <div className="flex flex-col gap-0">
                  {loading ? (
                    <div className="text-gray-400 px-8 py-6 flex flex-col items-center">
                      <svg className="w-10 h-10 mb-2 text-gray-200 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="4"/></svg>
                      Loading tasks...
                    </div>
                  ) : section.tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-8 py-10 text-gray-400">
                      <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>
                      <div className="font-medium">No tasks in this section</div>
                      <div className="text-xs text-gray-300">Start by adding a new task.</div>
                    </div>
                  ) : (
                    section.tasks.map((task, idx) => (
                      <div
                        key={task.id}
                        className="group transition cursor-pointer bg-white hover:bg-gray-50 border-b border-gray-100 last:border-b-0 rounded-none grid grid-cols-6 items-center px-8 py-3"
                        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          setSelectedTask(task);
                          setDrawerOpen(true);
                        }}
                      >
                        {/* Name */}
                        <div className="flex items-center gap-2 col-span-2">
                          <span className="font-medium text-gray-800">{task.title}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[section.value] || 'bg-gray-300 text-white'}`}>{section.label}</span>
                        </div>
                        {/* Start Date (not in data, so leave blank or use created_at if available) */}
                        <div className="text-gray-600 text-sm">-</div>
                        {/* Due Date */}
                        <div className="text-gray-600 text-sm">{task.due_date || <span className="italic text-gray-300">No due</span>}</div>
                        {/* Priority (not in data, so show Normal) */}
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded bg-gray-200 text-xs text-gray-700">Normal</span>
                        </div>
                        {/* People */}
                        <div className="flex items-center gap-2">
                          {task.assignee_id && users.length > 0 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold">
                              {users.find(u => u.id === task.assignee_id)?.full_name?.[0] || '?'}
                            </span>
                          ) : (
                            <span className="italic text-gray-300">-</span>
                          )}
                          {/* Actions menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="ml-1 opacity-60 group-hover:opacity-100"><MoreHorizontal className="w-5 h-5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEdit(task); }}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); openDelete(task.id); }}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {view === 'board' && (
        <div className="w-full px-8">
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
            <div className="flex gap-6">
              {groupedTasks.map((section) => (
                <Droppable droppableId={section.value} key={section.value}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 min-w-[320px] bg-gray-50 rounded-xl p-4 border border-gray-200"
                    >
                      <div className={`flex items-center gap-2 mb-4 font-bold text-lg ${STATUS_COLORS[section.value]}`}>{section.label} <span className="ml-2 text-xs font-semibold rounded px-2 py-0.5 bg-white/30">{section.tasks.length}</span></div>
                      <div className="flex flex-col gap-4">
                        {section.tasks.length === 0 ? (
                          <div className="text-gray-300 italic">No tasks</div>
                        ) : (
                          section.tasks.map((task, idx) => (
                            <Draggable draggableId={task.id} index={idx} key={task.id}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 mb-2"
                                >
                                  <div className="font-medium text-gray-800">{task.title}</div>
                                  <div className="text-xs text-gray-500 mt-1">Due: {task.due_date || <span className="italic text-gray-300">No due</span>}</div>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
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
      {view === 'timeline' && (
        <div className="w-full px-8">
          <div className="bg-white rounded-2xl shadow border p-6">
            <div className="font-bold text-lg mb-4">Timeline</div>
            <div className="relative flex items-end gap-8 overflow-x-auto h-40">
              {/* Time axis */}
              <div className="absolute left-0 right-0 top-1/2 border-t border-gray-200 z-0" style={{height: 1}} />
              {/* Today marker */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-blue-400 z-10" style={{transform: 'translateX(-50%)'}} />
              {/* Tasks on timeline */}
              {tasks
                .filter(t => t.due_date)
                .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
                .map((task, idx) => {
                  // Calculate position: simple linear for demo (should use real date math for production)
                  const left = `${10 + idx * 120}px`;
                  return (
                    <div
                      key={task.id}
                      className={`absolute z-20`}
                      style={{ left, bottom: '40px' }}
                    >
                      <div className={`rounded-full px-4 py-2 font-medium text-white shadow ${STATUS_COLORS[task.status] || 'bg-gray-400'}`}>{task.title}</div>
                      <div className="text-xs text-gray-500 text-center mt-1">{task.due_date}</div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
      {view === 'table' && (
        <div className="w-full px-8">
          <div className="bg-white rounded-2xl shadow border p-0">
            <div className="grid grid-cols-6 gap-2 px-6 py-2 text-xs text-gray-500 font-medium border-b border-gray-100 bg-gray-50">
              <div className="col-span-2">Name</div>
              <div>Status</div>
              <div>Start Date</div>
              <div>Due Date</div>
              <div>Priority</div>
              <div>People</div>
            </div>
            <div className="flex flex-col gap-0">
              {tasks.length === 0 ? (
                <div className="text-gray-300 italic px-6 py-4">No tasks</div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="grid grid-cols-6 gap-2 px-6 py-3 border-b border-gray-100 items-center">
                    <div className="col-span-2 font-medium text-gray-800">{task.title}</div>
                    <div><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[task.status] || 'bg-gray-300 text-white'}`}>{TASK_STATUSES.find(s => s.value === task.status)?.label || task.status}</span></div>
                    <div>-</div>
                    <div>{task.due_date || <span className="italic text-gray-300">No due</span>}</div>
                    <div><span className="inline-block px-2 py-0.5 rounded bg-gray-200 text-xs text-gray-700">Normal</span></div>
                    <div>{task.assignee_id && users.length > 0 ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold">{users.find((u: { id: string; full_name: string }) => u.id === task.assignee_id)?.full_name?.[0] || '?'}</span>
                    ) : (
                      <span className="italic text-gray-300">-</span>
                    )}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {view === 'filter' && (
        <div className="w-full px-8 flex gap-8">
          <div className="bg-white rounded-2xl shadow border p-6 min-w-[260px]">
            <div className="font-bold text-lg mb-4">Filter Tasks</div>
            {/* Real filter options */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1">Status</label>
              <select className="w-full border rounded px-2 py-1" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All</option>
                {TASK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1">Assignee</label>
              <select className="w-full border rounded px-2 py-1" value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
                <option value="">All</option>
                {users.map((u: { id: string; full_name: string }) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            {/* Add more filters as needed */}
          </div>
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow border p-0">
              <div className="grid grid-cols-6 gap-2 px-6 py-2 text-xs text-gray-500 font-medium border-b border-gray-100 bg-gray-50">
                <div className="col-span-2">Name</div>
                <div>Status</div>
                <div>Start Date</div>
                <div>Due Date</div>
                <div>Priority</div>
                <div>People</div>
              </div>
              <div className="flex flex-col gap-0">
                {filteredTasks.length === 0 ? (
                  <div className="text-gray-300 italic px-6 py-4">No tasks</div>
                ) : (
                  filteredTasks.map((task) => (
                    <div key={task.id} className="grid grid-cols-6 gap-2 px-6 py-3 border-b border-gray-100 items-center">
                      <div className="col-span-2 font-medium text-gray-800">{task.title}</div>
                      <div><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[task.status] || 'bg-gray-300 text-white'}`}>{TASK_STATUSES.find(s => s.value === task.status)?.label || task.status}</span></div>
                      <div>-</div>
                      <div>{task.due_date || <span className="italic text-gray-300">No due</span>}</div>
                      <div><span className="inline-block px-2 py-0.5 rounded bg-gray-200 text-xs text-gray-700">Normal</span></div>
                      <div>{task.assignee_id && users.length > 0 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold">{users.find((u: { id: string; full_name: string }) => u.id === task.assignee_id)?.full_name?.[0] || '?'}</span>
                      ) : (
                        <span className="italic text-gray-300">-</span>
                      )}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Task" : "New Task"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the task details below." : "Create a new task by filling in the details below."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 px-2 py-2">
            <div className="mb-4">
              <Label className="mb-2 block">Task Title</Label>
              <Input
                placeholder="Task title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                className="rounded-lg"
              />
            </div>
            <div className="mb-4">
              <Label className="mb-2 block">Description</Label>
              <Input
                placeholder="Description (optional)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="rounded-lg"
              />
            </div>
            <div className="mb-4">
              <Label className="mb-2 block">Status</Label>
              <Select value={form.status} onValueChange={value => setForm(f => ({ ...f, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mb-4">
              <Label className="mb-2 block">Assignee</Label>
              <Select value={form.assignee_id || "none"} onValueChange={value => setForm(f => ({ ...f, assignee_id: value === "none" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingUsers ? 'Loading users...' : 'No assignee'} />
                </SelectTrigger>
                <SelectContent>
                  {loadingUsers ? (
                    <div className="px-4 py-2 text-gray-400">Loading...</div>
                  ) : errorUsers ? (
                    <div className="px-4 py-2 text-red-400">Failed to load users</div>
                  ) : users.length === 0 ? (
                    <div className="px-4 py-2 text-gray-400">No users found</div>
                  ) : (
                    <>
                      <SelectItem value="none">No assignee</SelectItem>
                      {users.map((u: { id: string; full_name: string }) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="mb-4">
              <Label className="mb-2 block">Due Date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="rounded-lg"
                placeholder="Due date"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editing ? "Save" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Delete confirmation modal */}
      <Dialog open={deleteModal.open} onOpenChange={v => { if (!v) closeDelete(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4"></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDelete}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirmed}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Side Peek Panel for Task Details */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="max-w-md w-full p-6 bg-white">
  {/* Visually hidden DialogTitle for accessibility */}
  <DialogTitle className="sr-only">Task Details</DialogTitle>
  <div className="mb-6">
    <div className="text-xs text-gray-400 mb-2">Project / Kanban</div>
    <h2 className="text-2xl font-bold">{selectedTask?.title}</h2>
  </div>
          <div className="space-y-6">
            {/* Task Information Section */}
            <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
              <div className="font-semibold text-gray-700 mb-2">Task Information</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="text-gray-500 text-sm">Description</div>
                <div className="text-gray-900">{selectedTask?.description || <span className="italic text-gray-400">No description</span>}</div>
                <div className="text-gray-500 text-sm">Status</div>
                <div className="capitalize">{selectedTask?.status}</div>
                <div className="text-gray-500 text-sm">Assignee</div>
                <div>{users.find((u: { id: string; full_name: string }) => u.id === selectedTask?.assignee_id)?.full_name || <span className="italic">No assignee</span>}</div>
                <div className="text-gray-500 text-sm">Due Date</div>
                <div>{selectedTask?.due_date || <span className="italic">No due date</span>}</div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setDrawerOpen(false); openEdit(selectedTask); }}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => { setDrawerOpen(false); openDelete(selectedTask.id); }}>Delete</Button>
              <Button size="icon" variant="ghost" onClick={() => setDrawerOpen(false)}>✕</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
} 
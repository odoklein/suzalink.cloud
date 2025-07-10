"use client";
import { useEffect, useState } from "react";
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

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
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

  useEffect(() => {
    if (!id) return;
    fetchProject();
    fetchTasks();
    fetchUsers();
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

  async function fetchUsers() {
    // Fetch users from the custom 'users' table, not auth.users
    const { data } = await supabase.from("users").select("id, full_name").order("full_name");
    setUsers(data || []);
    console.log('Fetched users for assignee dropdown:', data);
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
    let error;
    if (editing) {
      ({ error } = await supabase.from("tasks").update(payload).eq("id", editing.id));
      console.log('Update payload:', payload, 'Error:', error);

      if (error) {
        toast.error("Failed to update task", { description: error.message });
      } else {
        toast.success("Task updated successfully");
      }
    } else {
      ({ error } = await supabase.from("tasks").insert(payload));
      if (error) {
        toast.error("Failed to create task", { description: error.message });
      } else {
        toast.success("Task created successfully");
      }
    }
    setOpen(false);
    fetchTasks();
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

  if (!project) return <div className="text-gray-400 p-8">Project not found.</div>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" onClick={() => router.push("/dashboard/projects")}>Back</Button>
        <h2 className="text-2xl font-bold text-gray-800">{project.title}</h2>
        <span className="text-gray-500">{project.description}</span>
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
            await supabase
              .from("tasks")
              .update({ status: destination.droppableId })
              .eq("id", task.id);
            fetchTasks();
          }
        }}
      >
        <div className="flex gap-6 overflow-x-auto">
          {TASK_STATUSES.map(({ value, label }) => {
            const meta = STATUS_META[value];
            const Icon = meta.icon;
            return (
              <Droppable droppableId={value} key={value}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-w-[340px] bg-white rounded-2xl p-4 shadow-sm border ${meta.border} flex flex-col`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <span className={`inline-flex items-center justify-center rounded-full ${meta.color} w-8 h-8`}>
                          <Icon className="w-5 h-5" />
                        </span>
                        <span>{label}</span>
                      </div>
                      <Button size="icon" variant="ghost" className="rounded-full" onClick={() => openCreate(value)}>
                        +
                      </Button>
                    </div>
                    <div className="flex flex-col gap-4">
                      {loading ? (
                        <div className="text-gray-400">Loading...</div>
                      ) : tasks.filter(t => t && t.status === value).length === 0 ? (
                        <div className="text-gray-300 italic">No tasks</div>
                      ) : (
                        tasks.filter(t => t && t.status === value).map((task, idx) => {
                          try {
                            return (
                              <Draggable draggableId={task.id} index={idx} key={task.id}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={e => {
                                      // Prevent drawer open if Edit/Delete is clicked
                                      if ((e.target as HTMLElement).closest("button")) return;
                                      setSelectedTask(task);
                                      setDrawerOpen(true);
                                    }}
                                    style={{ cursor: "pointer" }}
                                  >
                                    <Card className="rounded-xl shadow group border border-gray-100 hover:shadow-md transition-shadow bg-gray-50">
                                      <CardHeader className="pb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-base text-gray-800">{task.title}</span>
                                          <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}>{meta.label}</span>
                                        </div>
                                      </CardHeader>
                                      <CardContent className="pt-0">
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                          {task.assignee_id && users.length > 0 ? (
                                            <span>👤 {users.find(u => u.id === task.assignee_id)?.full_name || "Unknown"}</span>
                                          ) : (
                                            <span className="italic">No assignee</span>
                                          )}
                                          {task.due_date && (
                                            <span className="ml-auto">📅 {task.due_date}</span>
                                          )}
                                        </div>
                                        <div className="text-gray-600 text-sm min-h-[32px] mb-2">
                                          {task.description || <span className="italic text-gray-300">No description</span>}
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                          <Button size="sm" variant="outline" className="rounded" onClick={e => { e.stopPropagation(); openEdit(task); }}>Edit</Button>
                                          <Button size="sm" variant="destructive" className="rounded" onClick={e => { e.stopPropagation(); openDelete(task.id); }}>Delete</Button>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                )}
                              </Draggable>
                            );
                          } catch (err) {
                            console.error('Error rendering task:', task, err);
                            return null;
                          }
                        })
                      )}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
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
                  <SelectValue placeholder="No assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No assignee</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
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
                <div>{users.find(u => u.id === selectedTask?.assignee_id)?.full_name || <span className="italic">No assignee</span>}</div>
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
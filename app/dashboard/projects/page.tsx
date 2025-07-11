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

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (!user) return;
    fetchProjects();
    fetchClients();
    fetchUsers();
    // eslint-disable-next-line
  }, [user, filterStatus, filterClient, sortBy, sortDir]);

  async function fetchProjects() {
    setLoading(true);
    let query = supabase
      .from("projects")
      .select(`
        id, title, description, status, start_date, end_date, budget, created_at,
        client:clients(name), client_id
      `);
    if (filterStatus && filterStatus !== "all") query = query.eq("status", filterStatus);
    if (filterClient && filterClient !== "all") query = query.eq("client_id", filterClient);
    query = query.order(sortBy, { ascending: sortDir === "asc" });
    const { data, error } = await query;
    setProjects(data || []);
    setLoading(false);
  }

  async function fetchClients() {
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .order("name");
    setClients(data || []);
  }

  async function fetchUsers() {
    const { data } = await supabase
      .from("users")
      .select("id, full_name")
      .order("full_name");
    setUsers(data || []);
  }

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
    fetchProjects();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete project", { description: error.message });
    } else {
      toast.success("Project deleted successfully");
    }
    fetchProjects();
  }

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
          Projects
          <span className="flex-1 border-t border-gray-200 ml-4" />
        </h2>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
              <ChevronDown className="w-4 h-4 ml-2" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Newest</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="px-2"
            onClick={() => setSortDir(d => (d === "asc" ? "desc" : "asc"))}
            title={`Sort ${sortDir === "asc" ? "Descending" : "Ascending"}`}
          >
            {sortDir === "asc" ? "↑" : "↓"}
          </Button>
          <Button onClick={openCreate} className="rounded-lg">+ New Project</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : projects.length === 0 ? (
          <Card
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50/60 hover:bg-purple-50 transition-all cursor-pointer min-h-[220px]"
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
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
              >
                <CardHeader>
                  <CardTitle>{project.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-gray-400 mb-1">
                    Status: <span className="capitalize">{project.status}</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-1">
                    Client: {project.client?.name || <span className="italic text-gray-300">No client</span>}
                  </div>
                  <div className="text-xs text-gray-400 mb-1">
                    Owner: {project.owner?.full_name || <span className="italic text-gray-300">No owner</span>}
                  </div>
                  <div className="text-xs text-gray-400 mb-1">
                    Dates: {project.start_date || "-"} to {project.end_date || "-"}
                  </div>
                  <div className="text-xs text-gray-400 mb-1">
                    Created: {project.created_at ? new Date(project.created_at).toLocaleDateString() : "-"}
                  </div>
                  <div className="text-gray-600 text-sm min-h-[32px] mb-2">{project.description || <span className="italic text-gray-300">No description</span>}</div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); openEdit(project); }}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); setDeleteModal({ open: true, projectId: project.id }); }}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Add Project Card */}
            <Card
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50/60 hover:bg-purple-50 transition-all cursor-pointer min-h-[220px]"
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Project" : "New Project"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the project details below." : "Create a new project by filling in the details below."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Project title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              className="rounded-lg"
            />
            <Input
              placeholder="Description (optional)"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="rounded-lg"
            />
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={value => setForm(f => ({ ...f, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Client</Label>
              <Select value={form.client_id || "none"} onValueChange={value => setForm(f => ({ ...f, client_id: value === "none" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
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
                placeholder="Start date"
              />
              <Input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="rounded-lg"
                placeholder="End date"
              />
            </div>
            <Input
              type="number"
              placeholder="Budget (optional)"
              value={form.budget}
              onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
              className="rounded-lg"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editing ? "Save" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal.open} onOpenChange={open => setDeleteModal(d => ({ ...d, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteModal({ open: false, projectId: null })}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (deleteModal.projectId) {
                await handleDelete(deleteModal.projectId);
              }
              setDeleteModal({ open: false, projectId: null });
            }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
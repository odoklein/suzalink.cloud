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
      sortDir
    ],
    queryFn: async () => {
      if (!user) return [];
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
      if (error) throw new Error(error.message);
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
        <div className="flex flex-wrap items-center gap-4 justify-between mb-4 px-2">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-[140px] bg-white border border-gray-200 rounded-lg shadow-sm">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
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
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] bg-white border border-gray-200 rounded-lg shadow-sm">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Newest</SelectItem>
                <SelectItem value="title">Title</SelectItem>
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
          <Button onClick={openCreate} className="rounded-lg font-medium shadow-sm">+ New Project</Button>
        </div>
        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {loadingProjects ? (
            <>
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="rounded-2xl p-4 bg-white border border-gray-100 flex flex-col min-h-[220px] justify-between shadow-sm">
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
                  className="group hover:shadow-lg transition-shadow cursor-pointer rounded-2xl p-4 bg-white border border-gray-100 flex flex-col min-h-[220px] justify-between shadow-sm"
                  onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  style={{ boxShadow: '0 2px 8px 0 rgba(16,30,54,0.04)' }}
                >
                  <div>
                    <CardHeader className="p-0 mb-2">
                      <CardTitle className="text-lg font-bold mb-1 leading-tight text-gray-900">{project.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="text-sm text-gray-500 mb-2 font-medium">
                        {project.description || <span className="italic text-gray-300">No description</span>}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        {/* Avatars (owner/team) */}
                        {project.owner?.full_name && (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-semibold text-gray-700 border border-gray-200">
                            {project.owner.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                          </span>
                        )}
                        {/* Add more avatars if you have a team array */}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-400 mb-2">
                        <span>Status: <span className="capitalize text-gray-600 font-medium">{project.status}</span></span>
                        <span>Client: {project.client?.name || <span className="italic text-gray-300">No client</span>}</span>
                        <span>Created: {project.created_at ? new Date(project.created_at).toLocaleDateString() : "-"}</span>
                      </div>
                    </CardContent>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{project.start_date ? `${project.start_date}` : "No start"}</span>
                    <div className="flex gap-2 items-center">
                      {/* Star icon for favorite (placeholder) */}
                      <span className="text-yellow-400 text-lg">★</span>
                      {/* More menu (placeholder) */}
                      <span className="text-gray-300 text-xl cursor-pointer">⋯</span>
                    </div>
                  </div>
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
"use client";
import { useEffect, useState } from "react";
import { useNextAuth } from "@/lib/nextauth-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Search, Filter, Edit, Trash2, Users, Building, Mail, MapPin, Calendar, BarChart3, Eye } from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ClientSidePanel from "@/components/ClientSidePanel";

interface Client {
  id: string;
  name: string;
  contact_email: string;
  company: string | null;
  status: 'active' | 'pending' | 'inactive';
  region: string | null;
  created_at: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200'
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[status as keyof typeof statusColors]}`}>
    {status === 'active' ? 'Actif' : 
     status === 'pending' ? 'En attente' : 
     status === 'inactive' ? 'Inactif' : status}
  </span>
);

export default function ClientsPage() {
  const { user } = useNextAuth();
  const queryClient = useQueryClient();
  
  // State management
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, clientId: string | null }>({ open: false, clientId: null });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    sortBy: "created_at",
    sortDir: "desc" as "asc" | "desc"
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Form state
  const [form, setForm] = useState({
    name: "",
    contact_email: "",
    company: "",
    status: "active" as "active" | "pending" | "inactive",
    region: ""
  });

  // Fetch clients with React Query
  const {
    data: clientsData,
    isLoading: loadingClients,
    isError: errorClients,
    refetch: refetchClients
  } = useQuery<{ clients: Client[], pagination: PaginationInfo }, Error>({
    queryKey: ["clients", filters, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
        ...(filters.status !== "all" && { status: filters.status }),
        ...(filters.search && { search: filters.search })
      });

      const response = await fetch(`/api/clients?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    },
    enabled: !!user
  });

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: async (clientData: Omit<Client, 'id' | 'created_at'>) => {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create client');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client créé avec succès");
      setOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, ...clientData }: Client) => {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update client');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client mis à jour avec succès");
      setOpen(false);
      setEditing(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete client');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client supprimé avec succès");
      setDeleteModal({ open: false, clientId: null });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Helper functions
  const resetForm = () => {
    setForm({
      name: "",
      contact_email: "",
      company: "",
      status: "active",
      region: ""
    });
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      name: client.name,
      contact_email: client.contact_email,
      company: client.company || "",
      status: client.status,
      region: client.region || ""
    });
    setOpen(true);
  };

  const openSidePanel = (client: Client) => {
    setSelectedClient(client);
    setSidePanelOpen(true);
  };

  const closeSidePanel = () => {
    setSidePanelOpen(false);
    setSelectedClient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim() || !form.contact_email.trim()) {
      toast.error("Le nom et l'email sont requis");
      return;
    }

    const clientData = {
      name: form.name.trim(),
      contact_email: form.contact_email.trim(),
      company: form.company.trim() || null,
      status: form.status,
      region: form.region.trim() || null
    };

    if (editing) {
      updateClientMutation.mutate({ ...editing, ...clientData });
    } else {
      createClientMutation.mutate(clientData);
    }
  };

  const handleDelete = (clientId: string) => {
    deleteClientMutation.mutate(clientId);
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const clients = clientsData?.clients || [];
  const pagination = clientsData?.pagination;

  if (loadingClients) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-gray-50 min-h-screen p-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Clients</h1>
            <p className="text-gray-600 text-lg">Gérez vos clients et leurs informations</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/clients/dashboard">
              <Button 
                variant="outline"
                className="px-4 py-2.5 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 rounded-xl"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Button>
            </Link>
            <Button 
              onClick={openCreate}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              New Client
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search clients by name, email, or company..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
          <div className="flex gap-3">
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger className="w-40 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.sortBy} onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}>
              <SelectTrigger className="w-40 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Clients Grid */}
      {clients.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">No clients found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {filters.search || filters.status !== "all" 
                ? "No clients match your search criteria. Try adjusting your filters."
                : "Get started by adding your first client to the system."
              }
            </p>
            {!filters.search && filters.status === "all" && (
              <Button 
                onClick={openCreate} 
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Client
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clients.map((client) => (
            <div 
              key={client.id} 
              className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
              onClick={() => openSidePanel(client)}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {client.name}
                    </h3>
                    <StatusBadge status={client.status} />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(client);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteModal({ open: true, clientId: client.id });
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{client.contact_email}</span>
                  </div>
                  {client.company && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{client.company}</span>
                    </div>
                  )}
                  {client.region && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{client.region}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Added {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSidePanel(client);
                      }}
                      className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Page {page} of {pagination.totalPages}
              </span>
              <span className="text-xs text-gray-400">
                ({pagination.total} total clients)
              </span>
            </div>
            <Button
              variant="outline"
              onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 rounded-xl border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg bg-white border border-gray-200 rounded-2xl shadow-xl">
          <DialogHeader className="space-y-3 pb-6">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {editing ? "Edit Client" : "New Client"}
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-base">
              {editing ? "Update the client information below." : "Add a new client to your database."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Client name"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm(prev => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="client@example.com"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company" className="text-sm font-medium text-gray-700">Company</Label>
                <Input
                  id="company"
                  value={form.company}
                  onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Company name"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region" className="text-sm font-medium text-gray-700">Region</Label>
                <Input
                  id="region"
                  value={form.region}
                  onChange={(e) => setForm(prev => ({ ...prev, region: e.target.value }))}
                  placeholder="Region or country"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-gray-700">Status</Label>
              <Select value={form.status} onValueChange={(value: "active" | "pending" | "inactive") => setForm(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border-gray-300 hover:bg-gray-50 py-3"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createClientMutation.isPending || updateClientMutation.isPending}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                {createClientMutation.isPending || updateClientMutation.isPending ? "Saving..." : (editing ? "Update Client" : "Create Client")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ open, clientId: null })}>
        <DialogContent className="sm:max-w-md bg-white border border-gray-200 rounded-2xl shadow-xl">
          <DialogHeader className="space-y-3 pb-6">
            <DialogTitle className="text-xl font-semibold text-gray-900">Delete Client</DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to delete this client? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false, clientId: null })}
              className="flex-1 rounded-xl border-gray-300 hover:bg-gray-50 py-3"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteModal.clientId && handleDelete(deleteModal.clientId)}
              disabled={deleteClientMutation.isPending}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              {deleteClientMutation.isPending ? "Deleting..." : "Delete Client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Side Panel */}
      <ClientSidePanel
        client={selectedClient}
        isOpen={sidePanelOpen}
        onClose={closeSidePanel}
      />
    </div>
  );
}

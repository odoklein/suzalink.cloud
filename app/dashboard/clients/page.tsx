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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clients</h1>
          <p className="text-gray-600">Gérez vos clients et leurs informations</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clients/dashboard">
            <Button 
              variant="outline"
              className="px-3 py-2.5 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Tableau de bord
            </Button>
          </Link>
          <Button 
            onClick={openCreate}
            className="px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouveau Client
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, email ou entreprise..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
          <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
            <SelectTrigger className="w-full sm:w-48 border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.sortBy} onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}>
            <SelectTrigger className="w-full sm:w-48 border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date de création</SelectItem>
              <SelectItem value="name">Nom</SelectItem>
              <SelectItem value="company">Entreprise</SelectItem>
              <SelectItem value="status">Statut</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Clients Grid */}
      {clients.length === 0 ? (
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <div className="text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun client trouvé</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.status !== "all" 
                ? "Aucun client ne correspond à vos critères de recherche."
                : "Commencez par ajouter votre premier client."
              }
            </p>
            {!filters.search && filters.status === "all" && (
              <Button onClick={openCreate} className="px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Ajouter un client
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card 
              key={client.id} 
              className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openSidePanel(client)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-1">{client.name}</CardTitle>
                    <StatusBadge status={client.status} />
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openSidePanel(client)}
                      className="p-1.5 bg-white rounded-full border border-gray-200 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-200"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{client.contact_email}</span>
                </div>
                {client.company && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building className="w-4 h-4" />
                    <span>{client.company}</span>
                  </div>
                )}
                {client.region && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{client.region}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>Ajouté le {new Date(client.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="px-3 py-2 rounded-lg border-gray-200 hover:bg-gray-50"
          >
            Précédent
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} sur {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
            disabled={page === pagination.totalPages}
            className="px-3 py-2 rounded-lg border-gray-200 hover:bg-gray-50"
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le client" : "Nouveau client"}</DialogTitle>
            <DialogDescription>
              {editing ? "Modifiez les informations du client." : "Ajoutez un nouveau client à votre base de données."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nom du client"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm(prev => ({ ...prev, contact_email: e.target.value }))}
                placeholder="email@exemple.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <Label htmlFor="company">Entreprise</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Nom de l'entreprise"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="region">Région</Label>
              <Input
                id="region"
                value={form.region}
                onChange={(e) => setForm(prev => ({ ...prev, region: e.target.value }))}
                placeholder="Région ou pays"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="status">Statut</Label>
              <Select value={form.status} onValueChange={(value: "active" | "pending" | "inactive") => setForm(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border-gray-200 hover:bg-gray-50"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createClientMutation.isPending || updateClientMutation.isPending}
                className="flex-1 px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {createClientMutation.isPending || updateClientMutation.isPending ? "Enregistrement..." : (editing ? "Mettre à jour" : "Créer")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ open, clientId: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false, clientId: null })}
              className="flex-1 rounded-lg border-gray-200 hover:bg-gray-50"
            >
              Annuler
            </Button>
            <Button
              onClick={() => deleteModal.clientId && handleDelete(deleteModal.clientId)}
              disabled={deleteClientMutation.isPending}
              className="flex-1 px-3 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {deleteClientMutation.isPending ? "Suppression..." : "Supprimer"}
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

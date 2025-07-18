"use client";

import React, { useState, useMemo } from "react";
import { useClientsQuery } from "./useClientsQuery";

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

interface Client {
  id: string;
  name: string;
  contact_email: string;
  company: string;
  status: 'active' | 'pending' | 'inactive';
  region?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  pending: 'bg-yellow-500',
  inactive: 'bg-red-500',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  pending: 'En attente',
  inactive: 'Inactif',
};

export default function ClientsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: "", contact_email: "", company: "", status: 'active', region: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading, error } = useClientsQuery({
    search: debouncedSearch,
    status: statusFilter,
    region: regionFilter,
    page,
    pageSize: PAGE_SIZE,
  });
  const clients = data?.data || [];
  const total = data?.count || 0;

  // Pagination helpers
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const router = useRouter();


  function openAddDialog() {
    setEditingClient(null);
    setForm({ name: "", contact_email: "", company: "", status: 'active', region: '' });
    setDialogOpen(true);
  }

  function openEditDialog(client: Client) {
    setEditingClient(client);
    setForm({
      name: client.name,
      contact_email: client.contact_email,
      company: client.company,
      status: client.status,
      region: client.region || '',
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingClient(null);
    setForm({ name: "", contact_email: "", company: "", status: 'active', region: '' });
  }

  function openDeleteDialog(id: string) {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    setDeleteId(null);
    setDeleteDialogOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = editingClient ? "PUT" : "POST";
      const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Échec de l'enregistrement du client");
      }
      closeDialog();
    } catch (e: any) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Échec de la suppression du client");
      closeDeleteDialog();
    } catch (e: any) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold">Clients</h1>
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <Input
            className="w-48"
            placeholder="Rechercher par nom..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            className="border rounded px-2 py-1 text-sm"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="pending">En attente</option>
            <option value="inactive">Inactif</option>
          </select>
          <Input
            className="w-32"
            placeholder="Région..."
            value={regionFilter}
            onChange={e => { setRegionFilter(e.target.value); setPage(1); }}
          />
          <Button onClick={openAddDialog}>Ajouter un client</Button>
        </div>
      </div>
      {error && <div className="mb-4 text-red-500">{typeof error === 'string' ? error : (error as Error)?.message || 'An error occurred.'}</div>}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-6 w-1/2 mb-4" /> {/* Name */}
                <Skeleton className="h-4 w-1/3 mb-2" /> {/* Email */}
                <Skeleton className="h-4 w-1/4 mb-2" /> {/* Company */}
                <Skeleton className="h-4 w-1/5" /> {/* Status */}
              </Card>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center text-gray-500 py-8">Aucun client trouvé.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client) => (
                <Card key={client.id} className="p-6 relative">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {client.name}
                    </CardTitle>
                    <span className={`ml-2 px-2 py-1 rounded text-xs text-white ${STATUS_COLORS[client.status]}`}>{STATUS_LABELS[client.status]}</span>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-sm text-gray-600">{client.company}</div>
                    <div className="text-sm text-gray-500">{client.contact_email}</div>
                    {client.region && <div className="text-xs text-gray-400">Région: {client.region}</div>}
                  </CardContent>
                  <CardFooter className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(client)}>Modifier</Button>
                    <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(client.id)}>Supprimer</Button>
                    <Link href={`/dashboard/clients/${client.id}/agenda`} className="ml-2 underline text-xs text-blue-600">Agenda</Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
            <div className="flex justify-center mt-8 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Précédent
              </Button>
              <span className="px-2 py-1 text-sm">Page {page} sur {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(total / PAGE_SIZE)}
                onClick={() => setPage(page + 1)}
              >
                Suivant
              </Button>
            </div>
          </>
        )}
      </div>
      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClient ? "Modifier le client" : "Ajouter un client"}</DialogTitle>
            <DialogDescription>
              {editingClient ? "Modifiez les informations du client." : "Saisissez les informations du nouveau client."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Nom</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Nom du client"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Email de contact</label>
              <Input
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                required
                placeholder="Email du contact"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Société</label>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Société"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Statut</label>
              <select
                className="border rounded px-2 py-1 w-full"
                value={form.status || 'active'}
                onChange={e => setForm({ ...form, status: e.target.value as Client['status'] })}
                required
              >
                <option value="active">Actif</option>
                <option value="pending">En attente</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Région</label>
              <Input
                value={form.region || ''}
                onChange={e => setForm({ ...form, region: e.target.value })}
                placeholder="Région"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>{submitting ? "Enregistrement..." : "Enregistrer"}</Button>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={closeDialog}>Annuler</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Delete Dialog unchanged */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le client</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Suppression..." : "Supprimer"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" onClick={closeDeleteDialog} disabled={submitting}>
                Annuler
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
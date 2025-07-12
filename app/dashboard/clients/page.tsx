"use client";

import React, { useEffect, useState } from "react";
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
  active: 'Active',
  pending: 'Pending',
  inactive: 'Inactive',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 12;

  const router = useRouter();

  // Fetch clients
  useEffect(() => {
    fetchClients();
  }, [search, statusFilter, regionFilter, page]);

  async function fetchClients() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append('name', search);
      if (statusFilter) params.append('status', statusFilter);
      if (regionFilter) params.append('region', regionFilter);
      params.append('limit', PAGE_SIZE.toString());
      params.append('offset', ((page - 1) * PAGE_SIZE).toString());
      const res = await fetch(`/api/clients?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch clients');
      const { data, count } = await res.json();
      setClients(data);
      setTotal(count || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

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
    setError(null);
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
        throw new Error(errData.error || "Failed to save client");
      }
      closeDialog();
      fetchClients();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete client");
      closeDeleteDialog();
      fetchClients();
    } catch (e: any) {
      setError(e.message);
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
            placeholder="Search by name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            className="border rounded px-2 py-1 text-sm"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
          <Input
            className="w-32"
            placeholder="Region..."
            value={regionFilter}
            onChange={e => { setRegionFilter(e.target.value); setPage(1); }}
          />
          <Button onClick={openAddDialog}>Add Client</Button>
        </div>
      </div>
      {error && <div className="mb-4 text-red-500">{error}</div>}
      <div>
        {loading ? (
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
          <div className="text-center text-gray-500 py-8">No clients found.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {clients.map((client) => (
                <Link key={client.id} href={`/dashboard/clients/${client.id}`} className="group" passHref legacyBehavior>
                  <Card
                    className="border-[1.5px] border-black/20 shadow-lg bg-white flex flex-col justify-between h-full cursor-pointer transition-all duration-200 group-hover:bg-purple-50 group-hover:shadow-xl"
                    tabIndex={0}
                    aria-label={`View details for ${client.name}`}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${STATUS_COLORS[client.status]}`}
                          title={STATUS_LABELS[client.status]}
                        ></span>
                        {client.name}
                      </CardTitle>
                      <div className="text-sm text-gray-500 font-normal">{client.company}</div>
                      {client.region && <div className="text-xs text-gray-400">{client.region}</div>}
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600 break-all">{client.contact_email}</div>
                    </CardContent>
                    <CardFooter className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                      <Button size="sm" variant="secondary" tabIndex={-1} onClick={e => { e.preventDefault(); router.push(`/dashboard/clients/${client.id}`); }}>Details</Button>
                      <Button size="sm" variant="outline" tabIndex={-1} onClick={e => { e.preventDefault(); openEditDialog(client); }}>Edit</Button>
                      <Button size="sm" variant="destructive" tabIndex={-1} onClick={e => { e.preventDefault(); openDeleteDialog(client.id); }}>Delete</Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
            {/* Pagination Controls */}
            <div className="flex justify-center mt-8 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="px-2 py-1 text-sm">Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(total / PAGE_SIZE)}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </div>
      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClient ? "Edit Client" : "Add Client"}</DialogTitle>
            <DialogDescription>
              {editingClient ? "Update client details." : "Enter new client information."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Client name"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Contact Email</label>
              <Input
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                required
                placeholder="Contact email"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Company</label>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Company"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Status</label>
              <select
                className="border rounded px-2 py-1 w-full"
                value={form.status || 'active'}
                onChange={e => setForm({ ...form, status: e.target.value as Client['status'] })}
                required
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Region</label>
              <Input
                value={form.region || ''}
                onChange={e => setForm({ ...form, region: e.target.value })}
                placeholder="Region"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Delete Dialog unchanged */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Deleting..." : "Delete"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" onClick={closeDeleteDialog} disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
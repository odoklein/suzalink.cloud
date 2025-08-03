"use client";

import React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNextAuth } from "@/lib/nextauth-context";
import { supabase } from "@/lib/supabase";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";

interface FinanceRecord {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category?: string;
  date: string;
  description: string;
  file_url?: string;
  created_at: string;
}

export default function FinancePage() {
  const { user } = useNextAuth();
  const queryClient = useQueryClient();
  
  if (!user) return null;
  
  const [tab, setTab] = useState<"income" | "expense">("income");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: "",
    title: "",
    amount: "",
    type: tab,
    category: "",
    date: "",
    description: "",
  });
  const [editing, setEditing] = useState<FinanceRecord | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch finance records with React Query
  const {
    data: records = [],
    isLoading: loadingRecords,
    error: recordsError,
    refetch: refetchRecords
  } = useQuery<FinanceRecord[]>({
    queryKey: ["finance", "records", user.id, tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", tab)
        .order("date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Create/Update record mutation
  const saveRecordMutation = useMutation({
    mutationFn: async (recordData: Partial<FinanceRecord>) => {
      const payload = {
        user_id: user.id,
        title: recordData.title,
        amount: parseFloat(recordData.amount?.toString() || "0"),
        type: recordData.type,
        category: recordData.category || null,
        date: recordData.date,
        description: recordData.description,
      };

      if (editing) {
        const { error } = await supabase.from("finance").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("finance").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "records", user.id] });
      setOpen(false);
      setFormLoading(false);
      setEditing(null);
      toast.success(editing ? "Record updated successfully" : "Record created successfully");
    },
    onError: (error: Error) => {
      setFormError(error.message);
      setFormLoading(false);
      toast.error(error.message);
    }
  });

  // Delete record mutation
  const deleteRecordMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const { error } = await supabase.from("finance").delete().eq("id", recordId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "records", user.id] });
      setDeleteId(null);
      setDeleteLoading(false);
      toast.success("Record deleted successfully");
    },
    onError: (error: Error) => {
      setDeleteLoading(false);
      toast.error(error.message);
    }
  });

  function openCreate() {
    setEditing(null);
    setForm({ id: "", title: "", amount: "", type: tab, category: "", date: "", description: "" });
    setOpen(true);
  }

  function openEdit(record: FinanceRecord) {
    setEditing(record);
    setForm({
      id: record.id,
      title: record.title,
      amount: record.amount.toString(),
      type: record.type,
      category: record.category || "",
      date: record.date ? record.date.slice(0, 10) : "",
      description: record.description,
    });
    setOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    
    // Convert form data to match FinanceRecord interface
    const recordData: Partial<FinanceRecord> = {
      ...form,
      amount: parseFloat(form.amount) || 0,
      category: form.category || undefined
    };
    
    saveRecordMutation.mutate(recordData);
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    deleteRecordMutation.mutate(id);
  }

  // Prepare chart data: group by date, sum amounts
  const chartData = React.useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach((rec) => {
      const date = new Date(rec.date).toLocaleDateString();
      map[date] = (map[date] || 0) + rec.amount;
    });
    return Object.entries(map).map(([date, amount]) => ({ date, amount }));
  }, [records]);

  if (loadingRecords) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (recordsError) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg font-medium">Error loading records</div>
          <p className="text-gray-500 mt-2">Unable to load finance records</p>
          <Button onClick={() => refetchRecords()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vue d'ensemble financière</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary cards: total income, total expenses, balance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-green-50">
              <CardHeader>
                <CardTitle>Total des revenus</CardTitle>
              </CardHeader>
              <CardContent>$0.00</CardContent>
            </Card>
            <Card className="bg-red-50">
              <CardHeader>
                <CardTitle>Total des dépenses</CardTitle>
              </CardHeader>
              <CardContent>$0.00</CardContent>
            </Card>
            <Card className="bg-blue-50">
              <CardHeader>
                <CardTitle>Solde</CardTitle>
              </CardHeader>
              <CardContent>$0.00</CardContent>
            </Card>
          </div>

          {/* Tabs for Income/Expenses */}
          <Tabs value={tab} onValueChange={v => setTab(v as "income" | "expense")} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="income">Revenus</TabsTrigger>
              <TabsTrigger value="expense">Dépenses</TabsTrigger>
            </TabsList>
            <TabsContent value="income">
              <div className="mb-4">
                {records.length === 0 ? (
                  <div className="text-gray-400">Aucun revenu trouvé.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((rec) => (
                        <TableRow key={rec.id}>
                          <TableCell>{rec.title}</TableCell>
                          <TableCell>${rec.amount.toFixed(2)}</TableCell>
                          <TableCell>{rec.category || "-"}</TableCell>
                          <TableCell>{new Date(rec.date).toLocaleDateString()}</TableCell>
                          <TableCell>{rec.description}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => openEdit(rec)}>Edit</Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="ml-2">Delete</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Record</AlertDialogTitle>
                                </AlertDialogHeader>
                                <div>Are you sure you want to delete this record?</div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(rec.id)} disabled={deleteLoading} className="bg-red-600 text-white">
                                    {deleteLoading ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              {/* Chart for income */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            <TabsContent value="expense">
              <div className="mb-4">
                {records.length === 0 ? (
                  <div className="text-gray-400">Aucune dépense trouvée.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((rec) => (
                        <TableRow key={rec.id}>
                          <TableCell>{rec.title}</TableCell>
                          <TableCell>${rec.amount.toFixed(2)}</TableCell>
                          <TableCell>{rec.category || "-"}</TableCell>
                          <TableCell>{new Date(rec.date).toLocaleDateString()}</TableCell>
                          <TableCell>{rec.description}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => openEdit(rec)}>Edit</Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="ml-2">Delete</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Record</AlertDialogTitle>
                                </AlertDialogHeader>
                                <div>Are you sure you want to delete this record?</div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(rec.id)} disabled={deleteLoading} className="bg-red-600 text-white">
                                    {deleteLoading ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              {/* Chart for expenses */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end mb-4">
            <Button onClick={openCreate} className="bg-purple-600 text-white">+ Ajouter {tab === "income" ? "un revenu" : "une dépense"}</Button>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? `Modifier ${form.type === "income" ? "un revenu" : "une dépense"}` : `Ajouter ${tab === "income" ? "un revenu" : "une dépense"}`}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium">Titre</label>
                    <Input
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      required
                      placeholder="ex : Paiement client"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Montant</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      required
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Type</label>
                    <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as "income" | "expense" }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Revenu</SelectItem>
                        <SelectItem value="expense">Dépense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Catégorie</label>
                    <Input
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      placeholder="ex : Salaire, Bureau, Freelance"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Date</label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-1 font-medium">Description</label>
                    <Input
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Description"
                      required
                    />
                  </div>
                </div>
                {formError && <div className="text-red-500 text-sm">{formError}</div>}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading ? (editing ? "Enregistrement…" : "Ajout…") : (editing ? "Enregistrer" : "Ajouter")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
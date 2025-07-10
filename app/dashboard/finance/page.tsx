"use client";

import React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

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
  const { user } = useAuth();
  if (!user) return null;
  const [tab, setTab] = useState<"income" | "expense">("income");
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    setLoading(true);
    supabase
      .from("finance")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", tab)
      .order("date", { ascending: false })
      .then(({ data }) => {
        setRecords(data || []);
        setLoading(false);
      });
  }, [user, tab]);

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
    if (!user) return;
    const payload = {
      user_id: user.id,
      title: form.title,
      amount: parseFloat(form.amount),
      type: form.type,
      category: form.category || null,
      date: form.date,
      description: form.description,
    };
    let result;
    if (editing) {
      result = await supabase.from("finance").update(payload).eq("id", editing.id);
    } else {
      result = await supabase.from("finance").insert(payload);
    }
    if (result.error) {
      setFormError(result.error.message);
      setFormLoading(false);
      return;
    }
    setOpen(false);
    setFormLoading(false);
    setEditing(null);
    // Refresh records
    setLoading(true);
    supabase
      .from("finance")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", tab)
      .order("date", { ascending: false })
      .then(({ data }) => {
        setRecords(data || []);
        setLoading(false);
      });
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    await supabase.from("finance").delete().eq("id", id);
    setDeleteId(null);
    // Refresh records
    setLoading(true);
    supabase
      .from("finance")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", tab)
      .order("date", { ascending: false })
      .then(({ data }) => {
        setRecords(data || []);
        setLoading(false);
      });
    setDeleteLoading(false);
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

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Finance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary cards: total income, total expenses, balance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-green-50">
              <CardHeader>
                <CardTitle>Total Income</CardTitle>
              </CardHeader>
              <CardContent>$0.00</CardContent>
            </Card>
            <Card className="bg-red-50">
              <CardHeader>
                <CardTitle>Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>$0.00</CardContent>
            </Card>
            <Card className="bg-blue-50">
              <CardHeader>
                <CardTitle>Balance</CardTitle>
              </CardHeader>
              <CardContent>$0.00</CardContent>
            </Card>
          </div>

          {/* Tabs for Income/Expenses */}
          <Tabs value={tab} onValueChange={v => setTab(v as "income" | "expense")} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="expense">Expenses</TabsTrigger>
            </TabsList>
            <TabsContent value="income">
              <div className="mb-4">
                {loading ? (
                  <div className="text-gray-400">Loading...</div>
                ) : records.length === 0 ? (
                  <div className="text-gray-400">No income records found.</div>
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
                {loading ? (
                  <div className="text-gray-400">Loading...</div>
                ) : records.length === 0 ? (
                  <div className="text-gray-400">No expense records found.</div>
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
            <Button onClick={openCreate} className="bg-purple-600 text-white">+ Add {tab === "income" ? "Income" : "Expense"}</Button>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? `Edit ${form.type === "income" ? "Income" : "Expense"}` : `Add ${tab === "income" ? "Income" : "Expense"}`}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium">Title</label>
                    <Input
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      required
                      placeholder="e.g. Client Payment"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Amount</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Type</label>
                    <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as "income" | "expense" }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Category</label>
                    <Input
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      placeholder="e.g. Salary, Office, Freelance"
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
                    Cancel
                  </Button>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading ? (editing ? "Saving..." : "Adding...") : (editing ? "Save" : "Add")}
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
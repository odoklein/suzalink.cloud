"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProspectsFoldersPage() {
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editFolder, setEditFolder] = useState<any | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "" });
  const [formLoading, setFormLoading] = useState(false);

  async function fetchFolders() {
    setLoading(true);
    const { data, error } = await supabase
      .from("prospect_projects")
      .select("id, title, description, created_at");
    if (error) {
      setError(error.message);
      setFolders([]);
    } else {
      setFolders(data || []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchFolders(); }, []);

  const handleOpenModal = (folder?: any) => {
    setEditFolder(folder || null);
    setForm(folder ? { title: folder.title, description: folder.description || "" } : { title: "", description: "" });
    setModalOpen(true);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setFormLoading(true);
    if (editFolder) {
      await supabase.from("prospect_projects").update({ title: form.title, description: form.description }).eq("id", editFolder.id);
    } else {
      await supabase.from("prospect_projects").insert([{ title: form.title, description: form.description }]);
    }
    setModalOpen(false);
    setEditFolder(null);
    setForm({ title: "", description: "" });
    setFormLoading(false);
    fetchFolders();
  };

  const handleDelete = async () => {
    if (!deleteFolderId) return;
    await supabase.from("prospect_projects").delete().eq("id", deleteFolderId);
    setDeleteFolderId(null);
    fetchFolders();
  };

  return (
    <div className="p-6 md:p-10 bg-muted min-h-screen">
      <div className="flex items-center mb-8">
        <h1 className="text-3xl font-bold flex-1">Prospect Folders</h1>
        <Button onClick={() => handleOpenModal()}>+ New Folder</Button>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-1/2 mb-4" /> {/* Title */}
              <Skeleton className="h-4 w-2/3 mb-2" /> {/* Description */}
              <Skeleton className="h-4 w-1/3" /> {/* Date */}
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {folders.map(folder => (
            <Card key={folder.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
              <Link href={`/dashboard/prospects/${folder.id}`} className="block">
                <CardHeader>
                  <CardTitle className="text-lg">{folder.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{folder.description || "No description provided"}</p>
                  <p className="text-sm text-gray-500">Created: {new Date(folder.created_at).toLocaleDateString()}</p>
                </CardContent>
              </Link>
              <div className="flex gap-2 p-4 pt-0">
                <Button size="sm" variant="outline" onClick={() => handleOpenModal(folder)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteFolderId(folder.id)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editFolder ? "Edit Folder" : "New Folder"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              placeholder="Folder name"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
            />
            <Input
              placeholder="Description (optional)"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Save"}</Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteFolderId} onOpenChange={open => { if (!open) setDeleteFolderId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
          </AlertDialogHeader>
          <div>Are you sure you want to delete this folder?</div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteFolderId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// import { useSession } from "@/hooks/useSession"; // Removed, use Supabase Auth directly
import { supabase } from "@/lib/supabase";

export function ProspectsFoldersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string|null>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    async function getUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error) setError(error.message);
      setUser(data?.user || null);
    }
    getUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchFolders();
  }, [user]);

  async function fetchFolders() {
    setLoading(true);
    const { data, error } = await supabase
      .from("prospect_folders")
      .select("id, name, created_at, updated_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    setFolders(data || []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    const { error } = await supabase.from("prospect_folders").insert({ name: newName, owner_id: user.id });
    if (error) setError(error.message);
    setNewName("");
    setOpen(false);
    fetchFolders();
  }

  async function handleRename(id: string) {
    if (!newName.trim()) return;
    const { error } = await supabase.from("prospect_folders").update({ name: newName }).eq("id", id);
    if (error) setError(error.message);
    setNewName("");
    setRenamingId(null);
    fetchFolders();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("prospect_folders").delete().eq("id", id);
    if (error) setError(error.message);
    setDeleteId(null);
    fetchFolders();
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Prospect Folders</h1>
        <Button onClick={() => { setOpen(true); setNewName(""); }}>New Folder</Button>
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div>Loading...</div>
        ) : folders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">No folders yet.</CardContent>
          </Card>
        ) : folders.map(folder => (
          <Card key={folder.id}>
            <CardHeader>
              <CardTitle>{folder.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Created: {new Date(folder.created_at).toLocaleString()}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setRenamingId(folder.id); setNewName(folder.name); }}>Rename</Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteId(folder.id)}>Delete</Button>
                  <Button size="sm" onClick={() => router.push(`/dashboard/prospects/folders/${folder.id}`)}>Open</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Create Folder Dialog */}
      <Dialog open={open} onOpenChange={v => { setOpen(v); setNewName(""); setError(null); }}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>New Folder</DialogTitle>
    </DialogHeader>
    <form
      onSubmit={e => {
        e.preventDefault();
        if (!newName.trim()) return;
        handleCreate();
      }}
    >
      <Input
        placeholder="Folder name"
        value={newName}
        onChange={e => setNewName(e.target.value)}
        autoFocus
        disabled={loading}
        onKeyDown={e => {
          if (e.key === "Enter" && newName.trim()) {
            e.preventDefault();
            handleCreate();
          }
        }}
      />
      {error && <div className="text-red-500 mt-2">{error}</div>}
      <DialogFooter>
        <Button type="submit" disabled={!newName.trim() || loading}>
          {loading ? "Creating..." : "Create"}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
      {/* Rename Folder Dialog */}
      <Dialog open={!!renamingId} onOpenChange={v => { if (!v) setRenamingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <Input placeholder="Folder name" value={newName} onChange={e => setNewName(e.target.value)} />
          <DialogFooter>
            <Button onClick={() => renamingId && handleRename(renamingId)}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to delete this folder? This cannot be undone.</div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

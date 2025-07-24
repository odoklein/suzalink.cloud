"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface Folder {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
  lists_count?: number;
}

export default function ProspectsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);
const [createError, setCreateError] = useState<string>("");

  useEffect(() => {
    const fetchFolders = async () => {
      setLoading(true);

      // Fetch folders and count lists per folder
      const { data, error } = await supabase
        .from("folders")
        .select("id, name, created_at, user_id, lists(count)")
                .order("created_at", { ascending: false });
      if (error) {
        setFolders([]);
      } else {
        setFolders(
          data.map((folder: any) => ({
            ...folder,
            lists_count: folder.lists?.length ?? 0,
          }))
        );
      }
      setLoading(false);
    };
    fetchFolders();
    // eslint-disable-next-line
  }, []);

  const handleCreateFolder = async () => {
  setCreateError("");
  if (!newFolderName.trim()) return;
  setCreating(true);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user ? user.id : null;
  const { data, error } = await supabase
    .from("folders")
    .insert({ name: newFolderName.trim(), user_id: userId })
    .select()
    .single();
  setCreating(false);
  if (!error && data) {
    setFolders((prev) => [
      { ...data, lists_count: 0 },
      ...prev,
    ]);
    setOpen(false);
    setNewFolderName("");
  } else if (error) {
    setCreateError(error.message || "Failed to create folder.");
  }
};

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Prospect Folders</h2>
        <Button onClick={() => setOpen(true)}>+ New Folder</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading ? (
          <div>Loading...</div>
        ) : folders.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground">No folders yet.</div>
        ) : (
          folders.map((folder) => (
            <Card
              key={folder.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/dashboard/prospects/${folder.id}`)}
            >
              <CardHeader>
                <CardTitle>{folder.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-2">
                  Created {format(new Date(folder.created_at), "PPP")}
                </div>
                <div className="text-xs">{folder.lists_count ?? 0} lists</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            disabled={creating}
            maxLength={50}
            className="mb-4"
          />
          <DialogFooter>
  <div className="text-red-500 text-sm mb-2 min-h-[20px]">{createError}</div>
  <Button
    onClick={handleCreateFolder}
    disabled={creating || !newFolderName.trim()}
  >
    {creating ? "Creating..." : "Create"}
  </Button>
</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

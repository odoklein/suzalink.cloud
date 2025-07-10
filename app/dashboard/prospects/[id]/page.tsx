"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function ProspectionFilesPage() {
  const params = useParams();
  const folderId = params.id as string;
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "" });
  const [formLoading, setFormLoading] = useState(false);

  async function fetchFiles() {
    setLoading(true);
    const { data, error } = await supabase
      .from("prospection_lists")
      .select("id, name, created_at")
      .eq("project_id", folderId);
    if (error) {
      setError(error.message);
      setFiles([]);
    } else {
      setFiles(data || []);
    }
    setLoading(false);
  }

  useEffect(() => { if (folderId) fetchFiles(); }, [folderId]);

  const handleSave = async (e: any) => {
    e.preventDefault();
    setFormLoading(true);
    await supabase.from("prospection_lists").insert([{ name: form.name, project_id: folderId }]);
    setModalOpen(false);
    setForm({ name: "" });
    setFormLoading(false);
    fetchFiles();
  };

  return (
    <div className="p-6 md:p-10 bg-muted min-h-screen">
      <div className="flex items-center mb-8">
        <h1 className="text-3xl font-bold flex-1">Prospection Files</h1>
        <Button onClick={() => setModalOpen(true)}>+ New List</Button>
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : error ? (
        <div className="p-8 text-center text-red-500">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map(file => (
            <Link key={file.id} href={`/dashboard/prospects/${folderId}/${file.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{file.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">Created: {new Date(file.created_at).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New List</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              placeholder="List name"
              value={form.name}
              onChange={e => setForm({ name: e.target.value })}
              required
            />
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={formLoading}>{formLoading ? "Saving..." : "Save"}</Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
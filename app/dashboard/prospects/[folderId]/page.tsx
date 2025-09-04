"use client";
import React, { useState } from "react";
import Papa from "papaparse";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Plus, Upload, FileText, Calendar, Users, Download, Trash2, Edit, Eye, UserCheck, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import ClientAssignmentModal from "@/components/ClientAssignmentModal";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNextAuth } from "@/lib/nextauth-context";

interface List {
  id: string;
  name: string;
  folder_id: string;
  created_at: string;
  csv_url: string;
  columns: string[];
  client_id?: string | null;
  client?: {
    id: string;
    name: string;
    company: string | null;
    status: string;
  }[] | null;
}

export default function FolderListsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { user } = useNextAuth();
  const queryClient = useQueryClient();
  
  if (!params?.folderId) {
    return <div>Folder ID is required</div>;
  }
  
  const folderId = params.folderId as string;
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[][]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [listName, setListName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [columnError, setColumnError] = useState<string>("");
  
  // Client assignment modal state
  const [assignmentModal, setAssignmentModal] = useState<{
    open: boolean;
    type: 'folder' | 'list';
    itemId: string;
    itemName: string;
    currentClientId?: string | null;
  }>({
    open: false,
    type: 'list',
    itemId: '',
    itemName: '',
    currentClientId: null
  });

  // Fetch folder data with React Query
  const {
    data: folderData,
    isLoading: loadingFolder,
    error: folderError
  } = useQuery<{ folderName: string; lists: List[] }>({
    queryKey: ["prospects", "folder", folderId, user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const res = await fetch(`/api/prospects/folders/${folderId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load folder');
      }
      const { folder, lists } = await res.json();
      return { folderName: folder?.name ?? 'Folder', lists: lists ?? [] };
    },
    enabled: !!user && !!folderId
  });

  // Create list mutation (uses server APIs to bypass RLS)
  const createListMutation = useMutation({
    mutationFn: async ({ listName, file, selectedColumns }: {
      listName: string;
      file: File;
      selectedColumns: string[];
    }) => {
      if (!user) throw new Error("User not authenticated");

      // 1) Upload CSV to storage (client-side is fine)
      const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9._-]+/g, '_');
      const filePath = `${folderId}/${Date.now()}_${sanitize(file.name)}`;
      const { error: storageError } = await supabase.storage
        .from("attachements")
        .upload(filePath, file, { contentType: "text/csv", upsert: true });
      if (storageError) throw storageError;

      // 2) Get public URL
      const { data: urlData } = supabase.storage.from("attachements").getPublicUrl(filePath);

      // 3) Create list via API (service role)
      const createRes = await fetch('/api/prospects/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: listName.trim(),
          folder_id: folderId,
          user_id: user.id,
          csv_url: urlData.publicUrl,
          columns: selectedColumns,
        })
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create list');
      }
      const { list: listData } = await createRes.json();

      // 4) Parse CSV locally
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (parsed.errors && parsed.errors.length > 0) {
        throw new Error('CSV parsing failed. Check your file format.');
      }
      const rows = parsed.data as Record<string, any>[];

      // 5) Import rows via API (service role)
      const importRes = await fetch(`/api/lists/${listData.id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns: selectedColumns, prospects: rows })
      });
      if (!importRes.ok) {
        const err = await importRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to import prospects');
      }

      return listData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects", "folder", folderId] });
      setOpen(false);
      setFile(null);
      setCsvPreview([]);
      setCsvColumns([]);
      setSelectedColumns([]);
      setListName("");
      toast.success("Liste créée avec succès");
    },
    onError: (error: Error) => {
      setUploadError(error.message);
      toast.error(error.message);
    }
  });

  // CSV parsing (client-side, simple, for preview)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setCsvPreview([]);
    setCsvColumns([]);
    setSelectedColumns([]);
    if (f) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const rows = text.split(/\r?\n/).filter(Boolean).map((r) => r.split(","));
        setCsvPreview(rows.slice(0, 5));
        setCsvColumns(rows[0] || []);
        setSelectedColumns(rows[0] || []);
      };
      reader.readAsText(f);
    }
  };

  const handleColumnToggle = (col: string) => {
    setColumnError("");
    setSelectedColumns((prev) => {
      let newCols;
      if (prev.includes(col)) {
        newCols = prev.filter((c) => c !== col);
      } else {
        newCols = [...prev, col];
      }
      if (newCols.length === 0) {
        setColumnError("You must select at least one column to import.");
      }
      return newCols;
    });
  };

  const handleSelectAll = () => {
    setColumnError("");
    setSelectedColumns(csvColumns);
  };

  const handleDeselectAll = () => {
    setSelectedColumns([]);
    setColumnError("You must select at least one column to import.");
  };

  const handleUpload = async () => {
    setUploadError("");
    setColumnError("");
    if (!file || !listName.trim()) return;
    if (selectedColumns.length === 0) {
      setColumnError("Please select at least one column to import.");
      return;
    }
    
    setUploading(true);
    createListMutation.mutate({ listName, file, selectedColumns });
    setUploading(false);
  };

  if (loadingFolder) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (folderError) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg font-medium">Erreur de chargement</div>
          <p className="text-gray-500 mt-2">Impossible de charger le dossier</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["prospects", "folder", folderId] })} className="mt-4">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  const { folderName, lists } = folderData || { folderName: "", lists: [] };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{folderName || "Folder"}</h2>
        <Button onClick={() => setOpen(true)}>+ New List</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {lists.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground">No lists yet.</div>
        ) : (
          lists.map((list) => (
            <Card
              key={list.id}
              className="hover:shadow-lg transition-shadow group relative"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                <CardTitle 
                  className="cursor-pointer group-hover:text-blue-600 transition-colors"
                  onClick={() => router.push(`/dashboard/prospects/${folderId}/${list.id}`)}
                >
                  {list.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssignmentModal({
                        open: true,
                        type: 'list',
                        itemId: list.id,
                        itemName: list.name,
                        currentClientId: list.client_id
                      });
                    }}
                    className="p-1.5 bg-white rounded-full border border-gray-200 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-200"
                    title="Assigner à un client"
                  >
                    <UserCheck className="w-4 h-4 text-gray-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Created {format(new Date(list.created_at), "PPP")}
                </div>
                <div className="text-xs truncate text-gray-500">{list.csv_url}</div>
                {list.client && list.client.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                    <UserCheck className="w-4 h-4" />
                    <span className="font-medium">{list.client[0].name}</span>
                    {list.client[0].company && (
                      <span className="text-xs text-blue-500">({list.client[0].company})</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="w-full max-w-lg sm:max-w-xl md:max-w-2xl min-h-[300px] max-h-[90vh] overflow-auto rounded-lg shadow-lg p-4"
          aria-describedby="new-list-desc"
        >
          <span id="new-list-desc" className="sr-only">
            Fill out the form to create a new list. Required fields: name, file, columns.
          </span>
          <DialogHeader>
            <DialogTitle>New List</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="List name"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            disabled={uploading}
            maxLength={50}
            className="mb-2"
          />
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={uploading}
            className="mb-2"
          />
          {csvColumns.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">Select columns to import:</div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={uploading}
                    className="flex items-center gap-1 text-xs px-2 py-1 h-7"
                  >
                    <CheckSquare className="w-3 h-3" />
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAll}
                    disabled={uploading}
                    className="flex items-center gap-1 text-xs px-2 py-1 h-7"
                  >
                    <Square className="w-3 h-3" />
                    Deselect All
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                {csvColumns.map((col, index) => (
                  <label
                    key={`${col}-${index}`}
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer border transition-colors ${selectedColumns.includes(col) ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-200 hover:bg-blue-100'}`}
                  >
                    <Checkbox
                      checked={selectedColumns.includes(col)}
                      onCheckedChange={() => handleColumnToggle(col)}
                      aria-label={`Select column ${col}`}
                    />
                    <span className="text-xs truncate" title={col}>{col}</span>
                  </label>
                ))}
              </div>
              {columnError && (
                <div className="text-red-500 text-xs mt-2 min-h-[20px]">{columnError}</div>
              )}
            </div>
          )}
          {uploadError && (
            <div className="text-red-500 text-xs mb-2 min-h-[20px]">{uploadError}</div>
          )}
          <DialogFooter>
            <Button
              onClick={handleUpload}
              disabled={uploading || !file || !listName.trim() || selectedColumns.length === 0}
              className="w-full sm:w-auto"
            >
              {uploading ? (
                <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Uploading...</span>
              ) : "Create List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Assignment Modal */}
      <ClientAssignmentModal
        open={assignmentModal.open}
        onOpenChange={(open) => setAssignmentModal(prev => ({ ...prev, open }))}
        type={assignmentModal.type}
        itemId={assignmentModal.itemId}
        itemName={assignmentModal.itemName}
        currentClientId={assignmentModal.currentClientId}
        onAssignmentChange={() => {
          // Refresh lists after assignment
          queryClient.invalidateQueries({ queryKey: ["prospects", "folder", folderId] });
        }}
      />
    </div>
  );
}

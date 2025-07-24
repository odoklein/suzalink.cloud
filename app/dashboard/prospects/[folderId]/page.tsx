"use client";
import React, { useEffect, useState } from "react";
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

interface List {
  id: string;
  name: string;
  folder_id: string;
  created_at: string;
  csv_url: string;
  columns: string[];
}

export default function FolderListsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const folderId = params.folderId as string;
  const [folderName, setFolderName] = useState("");
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[][]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [listName, setListName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
const [columnError, setColumnError] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch folder name
      const { data: folder, error: folderError } = await supabase
        .from("folders")
        .select("name")
        .eq("id", folderId)
        .single();
      if (folder) setFolderName(folder.name);
      // Fetch lists
      const { data: listsData, error: listsError } = await supabase
        .from("lists")
        .select("id, name, folder_id, created_at, csv_url, columns")
        .eq("folder_id", folderId)
        .order("created_at", { ascending: false });
      setLists(listsData || []);
      setLoading(false);
    };
    if (folderId) fetchData();
    // eslint-disable-next-line
  }, [folderId]);

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

  const handleUpload = async () => {
  setUploadError(""); // new error state for user feedback
  setColumnError("");
  if (!file || !listName.trim()) return;
  if (selectedColumns.length === 0) {
    setColumnError("Please select at least one column to import.");
    return;
  }
  setUploading(true);
  // 1. Upload CSV to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const filePath = `${folderId}/${Date.now()}_${file.name}`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from("lists")
      .upload(filePath, file, { contentType: "text/csv" });
    if (storageError) {
      setUploading(false);
      return;
    }
    // 2. Get public URL
    const { data: urlData } = supabase.storage.from("lists").getPublicUrl(filePath);
    // 3. Insert list metadata
    const { data: listData, error: listError } = await supabase
  .from("lists")
  .insert({
    name: listName.trim(),
    folder_id: folderId,
    csv_url: urlData.publicUrl,
    columns: selectedColumns,
    // user_id intentionally omitted for guest import
  })
  .select()
  .single();
    setUploading(false);
    if (!listError && listData) {
      // Parse the CSV file and insert rows into list_items
      if (file) {
        try {
          const text = await file.text();
          const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
          console.log('CSV parsed result:', parsed);
          if (parsed.errors && parsed.errors.length > 0) {
            console.error('CSV parsing errors:', parsed.errors);
            setUploadError('CSV parsing failed. Check your file format.');
            return;
          }
          const rows = parsed.data;
          // Only keep selected columns
          const items = rows.map((row: any) => {
            const filtered: Record<string, any> = {};
            selectedColumns.forEach(col => {
              filtered[col] = row[col];
            });
            return {
              list_id: listData.id,
              data: filtered
            };
          });
          console.log('Filtered items to insert:', items);
          if (items.length > 0) {
            const { error: insertError } = await supabase.from('list_items').insert(items);
            if (insertError) {
              console.error('Supabase insert error:', insertError);
              setUploadError('Failed to import rows into the database.');
              return;
            }
          }
        } catch (err) {
          console.error('Unexpected error during CSV import:', err);
          setUploadError('Unexpected error during import.');
          return;
        }
      }
      setLists((prev) => [listData, ...prev]);
      setOpen(false);
      setFile(null);
      setCsvPreview([]);
      setCsvColumns([]);
      setSelectedColumns([]);
      setListName("");
    }
  };


  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{folderName || "Folder"}</h2>
        <Button onClick={() => setOpen(true)}>+ New List</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading ? (
          <div>Loading...</div>
        ) : lists.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground">No lists yet.</div>
        ) : (
          lists.map((list) => (
            <Card
              key={list.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/dashboard/prospects/${folderId}/${list.id}`)}
            >
              <CardHeader>
                <CardTitle>{list.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-2">
                  Created {format(new Date(list.created_at), "PPP")}
                </div>
                <div className="text-xs truncate">{list.csv_url}</div>
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
              <div className="font-medium mb-2">Select columns to import:</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                {csvColumns.map((col) => (
                  <label
                    key={col}
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
    </div>
  );
}

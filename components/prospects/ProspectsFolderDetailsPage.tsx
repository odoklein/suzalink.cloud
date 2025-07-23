"use client";
import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";

import { useParams, useRouter } from "next/navigation";

export function ProspectsFolderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  
  // All hooks must be declared at the top level, before any returns
  const [folder, setFolder] = useState<any>(null);
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New states for CSV preview and column selection
  const [parsedColumns, setParsedColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [parsedResults, setParsedResults] = useState<any|null>(null);
  
  console.log("[FolderDetailsPage] Params:", params);
  const folderId = typeof params?.folderId === "string"
    ? params.folderId
    : Array.isArray(params?.folderId)
      ? params.folderId[0]
      : "";

  function isValidUUID(uuid: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid);
  }

  if (!folderId || !isValidUUID(folderId)) {
    return <div className="p-8 text-red-500">Invalid or missing folderId: {String(folderId)}</div>;
  }

  useEffect(() => {
    fetchFolderAndLists();
  }, [folderId]);

  async function fetchFolderAndLists() {
    setLoading(true);
    const { data: folderData, error: folderError } = await supabase
      .from("prospect_folders")
      .select("id, name, created_at")
      .eq("id", folderId)
      .single();
    if (folderError) setError(folderError.message);
    setFolder(folderData);

    const { data: listsData, error: listsError } = await supabase
      .from("prospection_lists")
      .select("id, name, columns, created_at, updated_at")
      .eq("folder_id", folderId)
      .order("created_at", { ascending: false });
    if (listsError) setError(listsError.message);
    setLists(listsData || []);
    setLoading(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      // Parse CSV for preview
      Papa.parse(e.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          const columns = results.meta.fields || [];
          setParsedColumns(columns);
          setSelectedColumns(columns); // Default: all selected
          setCsvPreviewRows(results.data.slice(0, 3)); // Preview first 3 rows
          setParsedResults(results);
        },
        error: (err: any) => {
          setError(err.message);
        },
      });
    }
  }

  async function handleUpload() {
    if (!parsedResults || selectedColumns.length === 0) {
      setError("No columns selected or no data to import.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const columns = selectedColumns;
      const name = file ? file.name.replace(/\.[^/.]+$/, "") : "Imported List";
      if (!folderId || typeof folderId !== "string" || folderId.length < 5) {
        setError("Invalid or missing folderId: " + String(folderId));
        setUploading(false);
        return;
      }
      // Insert into prospection_lists
      const { data: list, error: listError } = await supabase
        .from("prospection_lists")
        .insert({
          name,
          folder_id: folderId,
          columns,
        })
        .select()
        .single();
      if (listError) throw new Error(listError.message);
      // Insert each row into prospects, filtering only selected columns
      const prospects = parsedResults.data.map((row: any) => {
        const filtered: Record<string, any> = {};
        for (const col of columns) {
          filtered[col] = row[col];
        }
        return {
          list_id: list.id,
          data: filtered,
        };
      });
      if (prospects.length > 0) {
        const { error: prospectsError } = await supabase
          .from("prospects")
          .insert(prospects);
        if (prospectsError) throw new Error(prospectsError.message);
      }
      setUploadOpen(false);
      setFile(null);
      setParsedColumns([]);
      setSelectedColumns([]);
      setCsvPreviewRows([]);
      setParsedResults(null);
      fileInputRef.current && (fileInputRef.current.value = "");
      fetchFolderAndLists();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{folder ? folder.name : "Folder"}</h1>
        <Button onClick={() => setUploadOpen(true)}>Upload CSV</Button>
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {lists.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">No prospection lists yet.</CardContent>
            </Card>
          ) : (
            lists.map(list => (
              <Card key={list.id}>
                <CardHeader>
                  <CardTitle>{list.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Created: {new Date(list.created_at).toLocaleString()}</span>
                    <Button size="sm" onClick={() => router.push(`/dashboard/prospects/folders/${folderId}/lists/${list.id}`)}>Open</Button>
                  </div>
                  <div className="text-xs mt-2 text-gray-400">Columns: {Array.isArray(list.columns) ? list.columns.join(", ") : JSON.stringify(list.columns)}</div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      {/* Upload CSV Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(open) => {
         setUploadOpen(open);
         if (!open) {
           setUploading(false);
           setFile(null);
           setParsedColumns([]);
           setSelectedColumns([]);
           setCsvPreviewRows([]);
           setParsedResults(null);
           setError(null);
           if (fileInputRef.current) fileInputRef.current.value = "";
         }
       }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Prospection List (CSV)</DialogTitle>
          </DialogHeader>
          <Input type="file" accept=".csv" onChange={handleFileChange} ref={fileInputRef} />
          {/* Column selection and preview */}
          {parsedColumns.length > 0 && (
            <div className="my-4">
              <div className="font-semibold mb-2">Select columns to import:</div>
              <div className="flex flex-wrap gap-2 mb-2" style={{ maxHeight: 300, overflow: 'auto' }}>
                {parsedColumns.map(col => (
                  <div key={col} className="flex items-center gap-2 border rounded px-2 py-1">
                    <span>{col}</span>
                    <Button
                      size="sm"
                      variant={selectedColumns.includes(col) ? "default" : "outline"}
                      onClick={() => {
                        setSelectedColumns(selectedColumns.includes(col)
                          ? selectedColumns.filter(c => c !== col)
                          : [...selectedColumns, col]);
                      }}
                    >{selectedColumns.includes(col) ? "Import" : "Don't import"}</Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpload} disabled={!file || uploading || selectedColumns.length === 0}>{uploading ? "Uploading..." : "Upload"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

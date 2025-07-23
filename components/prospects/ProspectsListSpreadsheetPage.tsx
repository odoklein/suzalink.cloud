"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import type { Key } from "react";

// Note: Les styles CSS seront importés dynamiquement

export function ProspectsListSpreadsheetPage() {
  const params = useParams();
  
  // All hooks must be declared at the top level, before any returns
  const [mounted, setMounted] = useState(false);
  const [list, setList] = useState<any>(null);
  const [prospects, setProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string|null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  
  console.log("[SpreadsheetPage] Params:", params);
  const folderId = typeof params?.folderId === "string" ? params.folderId : Array.isArray(params?.folderId) ? params.folderId[0] : "";
  const listId = typeof params?.listId === "string" ? params.listId : Array.isArray(params?.listId) ? params.listId[0] : "";

  function isValidUUID(uuid: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid);
  }

  // First useEffect - fetch data
  useEffect(() => {
    if (!listId || !isValidUUID(listId)) return;
    setLoading(true);
    Promise.all([
      supabase.from("prospection_lists").select("*", { head: false }).eq("id", listId).single(),
      supabase.from("prospects").select("*", { head: false }).eq("list_id", listId)
    ]).then(([listRes, prospectsRes]) => {
      if (listRes.error) setError(listRes.error.message);
      if (prospectsRes.error) setError(prospectsRes.error.message);
      setList(listRes.data);
      setProspects(prospectsRes.data || []);
      setLoading(false);
    });
  }, [listId]);
  
  // Mount state for hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <div className="p-8">Loading...</div>;
  }
  
  if (!listId || !isValidUUID(listId)) {
    return <div className="p-8 text-red-500">Invalid or missing listId in URL: {String(listId)}</div>;
  }

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!list) return <div className="p-8">List not found.</div>;

  // Prepare columns for DataTable
  let columns: ColumnDef<any, any>[] = [];
  let columnKeys: string[] = [];
  if (Array.isArray(list.columns)) {
    columnKeys = list.columns as string[];
  } else if (typeof list.columns === "object" && list.columns !== null) {
    columnKeys = Object.values(list.columns as Record<string, string>);
  }
  columns = columnKeys.map((col) => ({
    accessorKey: col,
    header: col,
    cell: ({ row, getValue }) => getValue() || "",
  }));

  // Prepare rows for DataTable
  let rows: any[] = [];
  let rowIdMap: Record<number, string> = {};
  if (Array.isArray(prospects)) {
    rows = prospects.map((p: any, idx: number) => {
      rowIdMap[idx] = p.id; // Map row index to prospect id
      return { ...p.data };
    });
  }



  // Handle row edit
  async function handleRowEdit(idx: number, newRow: any) {
    setSaving(true);
    setSaveError(null);
    const prospectId = rowIdMap[idx];
    // Optimistic UI update
    setProspects((prev) => {
      const copy = [...prev];
      if (copy[idx]) copy[idx] = { ...copy[idx], data: newRow };
      return copy;
    });
    // Save to Supabase
    const { error } = await supabase
      .from("prospects")
      .update({ data: newRow })
      .eq("id", prospectId);
    setSaving(false);
    if (error) setSaveError(error.message);
  }

  // Add new row
  async function handleAddRow() {
    setSaving(true);
    setSaveError(null);
    const emptyRow: any = {};
    columnKeys.forEach((col) => { emptyRow[col] = ""; });
    const { data, error } = await supabase
      .from("prospects")
      .insert([{ list_id: listId, data: emptyRow }])
      .select();
    setSaving(false);
    if (error) setSaveError(error.message);
    else if (data) setProspects((prev) => [...prev, data[0]]);
  }

  // Edit column name
  async function handleColumnEdit(colIndex: number, newName: string) {
    if (!columnKeys[colIndex] || !newName || columnKeys.includes(newName)) return;
    setSaving(true);
    setSaveError(null);
    const oldName = columnKeys[colIndex];
    // Update columns array
    const newColumns = [...columnKeys];
    newColumns[colIndex] = newName;
    // Update all prospects' data keys
    const updatedProspects = prospects.map((p) => {
      const newData: any = {};
      Object.entries(p.data).forEach(([k, v]) => {
        if (k === oldName) newData[newName] = v;
        else newData[k] = v;
      });
      return { ...p, data: newData };
    });
    // Persist columns
    await supabase.from("prospection_lists").update({ columns: newColumns }).eq("id", listId);
    // Persist each prospect
    for (const p of updatedProspects) {
      await supabase.from("prospects").update({ data: p.data }).eq("id", p.id);
    }
    setList((prev: any) => ({ ...prev, columns: newColumns }));
    setProspects(updatedProspects);
    setSaving(false);
  }

  // Add new column
  async function handleAddColumn() {
    const newName = prompt("Enter new column name:");
    if (!newName || columnKeys.includes(newName)) return;
    setSaving(true);
    setSaveError(null);
    const newColumns = [...columnKeys, newName];
    // Add new key to all prospects
    const updatedProspects = prospects.map((p) => ({
      ...p,
      data: { ...p.data, [newName]: "" }
    }));
    // Persist columns
    await supabase.from("prospection_lists").update({ columns: newColumns }).eq("id", listId);
    // Persist each prospect
    for (const p of updatedProspects) {
      await supabase.from("prospects").update({ data: p.data }).eq("id", p.id);
    }
    setList((prev: any) => ({ ...prev, columns: newColumns }));
    setProspects(updatedProspects);
    setSaving(false);
  }

  // Bulk delete
  async function handleBulkDelete(indices: number[]) {
    setSaving(true);
    setSaveError(null);
    const idsToDelete = indices.map(idx => rowIdMap[idx]).filter(Boolean);
    if (idsToDelete.length === 0) return;
    const { error } = await supabase
      .from("prospects")
      .delete()
      .in("id", idsToDelete);
    setSaving(false);
    if (error) setSaveError(error.message);
    else {
      setProspects(prev => prev.filter((_, i) => !indices.includes(i)));
      setSelectedRows(new Set());
    }
  }

  // Delete row by index
  async function handleRowDelete(idx: number) {
    setSaving(true);
    setSaveError(null);
    const prospectId = rowIdMap[idx];
    const { error } = await supabase
      .from("prospects")
      .delete()
      .eq("id", prospectId);
    setSaving(false);
    if (error) setSaveError(error.message);
    else setProspects((prev) => prev.filter((_, i) => i !== idx));
  }

  // CSV export
  function handleExportCSV() {
    import("papaparse").then((Papa) => {
      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${list.name || "prospects"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }


  return (
    <div className="w-full min-h-screen flex flex-col py-0 px-0">
      <h1 className="text-2xl font-bold mb-4">{list.name}</h1>
      <div className="flex items-center gap-4 mb-2">
        <div className="text-gray-500 text-sm">{columns.length} colonnes, {rows.length} prospects</div>
        <button onClick={handleAddRow} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">+ Ajouter une ligne</button>
        <button onClick={handleExportCSV} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Exporter CSV</button>
        {selectedRows.size > 0 && (
          <button onClick={() => {
            // Prendre la première ligne sélectionnée (il devrait n'y en avoir qu'une)
            const selectedKey = selectedRows.size > 0 ? Array.from(selectedRows)[0] : null;
            const idx = typeof selectedKey === 'number' ? selectedKey : -1;
            if (idx >= 0) handleRowDelete(idx);
          }} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Supprimer la ligne</button>
        )}
        {saving && <span className="ml-2 text-xs text-gray-400">Sauvegarde...</span>}
        {saveError && <span className="ml-2 text-xs text-red-500">Erreur: {saveError}</span>}
      </div>
      <div className="bg-white rounded shadow flex-1 w-full overflow-auto p-4">
        <DataTable
          columns={columns}
          data={rows}
          onRowEdit={handleRowEdit}
          onRowDelete={handleRowDelete}
          isLoading={loading}
          editable={true}
          selectedRows={selectedRows}
          onSelectedRowsChange={setSelectedRows}
          onBulkDelete={handleBulkDelete}
          onColumnEdit={handleColumnEdit}
          onAddColumn={handleAddColumn}
        />
      </div>
    </div>
  );
}

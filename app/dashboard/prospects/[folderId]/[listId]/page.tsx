"use client";
import React, { useEffect, useState, useRef } from "react";
import { useProspectHistoryStore, type ProspectHistoryState, type ProspectAction } from "@/app/store/useProspectHistoryStore";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Plus, 
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  Settings,
  FileSpreadsheet,
  Users,
  Calendar
} from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface List {
  id: string;
  name: string;
  folder_id: string;
  created_at: string;
  csv_url: string;
  columns: string[];
}

import Papa from 'papaparse';

export default function ListSpreadsheetPage() {
  const [past, setPast] = React.useState<ProspectAction[]>([]);
  const undo = useProspectHistoryStore((s: ProspectHistoryState) => s.undo);
  const redo = useProspectHistoryStore((s: ProspectHistoryState) => s.redo);
  const addAction = useProspectHistoryStore((s: ProspectHistoryState) => s.addAction);

  // Keep local copy of past for backend wiring
  const pastActions = useProspectHistoryStore((s: ProspectHistoryState) => s.past);
  React.useEffect(() => { setPast(pastActions); }, [pastActions]);

  // Redo handler that updates UI and backend
  async function handleRedoWithUI() {
    const futureActions = useProspectHistoryStore.getState().future;
    if (!futureActions || futureActions.length === 0) return;
    const nextAction = futureActions[0];
    if (!nextAction || !nextAction.targetId || !nextAction.nextData) return;

    // Optimistically update UI
    setProspects(prev =>
      prev.map(p =>
        p.id === nextAction.targetId ? { ...p, data: nextAction.nextData } : p
      )
    );

    // Optionally call backend to re-apply the change (not strictly needed, but for audit)
    try {
      await fetch(`/api/prospects/items/${nextAction.targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: null,
          list_id: listId,
          action_type: 'redo',
          old_data: nextAction.prevData,
          new_data: nextAction.nextData,
        }),
      });
    } catch (err) {
      console.error('Backend redo failed:', err);
    }

    // Remove from local future stack
    useProspectHistoryStore.getState().redo();
  }

  // Undo handler that updates UI and backend
  async function handleUndoWithUI() {
    if (!past || past.length === 0) return;
    const lastAction = past[past.length - 1];
    if (!lastAction || !lastAction.targetId || !lastAction.prevData) return;

    // Optimistically update UI
    setProspects(prev =>
      prev.map(p =>
        p.id === lastAction.targetId ? { ...p, data: lastAction.prevData } : p
      )
    );

    // Call backend revert for audit/persistence
    try {
      await fetch(`/api/prospects/${lastAction.targetId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: lastAction.actionId, user_id: null })
      });
    } catch (err) {
      console.error('Backend revert failed:', err);
      // Optionally show a toast/notification
    }

    // Remove from local undo stack
    undo();
  }
  
  // Keyboard shortcut: Ctrl+Z/Cmd+Z for undo, Ctrl+Shift+Z or Ctrl+Y for redo
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      if (ctrlOrCmd && !e.altKey) {
        if (e.key.toLowerCase() === 'z') {
          if (e.shiftKey) {
            // Ctrl+Shift+Z or Cmd+Shift+Z → redo
            e.preventDefault();
            handleRedoWithUI();
          } else {
            // Ctrl+Z or Cmd+Z → undo
            e.preventDefault();
            handleUndoWithUI();
          }
        } else if (e.key.toLowerCase() === 'y') {
          // Ctrl+Y → redo
          e.preventDefault();
          redo();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [redo, handleUndoWithUI]);
  
  // CSV import state
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [importCsvError, setImportCsvError] = useState<string | null>(null);

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingCsv(true);
    setImportCsvError(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, any>[];
        console.log('CSV Parsed Rows:', rows);
        if (!rows.length) {
          console.error('PapaParse results:', results);
          setImportCsvError('CSV file is empty or invalid.');
          setImportingCsv(false);
          return;
        }
        // Set columns from CSV if not present
        const csvColumns = Object.keys(rows[0]);
        let updatedColumns = columns;
        if (columns.length === 0 && list) {
          updatedColumns = csvColumns;
          // 1. Set columns in DB and update local state
          const { error: colError } = await supabase.from('list_items').update({ columns: updatedColumns }).eq('id', list.id);
          if (colError) {
            setImportCsvError('Failed to set columns from CSV.');
            setImportingCsv(false);
            return;
          }
          setList(prev => prev ? { ...prev, columns: updatedColumns } : prev);
        }
        // 2. Insert rows (always, after columns are set if needed)
        const toInsert = rows.map(row => ({ list_id: listId, data: row }));
        console.log('Rows to insert:', toInsert);
        const { data: insertedRows, error: insertError } = await supabase.from('list_items').insert(toInsert).select();
        console.log('Insert response:', insertedRows, insertError);
        if (insertError) {
          setImportCsvError('Failed to import prospects.');
          setImportingCsv(false);
          return;
        }
        if (!insertedRows || insertedRows.length === 0) {
          setImportCsvError('No rows were imported. Check for DB constraints or RLS.');
          setImportingCsv(false);
          return;
        }
        // Reload prospects
        const { data: prospectRows, error: prospectsError } = await supabase
          .from('list_items')
          .select('id, data')
          .eq('list_id', listId);
        if (prospectsError) {
          setImportCsvError('Imported, but failed to reload prospects.');
        } else {
          setProspects(prospectRows || []);
        }
        setImportingCsv(false);
        if (csvInputRef.current) csvInputRef.current.value = '';
        toast.success(`${insertedRows.length} prospects importés avec succès`);
      },
      error: (err) => {
        console.error('PapaParse error:', err);
        setImportCsvError('Failed to parse CSV file.');
        setImportingCsv(false);
      }
    });
  }

  // State for Add Column empty state
  const [newColumnName, setNewColumnName] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [addColumnError, setAddColumnError] = useState<string | null>(null);

  // Add column handler
  async function handleAddColumn() {
    if (!newColumnName.trim() || !list) return;
    setAddingColumn(true);
    setAddColumnError(null);
    const colName = newColumnName.trim();
    // Prevent duplicates
    if (list.columns && list.columns.includes(colName)) {
      setAddColumnError("Column already exists");
      setAddingColumn(false);
      return;
    }
    const updatedColumns = [...(list.columns || []), colName];
    const { error } = await supabase.from("lists").update({ columns: updatedColumns }).eq("id", list.id);
    if (error) {
      setAddColumnError("Failed to add column");
      setAddingColumn(false);
      return;
    }
    setList({ ...list, columns: updatedColumns });
    setNewColumnName("");
    setAddingColumn(false);
    toast.success("Colonne ajoutée avec succès");
  }
  
  // All state declarations at the top to avoid ReferenceError
  const params = useParams();
  const router = useRouter();
  const listId = params?.listId as string;
  const supabase = createClient();
  const [list, setList] = useState<List | null>(null);
  const [prospects, setProspects] = useState<{ id: string; data: Record<string, any> }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Sorting, filtering, pagination, and column visibility state
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [colVisible, setColVisible] = useState<boolean[]>([]);
  // Popover state for column toggles
  const [showColsPopover, setShowColsPopover] = useState(false);
  // Row selection for bulk actions
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Undo/redo state (local, for UI only)
  type Prospect = { id: string; data: Record<string, any> };
  const [undoStack, setUndoStack] = useState<Prospect[][]>([]);
  const [redoStack, setRedoStack] = useState<Prospect[][]>([]);

  // Columns: derive from list.columns or first prospect's data keys
  const columns: string[] = list?.columns && list.columns.length > 0
    ? list.columns
    : (prospects[0] ? Object.keys(prospects[0].data) : []);

  // filteredProspects: apply filter and sort
  const filteredProspects = prospects
    .filter(p =>
      filter === '' ||
      columns.some(col => String(p.data[col] ?? '').toLowerCase().includes(filter.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortCol === null) return 0;
      const col = columns[sortCol];
      const aVal = a.data[col] ?? '';
      const bVal = b.data[col] ?? '';
      if (aVal === bVal) return 0;
      return (aVal > bVal ? 1 : -1) * (sortDir === 'asc' ? 1 : -1);
    });

  // Pagination
  const pageCount = Math.max(1, Math.ceil(filteredProspects.length / pageSize));
  const pagedProspects = filteredProspects.slice((page - 1) * pageSize, page * pageSize);

  // Inline editing handlers
  function startEdit(row: number, col: number, value: string) {
    setEditingCell({ row, col });
    setEditValue(value);
  }
  function cancelEdit() {
    setEditingCell(null);
    setEditValue("");
  }
  async function handleSaveEdit(row: number, col: number) {
    if (!columns[col]) return;
    const colKey = columns[col];
    const globalIdx = (page - 1) * pageSize + row;
    const prospect = filteredProspects[globalIdx];
    if (!prospect) return;
    const prevData = { ...prospect.data };
    const updated = { ...prospect.data, [colKey]: editValue };
    // Optimistic UI
    setProspects(prev => prev.map((p, idx) => p.id === prospect.id ? { ...p, data: updated } : p));
    await supabase.from('list_items').update({ data: updated }).eq('id', prospect.id);
    // Fetch the latest log entry for this prospect and update
    const { data: logs, error: logError } = await supabase
      .from('prospect_action_logs')
      .select('id')
      .eq('prospect_id', prospect.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const actionId = logs && logs.length > 0 ? logs[0].id : undefined;
    addAction({
      type: "edit",
      targetId: prospect.id,
      prevData,
      nextData: updated,
      actionId,
    });
    cancelEdit();
  }

  // Row actions (UI only for now)
  function handleViewRow(row: number) {
    // TODO: open modal or navigate to row detail
    alert("View row " + ((page - 1) * pageSize + row + 1));
  }
  function handleEditRow(row: number) {
    // TODO: open row edit modal
    alert("Edit row " + ((page - 1) * pageSize + row + 1));
  }
  async function handleDuplicateRow(row: number) {
    setUndoStack(stack => [...stack, JSON.parse(JSON.stringify(prospects))]);
    setRedoStack([]);
    const globalIdx = (page - 1) * pageSize + row;
    const prospect = filteredProspects[globalIdx];
    if (!prospect) return;
    const newProspect = { ...prospect.data };
    const { data: inserted } = await supabase.from('list_items').insert([{ list_id: listId, data: newProspect }]).select().single();
    if (inserted) setProspects(prev => [...prev, inserted]);
  }

  async function handleDeleteRow(row: number) {
    setUndoStack(stack => [...stack, JSON.parse(JSON.stringify(prospects))]);
    setRedoStack([]);
    const globalIdx = (page - 1) * pageSize + row;
    const prospect = filteredProspects[globalIdx];
    if (!prospect) return;
    setProspects(prev => prev.filter(p => p.id !== prospect.id));
    await supabase.from('list_items').delete().eq('id', prospect.id);
  }

  // Bulk actions
  async function handleDeleteSelected() {
    const idsToDelete = selectedRows.map(rowIdx => pagedProspects[rowIdx]?.id).filter(Boolean);
    setProspects(prev => prev.filter(p => !idsToDelete.includes(p.id)));
    await supabase.from('list_items').delete().in('id', idsToDelete);
    setSelectedRows([]);
    toast.success(`${idsToDelete.length} prospects supprimés`);
  }

  // Undo/redo handlers
  function handleUndo() {
    setUndoStack(prevUndo => {
      if (prevUndo.length === 0) return prevUndo;
      const prevState = prevUndo[prevUndo.length - 1];
      setRedoStack(prevRedo => [...prevRedo, JSON.parse(JSON.stringify(prospects))]);
      setProspects(JSON.parse(JSON.stringify(prevState)));
      return prevUndo.slice(0, -1);
    });
  }
  function handleRedo() {
    setRedoStack(prevRedo => {
      if (prevRedo.length === 0) return prevRedo;
      const nextState = prevRedo[prevRedo.length - 1];
      setUndoStack(prevUndo => [...prevUndo, JSON.parse(JSON.stringify(prospects))]);
      setProspects(JSON.parse(JSON.stringify(nextState)));
      return prevRedo.slice(0, -1);
    });
  }
  async function handleExportSelected() {
    const globalIndexes = selectedRows.map(rowIdx => (page - 1) * pageSize + rowIdx);
    const selectedProspects = globalIndexes.map(idx => filteredProspects[idx]).filter(Boolean);
    const csvRows = [columns, ...selectedProspects.map(row => columns.map(col => row.data[col] ?? ''))];
    const csv = csvRows.map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(",")).join("\r\n");
    // Download to user
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exported_rows_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // Update colVisible when data/columns change
  useEffect(() => {
    if (loading || !prospects.length || !columns.length) return;
    if (!colVisible.length || colVisible.length !== columns.length) {
      setColVisible(Array(columns.length).fill(true));
    }
  }, [prospects, columns, loading]);

  useEffect(() => {
    const fetchListAndProspects = async () => {
      setLoading(true);
      // Fetch list metadata
      const { data: listData, error: listError } = await supabase
        .from("lists")
        .select("*")
        .eq("id", listId)
        .single();
      if (listError || !listData) {
        setError("List not found");
        setLoading(false);
        return;
      }
      setList(listData);
      // Fetch prospects for this list
      const { data: prospectRows, error: prospectsError } = await supabase
        .from("list_items")
        .select("id, data")
        .eq("list_id", listId);
      if (prospectsError) {
        setError("Failed to load prospects");
        setLoading(false);
        return;
      }
      setProspects(prospectRows || []);
      setLoading(false);
    };
    if (listId) fetchListAndProspects();
  }, [listId]);

  async function handleAddRow() {
    setUndoStack(stack => [...stack, JSON.parse(JSON.stringify(prospects))]);
    setRedoStack([]);
    if (!columns.length) return;
    const emptyRow: Record<string, any> = {};
    columns.forEach(col => (emptyRow[col] = ""));
    const { data: inserted } = await supabase.from('list_items').insert([{ list_id: listId, data: emptyRow }]).select().single();
    if (inserted) setProspects(prev => [...prev, inserted]);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500 text-lg font-medium">{error}</div>
        <Button onClick={() => window.location.reload()}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{list?.name || "Liste de prospects"}</h1>
          <p className="text-gray-600 mt-1">Gérez vos prospects et leurs données</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total prospects</p>
              <p className="text-2xl font-bold text-gray-900">{prospects.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Colonnes</p>
              <p className="text-2xl font-bold text-gray-900">{columns.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Créé le</p>
              <p className="text-sm font-medium text-gray-900">
                {list?.created_at ? new Date(list.created_at).toLocaleDateString('fr-FR') : 'N/A'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Bar */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Undo/Redo Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleUndoWithUI} 
              size="sm"
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              <Undo2 className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRedoWithUI} 
              size="sm"
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              <Redo2 className="w-4 h-4 mr-2" />
              Rétablir
            </Button>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher dans les prospects..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="pl-10 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* CSV Import */}
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            ref={csvInputRef}
            onChange={handleCsvFile}
          />
          <Button
            variant="outline"
            onClick={() => csvInputRef.current?.click()}
            disabled={importingCsv}
            className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            <Upload className="w-4 h-4 mr-2" />
            {importingCsv ? "Import..." : "Importer CSV"}
          </Button>

          {/* Export Selected */}
          {selectedRows.length > 0 && (
            <Button
              variant="outline"
              onClick={handleExportSelected}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter ({selectedRows.length})
            </Button>
          )}

          {/* Add Row */}
          <Button
            onClick={handleAddRow}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Ajouter prospect
          </Button>
        </div>

        {/* Error Messages */}
        {importCsvError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {importCsvError}
          </div>
        )}
      </Card>

      {/* Table Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Column visibility toggles */}
        {columns.length > 0 && (
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowColsPopover(v => !v)}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              <Settings className="w-4 h-4 mr-2" />
              Colonnes
            </Button>
            {showColsPopover && (
              <div className="absolute z-20 mt-2 w-72 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg p-4 grid grid-cols-2 gap-2">
                {columns.map((col, idx) => (
                  <label key={idx} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer text-sm">
                    <Checkbox
                      checked={colVisible[idx]}
                      onCheckedChange={checked => {
                        setColVisible(cv => {
                          const next = [...cv];
                          next[idx] = checked;
                          return next;
                        });
                      }}
                    />
                    <span className="truncate" title={col}>{col}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Lignes par page:</span>
          <Select value={String(pageSize)} onValueChange={val => { setPageSize(Number(val)); setPage(1); }}>
            <SelectTrigger className="w-20 h-8 border-gray-300 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map(size => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-600">
          {filteredProspects.length} prospect{filteredProspects.length !== 1 ? 's' : ''} trouvé{filteredProspects.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table or Empty State */}
      {columns.length === 0 ? (
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune colonne définie</h3>
              <p className="text-gray-500 mb-6">Commencez par ajouter des colonnes à votre liste de prospects</p>
            </div>
            <div className="flex gap-3">
              <Input
                placeholder="Nom de la colonne"
                value={newColumnName}
                onChange={e => setNewColumnName(e.target.value)}
                className="w-48 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Button 
                onClick={handleAddColumn} 
                disabled={!newColumnName.trim() || addingColumn}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200"
              >
                {addingColumn ? 'Ajout...' : 'Ajouter'}
              </Button>
            </div>
            {addColumnError && (
              <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {addColumnError}
              </div>
            )}
          </div>
        </Card>
      ) : (
                 <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
           <div className="max-h-[600px] overflow-y-auto overflow-x-hidden">
             <div className="min-w-full">
               <Table>
              <TableHeader className="sticky top-0 z-10 bg-gray-50">
                <TableRow>
                  <TableHead className="w-12 bg-gray-50">
                    <Checkbox
                      checked={selectedRows.length === pagedProspects.length && pagedProspects.length > 0}
                      onCheckedChange={checked => {
                        if (checked) {
                          setSelectedRows(pagedProspects.map((_, i) => i));
                        } else {
                          setSelectedRows([]);
                        }
                      }}
                      className={selectedRows.length > 0 && selectedRows.length < pagedProspects.length ? "bg-gray-200" : ""}
                    />
                  </TableHead>
                  {columns.map((col, idx) => (
                    <TableHead
                      key={col}
                      className="cursor-pointer select-none hover:bg-gray-100 transition-colors bg-gray-50"
                      onClick={() => {
                        if (sortCol === idx) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                        else {
                          setSortCol(idx);
                          setSortDir('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {col}
                        {sortCol === idx && (
                          <span className="text-blue-600">
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-20 bg-gray-50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedProspects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 2} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-lg font-medium text-gray-900 mb-1">Aucun prospect trouvé</p>
                          <p className="text-gray-500">Commencez par ajouter votre premier prospect</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedProspects.map((row, rowIdx) => (
                    <TableRow key={row.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="w-12">
                        <Checkbox
                          checked={selectedRows.includes(rowIdx)}
                          onCheckedChange={checked => {
                            setSelectedRows(sel => checked ? [...sel, rowIdx] : sel.filter(idx => idx !== rowIdx));
                          }}
                        />
                      </TableCell>
                      {columns.map((col, colIdx) => (
                        <TableCell key={col} className="py-3">
                          {editingCell && editingCell.row === rowIdx && editingCell.col === colIdx ? (
                            <Input
                              autoFocus
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => handleSaveEdit(rowIdx, colIdx)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEdit(rowIdx, colIdx);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="h-8 text-sm border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            <span
                              className="block cursor-pointer min-w-[60px] px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                              onDoubleClick={() => startEdit(rowIdx, colIdx, row.data[col])}
                              tabIndex={0}
                              onKeyDown={e => {
                                if (e.key === 'Enter') startEdit(rowIdx, colIdx, row.data[col]);
                              }}
                            >
                              {row.data[col] || ''}
                            </span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="w-20">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewRow(rowIdx)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditRow(rowIdx)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateRow(rowIdx)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Dupliquer
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteRow(rowIdx)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                             </TableBody>
             </Table>
           </div>
           </div>
         </Card>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {page} sur {pageCount} • {filteredProspects.length} prospect{filteredProspects.length !== 1 ? 's' : ''} au total
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page === 1} 
              onClick={() => setPage(1)}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              «
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page === 1} 
              onClick={() => setPage(page - 1)}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              ‹
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page === pageCount} 
              onClick={() => setPage(page + 1)}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              ›
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page === pageCount} 
              onClick={() => setPage(pageCount)}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              »
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

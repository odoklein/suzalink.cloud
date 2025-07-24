"use client";
import React, { useEffect, useState, useRef } from "react";
import { useProspectHistoryStore, type ProspectHistoryState, type ProspectAction } from "@/app/store/useProspectHistoryStore";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

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
        let csvColumns = Object.keys(rows[0]);
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
  }
  // All state declarations at the top to avoid ReferenceError
  const params = useParams();
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
    // eslint-disable-next-line
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

  return (
    <div className="min-h-screen bg-white flex flex-col w-full">
      {/* Undo/Redo Buttons */}
      <div className="flex gap-2 mb-4">
        <Button variant="secondary" onClick={handleUndoWithUI} type="button">Undo</Button>
        <Button variant="secondary" onClick={handleRedoWithUI} type="button">Redo</Button>
      </div>
      <div className="flex items-center gap-4 mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold flex-1 truncate">
          {list ? list.name : "List"}
        </h2>
        {/* Future: Add save, export, etc. */}
      </div>
      {/* CSV Import UI */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          ref={csvInputRef}
          onChange={handleCsvFile}
        />
        
      </div>
      {/* Search/filter input and column toggles */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <div className="max-w-xs">
          <Input
            placeholder="Search..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        {/* Column visibility toggles */}
        {columns.length > 0 && (
          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white shadow-sm text-sm font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={() => setShowColsPopover(v => !v)}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>
              Columns
            </button>
            {showColsPopover && (
              <div className="absolute z-20 mt-2 w-72 max-h-64 overflow-y-auto rounded-md border bg-white shadow-lg p-3 grid grid-cols-2 gap-2" onBlur={() => setShowColsPopover(false)} tabIndex={-1}>
                {columns.map((col, idx) => (
                  <label key={idx} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer text-xs">
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
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={String(pageSize)} onValueChange={val => { setPageSize(Number(val)); setPage(1); }}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map(size => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>


   
    
      {/* Table or Empty State */}
      {columns.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-16">
          <p className="text-lg text-muted-foreground mb-4">This list has no columns yet.</p>
          <div className="flex gap-2">
            <Input
              placeholder="Column name"
              value={newColumnName}
              onChange={e => setNewColumnName(e.target.value)}
              className="w-48"
            />
            <Button onClick={handleAddColumn} disabled={!newColumnName.trim() || addingColumn}>
              {addingColumn ? 'Adding...' : 'Add Column'}
            </Button>
          </div>
          {addColumnError && <span className="text-red-500 mt-2">{addColumnError}</span>}
        </div>
      ) : (
        <div className="overflow-auto bg-gray-50 rounded shadow w-full flex-1" style={{ width: '100vw' }}>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-gray-50">
              <TableRow>
                <TableHead className="w-8">
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
                    className="cursor-pointer select-none"
                    onClick={() => {
                      if (sortCol === idx) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortCol(idx);
                        setSortDir('asc');
                      }
                    }}
                  >
                    {col}
                    {sortCol === idx ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedProspects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 2} className="text-center text-muted-foreground py-8">
                    No prospects yet. Add your first prospect.
                  </TableCell>
                </TableRow>
              ) : (
                pagedProspects.map((row, rowIdx) => (
                  <TableRow key={row.id} data-state={selectedRows.includes(rowIdx) ? "selected" : undefined}>
                    <TableCell className="w-8">
                      <Checkbox
                        checked={selectedRows.includes(rowIdx)}
                        onCheckedChange={checked => {
                          setSelectedRows(sel => checked ? [...sel, rowIdx] : sel.filter(idx => idx !== rowIdx));
                        }}
                      />
                    </TableCell>
                    {columns.map((col, colIdx) => (
                      <TableCell key={col}>
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
                            className="h-7 text-xs"
                          />
                        ) : (
                          <span
                            className="block cursor-pointer min-w-[60px]"
                            onDoubleClick={() => startEdit(rowIdx, colIdx, row.data[col])}
                            tabIndex={0}
                            onKeyDown={e => {
                              if (e.key === 'Enter') startEdit(rowIdx, colIdx, row.data[col]);
                            }}
                          >
                            {row.data[col]}
                          </span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex gap-2 items-center justify-end mt-4">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)}>&laquo;</Button>
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>&lsaquo;</Button>
        <span className="text-sm">Page {page} of {pageCount}</span>
        <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage(page + 1)}>&rsaquo;</Button>
        <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage(pageCount)}>&raquo;</Button>
      </div>
    </div>
  );
}

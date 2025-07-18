"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProspectForm from "@/components/ProspectForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Papa from "papaparse";

export default function ProspectionListPage() {
  const params = useParams();
  const listId = params.listId as string;
  const [prospects, setProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [totalCount, setTotalCount] = useState(0);
  const [prospectModalOpen, setProspectModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<any | null>(null);
  const [deleteProspectId, setDeleteProspectId] = useState<string | null>(null);
  const [crudLoading, setCrudLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssigned, setFilterAssigned] = useState("");
  const [filterCustom, setFilterCustom] = useState<{ [key: string]: string }>({});
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvStep, setCsvStep] = useState(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [csvMap, setCsvMap] = useState<{ [key: string]: string }>({});
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);

  // Fetch prospects for this list
  async function fetchProspects() {
    setLoading(true);
    setError(null);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("prospects")
      .select("id,name,email,status,assigned_user,custom_fields", { count: "exact" })
      .eq("prospection_list_id", listId);
    if (filterStatus) query = query.eq("status", filterStatus);
    if (filterAssigned) query = query.eq("assigned_user", filterAssigned);
    // For custom fields filtering (JSONB), use .contains if supported
    Object.entries(filterCustom).forEach(([key, value]) => {
      if (value) query = query.contains("custom_fields", { [key]: value });
    });
    query = query.range(from, to);
    const { data, error, count } = await query;
    if (error) {
      setError(error.message);
      setProspects([]);
    } else {
      setProspects(data || []);
      if (typeof count === 'number') setTotalCount(count);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (listId) fetchProspects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, page, filterStatus, filterAssigned, JSON.stringify(filterCustom)]);

  // Collect all custom field keys
  const customFieldKeys = Array.from(
    new Set(
      prospects.flatMap(p => p.custom_fields ? Object.keys(p.custom_fields) : [])
    )
  );

  // Debounce filter changes
  const [debouncedFilterStatus, setDebouncedFilterStatus] = useState(filterStatus);
  const [debouncedFilterAssigned, setDebouncedFilterAssigned] = useState(filterAssigned);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilterStatus(filterStatus), 300);
    return () => clearTimeout(t);
  }, [filterStatus]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilterAssigned(filterAssigned), 300);
    return () => clearTimeout(t);
  }, [filterAssigned]);
  // Filtered prospects
  const filteredProspects = prospects.filter(p => {
    if (debouncedFilterStatus && p.status !== debouncedFilterStatus) return false;
    if (debouncedFilterAssigned && p.assigned_user !== debouncedFilterAssigned) return false;
    for (const key of Object.keys(filterCustom)) {
      if (filterCustom[key] && (!p.custom_fields || p.custom_fields[key] !== filterCustom[key])) return false;
    }
    return true;
  });

  // CRUD handlers
  const handleSaveProspect = async (values: any) => {
    setCrudLoading(true);
    const dbValues = {
      ...values,
      assigned_user: values.assignedUser,
      region: values.region,
      prospection_list_id: listId,
    };
    delete dbValues.assignedUser;
    if (editingProspect) {
      const { error } = await supabase.from("prospects").update(dbValues).eq("id", editingProspect.id);
      if (!error) {
        setEditingProspect(null);
        setProspectModalOpen(false);
        fetchProspects();
      }
    } else {
      const { error } = await supabase.from("prospects").insert([dbValues]);
      if (!error) {
        setProspectModalOpen(false);
        fetchProspects();
      }
    }
    setCrudLoading(false);
  };

  const handleDeleteProspect = async () => {
    if (!deleteProspectId) return;
    setCrudLoading(true);
    await supabase.from("prospects").delete().eq("id", deleteProspectId);
    setDeleteProspectId(null);
    fetchProspects();
    setCrudLoading(false);
  };

  // CSV Import Handlers
  function handleCsvFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCsvFile(f);
    setCsvError(null);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setCsvError("Error parsing CSV file");
          return;
        }
        const cols = Object.keys(results.data[0] || {});
        setCsvColumns(cols);
        setCsvRows(results.data as any[]);
        setCsvPreviewRows((results.data as any[]).slice(0, 3));
        setCsvStep(2);
      },
      error: () => setCsvError("Error reading CSV file"),
    });
  }
  function handleCsvMapChange(csvCol: string, sysField: string) {
    setCsvMap(prev => ({ ...prev, [csvCol]: sysField }));
  }
  // In CSV mapping and preview, remove 'status' from the system fields
  function allMapped() {
    return ["name", "email", "phone"].every(f => Object.values(csvMap).includes(f));
  }
  function getMappedRows() {
    return csvPreviewRows.map(row => {
      const mapped: any = {};
      for (const [csvCol, sysField] of Object.entries(csvMap)) {
        mapped[sysField] = row[csvCol];
      }
      return mapped;
    })
  }
  function isValidRow(row: any) {
    return row.name && row.email;
  }
  async function handleCsvImport() {
    setCsvLoading(true);
    setCsvError(null);
    try {
      const mappedRows = csvRows.map(row => {
        const mapped: any = {};
        for (const [csvCol, sysField] of Object.entries(csvMap)) {
          mapped[sysField] = row[csvCol];
        }
        if (!mapped.status) mapped.status = "contacted";
        mapped.prospection_list_id = listId;
        return mapped;
      });
      const { error } = await supabase.from("prospects").insert(mappedRows);
      if (error) throw new Error(error.message);
      setCsvModalOpen(false);
      setCsvStep(1);
      setCsvFile(null);
      setCsvMap({});
      fetchProspects();
    } catch (e: any) {
      setCsvError(e.message);
    } finally {
      setCsvLoading(false);
    }
  }

  return (
    <div className="p-6 md:p-10 bg-muted min-h-screen">
      <div className="flex items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold flex-1">Prospection List</h1>
        <Button onClick={() => { setEditingProspect(null); setProspectModalOpen(true); }}>+ Add Prospect</Button>
      </div>
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <select className="border rounded px-3 py-2" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Status</option>
          <option value="contacted">Contacted</option>
          <option value="follow-up">Follow-up</option>
          <option value="closed">Closed</option>
        </select>
        <select className="border rounded px-3 py-2" value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}>
          <option value="">Assigned User</option>
          {[...new Set(prospects.map(p => p.assigned_user).filter(Boolean))].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        {customFieldKeys.map(key => (
          <input key={key} className="border rounded px-3 py-2" placeholder={key} value={filterCustom[key] || ""} onChange={e => setFilterCustom(f => ({ ...f, [key]: e.target.value }))} />
        ))}
        <Button onClick={() => setCsvModalOpen(true)}>Import CSV</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              {/* Loading skeleton for table */}
              <div className="animate-pulse space-y-4">
                {[...Array(PAGE_SIZE)].map((_, i) => (
                  <div key={i} className="h-6 bg-gray-200 rounded w-full" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              {/* Consider using react-window for virtualization if list grows large */}
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Phone</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Assigned User</th>
                    <th className="px-4 py-2 text-left">Region</th>
                    {customFieldKeys.map(key => (
                      <th key={key} className="px-4 py-2 text-left">{key}</th>
                    ))}
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProspects.map((prospect) => (
                    <tr key={prospect.id} className="border-b hover:bg-muted">
                      <td className="px-4 py-2 font-medium">{prospect.name}</td>
                      <td className="px-4 py-2">{prospect.email}</td>
                      <td className="px-4 py-2">{prospect.phone}</td>
                      <td className="px-4 py-2">{prospect.status}</td>
                      <td className="px-4 py-2">{prospect.assigned_user}</td>
                      <td className="px-4 py-2">{prospect.region}</td>
                      {customFieldKeys.map(key => (
                        <td key={key} className="px-4 py-2">{prospect.custom_fields?.[key] || <span className="text-gray-400">—</span>}</td>
                      ))}
                      <td className="px-4 py-2 space-x-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditingProspect(prospect); setProspectModalOpen(true); }}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteProspectId(prospect.id)}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination Controls */}
              <div className="flex justify-between items-center mt-4">
                <Button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                <span>Page {page} of {Math.ceil(totalCount / PAGE_SIZE)}</span>
                <Button disabled={page >= Math.ceil(totalCount / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={prospectModalOpen} onOpenChange={setProspectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProspect ? "Edit Prospect" : "Add Prospect"}</DialogTitle>
          </DialogHeader>
          <ProspectForm
            initialValues={editingProspect || {}}
            onSave={handleSaveProspect}
            onCancel={() => { setEditingProspect(null); setProspectModalOpen(false); }}
            loading={crudLoading}
          />
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteProspectId} onOpenChange={open => { if (!open) setDeleteProspectId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prospect</AlertDialogTitle>
          </AlertDialogHeader>
          <div>Are you sure you want to delete this prospect?</div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteProspectId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProspect} disabled={crudLoading}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={csvModalOpen} onOpenChange={setCsvModalOpen}>
        <DialogContent className="max-w-xl">
          {csvStep === 1 && (
            <div className="flex flex-col gap-6 p-4">
              <DialogHeader>
                <DialogTitle>Upload a CSV file</DialogTitle>
              </DialogHeader>
              <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-purple-50 transition" onClick={() => document.getElementById('csv-upload')?.click()}>
                <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleCsvFileChange} />
                <span className="text-4xl mb-2">📁</span>
                <span className="text-gray-700">Drop a file or click to browse</span>
                <span className="text-xs text-gray-400 mt-1">File with up to 10,000 rows works best</span>
              </div>
              {csvError && <div className="text-red-500 text-sm">{csvError}</div>}
            </div>
          )}
          {csvStep === 2 && (
            <div className="flex flex-col gap-6 p-4">
              <DialogHeader>
                <DialogTitle>Map properties</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {csvColumns.map(col => (
                  <div key={col} className="flex items-center gap-2">
                    <span className="w-40 text-gray-700">{col}</span>
                    <span className="mx-2">→</span>
                    <select className="border rounded px-2 py-1" value={csvMap[col] || ''} onChange={e => handleCsvMapChange(col, e.target.value)}>
                      <option value="">Don’t import</option>
                      {["name", "email", "phone"].concat(customFieldKeys).map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                    </select>
                    {csvMap[col] && <span className="text-green-500">✓</span>}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={() => setCsvStep(3)} disabled={!allMapped()}>Next</Button>
                <Button variant="outline" onClick={() => setCsvStep(1)}>Back</Button>
              </div>
            </div>
          )}
          {csvStep === 3 && (
            <div className="flex flex-col gap-6 p-4">
              <DialogHeader>
                <DialogTitle>Preview & Validate</DialogTitle>
              </DialogHeader>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm bg-white rounded-xl overflow-hidden border">
                  <thead>
                    <tr>
                      {["name", "email", "phone"].concat(customFieldKeys).map(f => <th key={f} className="p-2">{f.charAt(0).toUpperCase() + f.slice(1)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {getMappedRows().map((row, idx) => (
                      <tr key={idx} className={!isValidRow(row) ? 'bg-red-50' : ''}>
                        {["name", "email", "phone"].concat(customFieldKeys).map(f => <td key={f} className="p-2">{row[f]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvRows.length > 3 && <div className="text-xs text-gray-500 mt-2">...and {csvRows.length - 3} more rows</div>}
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleCsvImport} disabled={getMappedRows().some(row => !isValidRow(row)) || csvLoading}>{csvLoading ? "Importing..." : "Import"}</Button>
                <Button variant="outline" onClick={() => setCsvStep(2)}>Back</Button>
              </div>
              {csvError && <div className="text-red-500 text-sm">{csvError}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 
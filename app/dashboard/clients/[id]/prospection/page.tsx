"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Papa from "papaparse";
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useRef } from 'react';

interface Prospect {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'contacted' | 'follow-up' | 'closed';
}

const STATUS_COLORS = {
  contacted: 'bg-blue-100 text-blue-800',
  'follow-up': 'bg-yellow-100 text-yellow-800',
  closed: 'bg-green-100 text-green-800',
};
const STATUS_LABELS = {
  contacted: 'Contacted',
  'follow-up': 'Follow-up',
  closed: 'Closed',
};

function ImportCSVDialog({ open, onOpenChange, onImport }: { open: boolean, onOpenChange: (v: boolean) => void, onImport: () => void }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<{ [key: string]: string }>({});
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importName, setImportName] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Upload CSV
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error parsing CSV file');
          return;
        }
        const cols = Object.keys(results.data[0] || {});
        setCsvColumns(cols);
        setCsvRows(results.data as any[]);
        setPreviewRows((results.data as any[]).slice(0, 3));
        setStep(2);
      },
      error: () => setError('Error reading CSV file'),
    });
  }

  // Step 2: Map Properties
  const systemFields = ['name', 'email', 'phone', 'status'];
  function handleMapChange(csvCol: string, sysField: string) {
    setColumnMap(prev => ({ ...prev, [csvCol]: sysField }));
  }
  function allMapped() {
    return systemFields.every(f => Object.values(columnMap).includes(f));
  }

  // Step 3: Preview & Validate
  function getMappedRows() {
    return previewRows.map(row => {
      const mapped: any = {};
      for (const [csvCol, sysField] of Object.entries(columnMap)) {
        mapped[sysField] = row[csvCol];
      }
      return mapped;
    });
  }
  function isValidRow(row: any) {
    return row.name && row.email && ['contacted', 'follow-up', 'closed'].includes(row.status || 'contacted');
  }

  // Step 4: Import
  async function handleImport() {
    setLoading(true);
    setError(null);
    try {
      const mappedRows = csvRows.map(row => {
        const mapped: any = {};
        for (const [csvCol, sysField] of Object.entries(columnMap)) {
          mapped[sysField] = row[csvCol];
        }
        if (!mapped.status) mapped.status = 'contacted';
        return mapped;
      });
      const res = await fetch(window.location.pathname + '/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: mappedRows }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to import contacts');
      }
      onImport();
      onOpenChange(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {step === 1 && (
          <div className="flex flex-col gap-6 p-4">
            <DialogHeader>
              <DialogTitle>Upload a CSV file</DialogTitle>
            </DialogHeader>
            <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-purple-50 transition" onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              <span className="text-4xl mb-2">📁</span>
              <span className="text-gray-700">Drop a file or click to browse</span>
              <span className="text-xs text-gray-400 mt-1">File with up to 10,000 rows works best</span>
            </div>
            <a href="/sample.csv" className="text-xs text-blue-600 underline">Download a sample CSV file</a>
            {error && <div className="text-red-500 text-sm">{error}</div>}
          </div>
        )}
        {step === 2 && (
          <div className="flex flex-col gap-6 p-4">
            <DialogHeader>
              <DialogTitle>Map properties</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ scrollbarColor: 'rgba(156,163,175,0.3) rgba(243,244,246,0.2)', scrollbarWidth: 'thin' }}>
              {csvColumns.map(col => (
                <div key={col} className="flex items-center gap-2">
                  <span className="w-40 text-gray-700">{col}</span>
                  <span className="mx-2">→</span>
                  <select className="border rounded px-2 py-1" value={columnMap[col] || ''} onChange={e => handleMapChange(col, e.target.value)}>
                    <option value="">Don’t import</option>
                    {systemFields.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                  </select>
                  {columnMap[col] && <span className="text-green-500">✓</span>}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => setStep(3)} disabled={!allMapped()}>Next</Button>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            </DialogFooter>
          </div>
        )}
        {step === 3 && (
          <div className="flex flex-col gap-6 p-4">
            <DialogHeader>
              <DialogTitle>Preview & Validate</DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm bg-white rounded-xl overflow-hidden border">
                <thead>
                  <tr>
                    {systemFields.map(f => <th key={f} className="p-2">{f.charAt(0).toUpperCase() + f.slice(1)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {getMappedRows().map((row, idx) => (
                    <tr key={idx} className={!isValidRow(row) ? 'bg-red-50' : ''}>
                      {systemFields.map(f => <td key={f} className="p-2">{row[f]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvRows.length > 3 && <div className="text-xs text-gray-500 mt-2">...and {csvRows.length - 3} more rows</div>}
            </div>
            <DialogFooter>
              <Button onClick={() => setStep(4)} disabled={getMappedRows().some(row => !isValidRow(row))}>Next</Button>
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            </DialogFooter>
          </div>
        )}
        {step === 4 && (
          <div className="flex flex-col gap-6 p-4">
            <DialogHeader>
              <DialogTitle>Import contacts</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <div className="flex gap-4">
                <div className="text-2xl font-bold">{csvRows.length}</div>
                <div className="text-gray-600">Contacts will be created</div>
              </div>
              <Input placeholder="Name your import" value={importName} onChange={e => setImportName(e.target.value)} />
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
                I have obtained explicit consent for communication from all contacts
              </label>
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <DialogFooter>
              <Button onClick={handleImport} disabled={!consent || loading}>{loading ? 'Importing...' : 'Import contacts'}</Button>
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ProspectionPage() {
  const { id } = useParams();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkStatus, setBulkStatus] = useState<'contacted' | 'follow-up' | 'closed'>('contacted');
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvPreviewOpen, setCsvPreviewOpen] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Fetch prospects
  useEffect(() => {
    async function fetchProspects() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/clients/${id}/prospects`);
        if (!res.ok) throw new Error("Failed to fetch prospects");
        const data = await res.json();
        setProspects(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchProspects();
  }, [id]);

  // Add or update prospect
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/clients/${id}/prospects/${editing.id}` : `/api/clients/${id}/prospects`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save prospect");
      }
      setForm({ name: "", email: "", phone: "" });
      setFormOpen(false);
      setEditing(null);
      // Refresh
      const refreshed = await fetch(`/api/clients/${id}/prospects`);
      setProspects(await refreshed.json());
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setFormLoading(false);
    }
  }

  // Delete prospect
  async function handleDelete(pid: string) {
    setDeleteId(pid);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}/prospects/${pid}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete prospect");
      // Refresh
      const refreshed = await fetch(`/api/clients/${id}/prospects`);
      setProspects(await refreshed.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleteId(null);
      setDeleteLoading(false);
    }
  }

  function openEdit(p: Prospect) {
    setEditing(p);
    setForm({ name: p.name, email: p.email, phone: p.phone });
    setFormOpen(true);
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: "", email: "", phone: "" });
    setFormOpen(true);
  }

  // Inline status update
  async function handleStatusChange(pid: string, status: 'contacted' | 'follow-up' | 'closed') {
    try {
      await fetch(`/api/clients/${id}/prospects`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [pid], status }),
      });
      // Refresh
      const refreshed = await fetch(`/api/clients/${id}/prospects`);
      setProspects(await refreshed.json());
    } catch (e) {
      setError('Failed to update status');
    }
  }

  // Bulk actions
  async function handleBulkAction() {
    if (bulkAction === 'delete') {
      await fetch(`/api/clients/${id}/prospects`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected }),
      });
    } else if (bulkAction === 'status') {
      await fetch(`/api/clients/${id}/prospects`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected, status: bulkStatus }),
      });
    }
    setBulkDialogOpen(false);
    setSelected([]);
    // Refresh
    const refreshed = await fetch(`/api/clients/${id}/prospects`);
    setProspects(await refreshed.json());
  }

  // CSV preview and validation
  async function handleCSVUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    setCsvError(null);
    setCsvSuccess(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setCsvError('Error parsing CSV file');
          setCsvLoading(false);
          return;
        }
        const preview = (results.data as any[]).map((row, i) => ({
          name: row.name || row.Name || '',
          email: row.email || row.Email || '',
          phone: row.phone || row.Phone || '',
          status: (row.status || row.Status || 'contacted') as 'contacted' | 'follow-up' | 'closed',
          _row: i + 1,
        }));
        setCsvPreview(preview);
        setCsvPreviewOpen(true);
        setCsvLoading(false);
      },
      error: () => {
        setCsvError('Error reading CSV file');
        setCsvLoading(false);
      },
    });
  }

  function handleCsvPreviewChange(idx: number, field: string, value: string) {
    setCsvPreview(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }

  async function handleCsvPreviewSubmit() {
    const valid = csvPreview.every(row => row.name && row.email && ['contacted', 'follow-up', 'closed'].includes(row.status));
    if (!valid) {
      setCsvError('Please fix all errors before uploading.');
      return;
    }
    setCsvLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}/prospects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: csvPreview }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to upload contacts');
      }
      setCsvSuccess(`Successfully uploaded ${csvPreview.length} contacts.`);
      setCsvPreviewOpen(false);
      setCsvPreview([]);
      if (csvInputRef.current) csvInputRef.current.value = '';
      // Refresh
      const refreshed = await fetch(`/api/clients/${id}/prospects`);
      setProspects(await refreshed.json());
    } catch (e: any) {
      setCsvError(e.message);
    } finally {
      setCsvLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Prospection Contacts</h1>
      <div className="mb-4 flex gap-2 items-center">
        <Button onClick={openAdd}>+ Add Prospect</Button>
        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>Import CSV</Button>
        {selected.length > 0 && (
          <>
            <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>Bulk Actions</Button>
            <span className="text-gray-500">{selected.length} selected</span>
          </>
        )}
        {csvLoading && <span className="ml-2 text-blue-600">Uploading...</span>}
        {csvError && <span className="ml-2 text-red-600">{csvError}</span>}
        {csvSuccess && <span className="ml-2 text-green-600">{csvSuccess}</span>}
      </div>
      {loading ? (
        <div className="py-8 text-center">Loading contacts...</div>
      ) : error ? (
        <div className="text-red-500 flex flex-col items-center gap-2">
          Failed to fetch prospects
          <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      ) : prospects.length === 0 ? (
        <div>No contacts found.</div>
      ) : (
        <table className="min-w-full text-sm bg-white rounded-xl overflow-hidden border">
          <thead>
            <tr>
              <th className="p-2"><Checkbox checked={selected.length === prospects.length} onCheckedChange={(checked: boolean) => setSelected(checked ? prospects.map(p => p.id) : [])} /></th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Phone</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p, idx) => (
              <tr key={p.id} className="border-t">
                <td className="p-2"><Checkbox checked={selected.includes(p.id)} onCheckedChange={(checked: boolean) => setSelected(checked ? [...selected, p.id] : selected.filter(id => id !== p.id))} /></td>
                <td className="p-2">{p.name}</td>
                <td className="p-2">{p.email}</td>
                <td className="p-2">{p.phone}</td>
                <td className="p-2">
                  <Badge className={STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                  <Select value={p.status} onValueChange={val => handleStatusChange(p.id, val as any)}>
                    <option value="contacted">Contacted</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="closed">Closed</option>
                  </Select>
                </td>
                <td className="p-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)} disabled={deleteId === p.id && deleteLoading}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Bulk Action Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <select className="border rounded px-2 py-1" value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
              <option value="">Select Action</option>
              <option value="status">Change Status</option>
              <option value="delete">Delete</option>
            </select>
            {bulkAction === 'status' && (
              <select className="border rounded px-2 py-1" value={bulkStatus} onChange={e => setBulkStatus(e.target.value as any)}>
                <option value="contacted">Contacted</option>
                <option value="follow-up">Follow-up</option>
                <option value="closed">Closed</option>
              </select>
            )}
            <DialogFooter>
              <Button onClick={handleBulkAction}>Apply</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      {/* CSV Preview Dialog */}
      <Dialog open={csvPreviewOpen} onOpenChange={setCsvPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>CSV Preview & Validation</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm bg-white rounded-xl overflow-hidden border">
              <thead>
                <tr>
                  <th className="p-2">Row</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Phone</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {csvPreview.slice(0, 3).map((row, idx) => {
                  const invalid = !row.name || !row.email || !['contacted', 'follow-up', 'closed'].includes(row.status);
                  return (
                    <tr key={idx} className={invalid ? 'bg-red-50' : ''}>
                      <td className="p-2">{row._row}</td>
                      <td className="p-2"><Input value={row.name} onChange={e => handleCsvPreviewChange(idx, 'name', e.target.value)} /></td>
                      <td className="p-2"><Input value={row.email} onChange={e => handleCsvPreviewChange(idx, 'email', e.target.value)} /></td>
                      <td className="p-2"><Input value={row.phone} onChange={e => handleCsvPreviewChange(idx, 'phone', e.target.value)} /></td>
                      <td className="p-2">
                        <select className="border rounded px-2 py-1" value={row.status} onChange={e => handleCsvPreviewChange(idx, 'status', e.target.value)}>
                          <option value="contacted">Contacted</option>
                          <option value="follow-up">Follow-up</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {csvPreview.length > 3 && (
              <div className="text-xs text-gray-500 mt-2">...and {csvPreview.length - 3} more rows</div>
            )}
          </div>
          {csvError && <div className="text-red-500 mt-2">{csvError}</div>}
          <DialogFooter>
            <Button onClick={handleCsvPreviewSubmit} disabled={csvLoading}>Upload</Button>
            <Button variant="outline" onClick={() => setCsvPreviewOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add/Edit Dialog */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">{editing ? "Edit Prospect" : "Add Prospect"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <Input
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
              <Input
                placeholder="Phone"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                required
              />
              {formError && <div className="text-red-500">{formError}</div>}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button>
                <Button type="submit" disabled={formLoading}>{formLoading ? (editing ? "Saving..." : "Adding...") : (editing ? "Save" : "Add")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ImportCSVDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} onImport={() => { /* refresh prospects here */ window.location.reload(); }} />
    </div>
  );
} 
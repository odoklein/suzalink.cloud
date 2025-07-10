"use client";
import React, { useState, useEffect } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

type Client = { id: string; name: string; company?: string; contact_email?: string };
type Service = { title: string; quantity: number; unitPrice: number };

export default function FacturesPage() {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [services, setServices] = useState<Service[]>([
    { title: "", quantity: 1, unitPrice: 0 }
  ]);
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [factures, setFactures] = useState<any[]>([]);
  const [facturesLoading, setFacturesLoading] = useState(false);

  useEffect(() => {
    async function fetchClients() {
      setClientsLoading(true);
      setClientsError(null);
      try {
        const res = await fetch("/api/clients");
        if (!res.ok) throw new Error("Failed to fetch clients");
        const data = await res.json();
        setClients(
          data.map((c: any) => ({
            id: c.id,
            name: c.name,
            company: c.company,
            contact_email: c.contact_email,
          }))
        );
      } catch (e: any) {
        setClientsError(e.message);
      } finally {
        setClientsLoading(false);
      }
    }
    fetchClients();
  }, []);

  const handleServiceChange = (idx: number, field: keyof Service, value: string | number) => {
    setServices(services =>
      services.map((s, i) =>
        i === idx ? { ...s, [field]: field === "quantity" || field === "unitPrice" ? Number(value) : value } : s
      )
    );
  };

  const addService = () => setServices([...services, { title: "", quantity: 1, unitPrice: 0 }]);
  const removeService = (idx: number) => setServices(services => services.filter((_, i) => i !== idx));

  const subtotal = services.reduce((sum, s) => sum + (s.quantity * s.unitPrice), 0);
  const total = subtotal; // Add taxes/discounts if needed

  // Fetch factures on mount and after save
  const fetchFactures = async () => {
    setFacturesLoading(true);
    const { data, error } = await supabase
      .from("factures")
      .select("id, client_id, services, date, subtotal, total, invoice_number")
      .order("date", { ascending: false });
    if (!error && data) setFactures(data);
    setFacturesLoading(false);
  };

  useEffect(() => {
    fetchFactures();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("factures").insert([
      {
        client_id: selectedClient,
        services,
        date,
        subtotal,
        total,
        invoice_number: invoiceNumber,
      }
    ]);
    setSaving(false);
    if (!error) {
      setOpen(false);
      fetchFactures();
    }
    // TODO: show toast/notification
  };

  const handleDownloadPDF = async () => {
    const templateUrl = "/A4 - 1.pdf";
    const existingPdfBytes = await fetch(templateUrl).then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.getPages()[0];

    // Get selected client details
    const client = clients.find(c => c.id === selectedClient);
    const clientName = client?.name || "";

    // Overwrite the client box (top right, adjust x/y as needed)
    page.drawRectangle({ x: 370, y: 710, width: 180, height: 45, color: rgb(1, 1, 1) }); // white out the box
    page.drawText(clientName, { x: 400, y: 735, size: 13, font: helveticaFont, color: rgb(0,0,0) });

    // Overwrite the invoice number box (left of client box)
    page.drawRectangle({ x: 120, y: 690, width: 120, height: 30, color: rgb(1, 1, 1) });
    page.drawText(invoiceNumber, { x: 130, y: 705, size: 12, font: helveticaFont, color: rgb(0,0,0) });

    // Overwrite the date area (adjust x/y as needed)
    page.drawRectangle({ x: 65, y: 670, width: 200, height: 20, color: rgb(1, 1, 1) }); // white out the old text
    page.drawText(date, { x: 70, y: 675, size: 12, font: helveticaFont, color: rgb(0,0,0) });

    // Draw pricing table in the center white area
    // Table layout
    const tableX = 80; // left margin of the table (centered in white area)
    const tableY = 570; // start y (top of table)
    const colTitle = tableX;
    const colQty = tableX + 200;
    const colUnit = tableX + 260;
    const colTotal = tableX + 340;
    const rowHeight = 28;
    // Table headers
    page.drawText("Service", { x: colTitle, y: tableY, size: 12, font: helveticaFont, color: rgb(0,0,0) });
    page.drawText("Qty", { x: colQty, y: tableY, size: 12, font: helveticaFont, color: rgb(0,0,0) });
    page.drawText("Unit Price", { x: colUnit, y: tableY, size: 12, font: helveticaFont, color: rgb(0,0,0) });
    page.drawText("Total", { x: colTotal, y: tableY, size: 12, font: helveticaFont, color: rgb(0,0,0) });
    // Table rows
    services.forEach((s, i) => {
      const y = tableY - (i + 1) * rowHeight;
      page.drawText(s.title, { x: colTitle, y, size: 11, font: helveticaFont, color: rgb(0,0,0) });
      page.drawText(String(s.quantity), { x: colQty, y, size: 11, font: helveticaFont, color: rgb(0,0,0) });
      page.drawText(String(s.unitPrice), { x: colUnit, y, size: 11, font: helveticaFont, color: rgb(0,0,0) });
      page.drawText((s.quantity * s.unitPrice).toFixed(2), { x: colTotal, y, size: 11, font: helveticaFont, color: rgb(0,0,0) });
    });
    // Subtotal and total below the table
    const summaryY = tableY - (services.length + 1) * rowHeight;
    page.drawText(`Subtotal: ${subtotal.toFixed(2)}`, { x: colTotal, y: summaryY, size: 12, font: helveticaFont, color: rgb(0,0,0) });
    page.drawText(`Total: ${total.toFixed(2)}`, { x: colTotal, y: summaryY - 20, size: 13, font: helveticaFont, color: rgb(0,0,0) });
    // Download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `facture_${date}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mock factures data
  const mockFactures = [
    {
      id: "1",
      client: "Acme Corp",
      date: "2024-06-01",
      total: 1200.5,
      services: [
        { title: "Consulting", quantity: 2, unitPrice: 500 },
        { title: "Hosting", quantity: 1, unitPrice: 200.5 },
      ],
    },
    {
      id: "2",
      client: "Beta LLC",
      date: "2024-06-03",
      total: 800,
      services: [
        { title: "Design", quantity: 4, unitPrice: 200 },
      ],
    },
  ];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Factures</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>+ New Facture</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl w-full">
            <DialogTitle>New Facture</DialogTitle>
            <DialogDescription>Fill in the invoice details below.</DialogDescription>
            <form className="space-y-6" onSubmit={e => { e.preventDefault(); handleSave(); }}>
              <div className="flex flex-col gap-2">
                <Label>Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient} required>
                  <SelectTrigger>
                    <SelectValue placeholder={clientsLoading ? "Loading..." : clientsError ? clientsError : "Select client"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsLoading ? (
                      <div className="flex items-center gap-2 p-2 text-gray-500"><Loader2 className="animate-spin w-4 h-4" /> Loading...</div>
                    ) : clientsError ? (
                      <div className="p-2 text-red-500">{clientsError}</div>
                    ) : clients.length === 0 ? (
                      <div className="p-2 text-gray-500">No clients found</div>
                    ) : (
                      clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Invoice Number</Label>
                <Input
                  type="text"
                  placeholder="Enter invoice number"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                />
              </div>
              <div className="border rounded p-4 bg-muted">
                <div className="font-semibold mb-2">Services</div>
                {services.map((service, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-2">
                    <Input
                      placeholder="Title"
                      value={service.title}
                      onChange={e => handleServiceChange(idx, "title", e.target.value)}
                      className="w-1/3"
                      required
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={service.quantity}
                      onChange={e => handleServiceChange(idx, "quantity", e.target.value)}
                      className="w-1/6"
                      required
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Unit Price"
                      value={service.unitPrice}
                      onChange={e => handleServiceChange(idx, "unitPrice", e.target.value)}
                      className="w-1/4"
                      required
                    />
                    <span className="w-1/6 text-right">{(service.quantity * service.unitPrice).toFixed(2)}</span>
                    {services.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeService(idx)}>
                        &times;
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addService} className="mt-2">+ Add Service</Button>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-8 text-lg">
                  <span>Subtotal:</span>
                  <span className="font-mono">{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex gap-8 text-xl font-bold">
                  <span>Total:</span>
                  <span className="font-mono">{total.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <Button type="submit" disabled={saving}>Save</Button>
                <Button type="button" variant="secondary">Send to Email</Button>
                <Button type="button" variant="outline" onClick={handleDownloadPDF}>Download PDF</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {/* List of factures can go here */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">Factures List</h2>
        {facturesLoading ? (
          <div className="text-gray-500">Loading...</div>
        ) : factures.length === 0 ? (
          <div className="text-muted-foreground">No factures yet.</div>
        ) : (
          <div className="space-y-4">
            {factures.map(f => {
              const client = clients.find(c => c.id === f.client_id);
              return (
                <div key={f.id} className="border rounded-lg p-4 bg-white shadow flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="font-bold text-lg">{f.invoice_number || "No Number"}</div>
                    <div className="text-gray-500 text-sm">Client: {client ? client.name : f.client_id}</div>
                    <div className="text-gray-500 text-sm">Date: {f.date?.slice(0, 10)}</div>
                  </div>
                  <div className="text-xl font-mono font-bold">{f.total?.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 
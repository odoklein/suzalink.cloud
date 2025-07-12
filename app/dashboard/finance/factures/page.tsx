"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

const currencyOptions = [
  { value: "USD", label: "US Dollar" },
  { value: "EUR", label: "Euro" },
  { value: "GBP", label: "British Pound" },
];

export default function FacturesPage() {
  const [form, setForm] = useState({
    client: "",
    address: "",
    invoiceNumber: "",
    currency: "USD",
    issuedDate: "",
    dueDate: "",
    items: [
      { name: "", qty: 1, cost: 0 }
    ],
    tax: 0,
    discount: 0,
    notes: ""
  });
  const [clients, setClients] = useState<{ id: string; name: string; contact_email: string }[]>([]);
  const [clientSearch, setClientSearch] = useState("");

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch("/api/clients");
        if (!res.ok) throw new Error("Failed to fetch clients");
        const { data } = await res.json();
        setClients((data || []).map((c: any) => ({ id: c.id, name: c.name, contact_email: c.contact_email })));
      } catch (e) {
        setClients([]);
      }
    }
    fetchClients();
  }, []);

  // Handlers for form changes
  const handleItemChange = (idx: number, field: string, value: string | number) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) =>
        i === idx ? { ...item, [field]: field === "qty" || field === "cost" ? Number(value) : value } : item
      )
    }));
  };
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { name: "", qty: 1, cost: 0 }] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const subtotal = form.items.reduce((sum, item) => sum + item.qty * item.cost, 0);
  const taxAmount = subtotal * (form.tax / 100);
  const total = subtotal + taxAmount - form.discount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {/* Invoice Form */}
      <Card className="p-4">
        <CardHeader className="mb-4">Invoice details</CardHeader>
        <CardContent>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Bill to</label>
            <Select value={form.client} onValueChange={val => {
              const client = clients.find(c => c.id === val);
              setForm(f => ({
                ...f,
                client: client ? client.id : "",
                address: client ? client.contact_email : ""
              }));
            }}>
              <SelectTrigger className="mb-2">
                <SelectValue placeholder="Search or select client" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="mb-2"
                  />
                </div>
                {clients.filter(c =>
                  c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                  c.contact_email.toLowerCase().includes(clientSearch.toLowerCase())
                ).map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-gray-500">{c.contact_email}</span>
                    </div>
                  </SelectItem>
                ))}
                {clients.length === 0 && (
                  <div className="p-2 text-gray-400">No clients found</div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Invoice Number"
              value={form.invoiceNumber}
              onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
            />
            <Select value={form.currency} onValueChange={val => setForm(f => ({ ...f, currency: val }))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 mb-4">
            <Input
              type="date"
              placeholder="Issued Date"
              value={form.issuedDate}
              onChange={e => setForm(f => ({ ...f, issuedDate: e.target.value }))}
            />
            <Input
              type="date"
              placeholder="Due Date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
            />
          </div>
          <div className="mb-4">
            <div className="font-semibold mb-2">Items details</div>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-4 gap-2 p-2 bg-muted text-xs font-medium">
                <div>Item</div>
                <div>QTY</div>
                <div>Cost</div>
                <div>Total</div>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 p-2 border-t items-center">
                  <Input
                    placeholder="Item name"
                    value={item.name}
                    onChange={e => handleItemChange(idx, "name", e.target.value)}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={e => handleItemChange(idx, "qty", e.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={item.cost}
                    onChange={e => handleItemChange(idx, "cost", e.target.value)}
                  />
                  <div className="text-right font-mono">{(item.qty * item.cost).toLocaleString()}</div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} disabled={form.items.length === 1}>
                    <span className="text-red-500">&times;</span>
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" className="mt-2" onClick={addItem}>+ Add item</Button>
          </div>
          <div className="flex gap-2 mb-4">
            <Input
              type="number"
              min={0}
              placeholder="Tax %"
              value={form.tax}
              onChange={e => setForm(f => ({ ...f, tax: Number(e.target.value) }))}
            />
            <Input
              type="number"
              min={0}
              placeholder="Discount"
              value={form.discount}
              onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) }))}
            />
          </div>
          <Input
            placeholder="Notes"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="mb-2"
          />
        </CardContent>
      </Card>
      {/* Invoice Preview */}
      <Card className="p-4">
        <CardHeader className="mb-4">Preview</CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="text-2xl font-bold mb-2">Invoice</div>
            <div className="flex justify-between text-sm mb-2">
              <div>
                <div className="font-medium">Invoice Number</div>
                <div>#{form.invoiceNumber || "---"}</div>
              </div>
              <div>
                <div className="font-medium">Billed to</div>
                <div>{form.client || "---"}</div>
                <div className="text-xs text-gray-500">{form.address || "---"}</div>
              </div>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <div>
                <div className="font-medium">Issued</div>
                <div>{form.issuedDate || "---"}</div>
              </div>
              <div>
                <div className="font-medium">Due</div>
                <div>{form.dueDate || "---"}</div>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <div className="font-semibold mb-2">Items</div>
            <div className="grid grid-cols-4 gap-2 text-xs font-medium bg-muted p-2 rounded">
              <div>Item</div>
              <div>QTY</div>
              <div>Rate</div>
              <div>Total</div>
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 p-2 border-b last:border-b-0 items-center">
                <div>{item.name || <span className="text-gray-400">---</span>}</div>
                <div>{item.qty}</div>
                <div>{item.cost.toLocaleString()}</div>
                <div>{(item.qty * item.cost).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-end gap-1 mb-2">
            <div className="flex gap-8 text-lg">
              <span>Subtotal:</span>
              <span className="font-mono">{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex gap-8 text-lg">
              <span>Tax:</span>
              <span className="font-mono">{taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex gap-8 text-lg">
              <span>Discount:</span>
              <span className="font-mono">{form.discount.toLocaleString()}</span>
            </div>
            <div className="flex gap-8 text-xl font-bold">
              <span>Total:</span>
              <span className="font-mono">{total.toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="font-medium mb-1">Notes:</div>
            <div className="text-gray-600 text-sm whitespace-pre-line">{form.notes || "---"}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import InvoiceForm from '../../components/InvoiceForm';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  client_id: string;
  issue_date: string;
  due_date: string;
  currency: string;
  exchange_rate: number;
  notes?: string;
  signature?: string;
  invoice_items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    amount: number;
  }>;
}

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchInvoice();
    }
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data.invoice);
      } else if (response.status === 404) {
        toast.error('Invoice not found');
        router.push('/dashboard/invoices');
      } else {
        toast.error('Failed to load invoice');
        router.push('/dashboard/invoices');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice');
      router.push('/dashboard/invoices');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Invoice not found</p>
      </div>
    );
  }

  // Transform invoice data for the form
  const formData = {
    client_id: invoice.client_id,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    currency: invoice.currency,
    exchange_rate: invoice.exchange_rate,
    notes: invoice.notes || '',
    signature: invoice.signature || '',
    items: invoice.invoice_items.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate,
      amount: item.amount
    }))
  };

  return (
    <InvoiceForm
      invoiceId={params.id as string}
      initialData={formData}
    />
  );
}

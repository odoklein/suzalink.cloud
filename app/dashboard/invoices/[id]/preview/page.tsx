'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InvoiceTemplate from '../../components/InvoiceTemplate';
import { toast } from 'sonner';

interface InvoiceData {
  invoice: {
    id: string;
    invoice_number: string;
    issue_date: string;
    due_date: string;
    currency: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    notes?: string;
    signature?: string;
    clients: {
      name: string;
      company?: string;
      contact_email: string;
      phone?: string;
      address?: string;
    };
    invoice_items: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      tax_rate: number;
      amount: number;
    }>;
  };
  company: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    logo?: string;
  };
  settings: any;
  template?: any;
}

export default function InvoicePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchPreviewData();
    }
  }, [params.id]);

  const fetchPreviewData = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}/preview`);
      if (response.ok) {
        const previewData = await response.json();
        setData(previewData);
      } else {
        toast.error('Failed to load invoice preview');
        router.push('/dashboard/invoices');
      }
    } catch (error) {
      console.error('Error fetching preview data:', error);
      toast.error('Failed to load invoice preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!data) return;
    window.open(`/api/invoices/${data.invoice.id}/pdf`, '_blank');
  };

  const handleSendInvoice = () => {
    if (!data) return;
    router.push(`/dashboard/invoices/${data.invoice.id}/send`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Preview not available</p>
        <Button onClick={() => router.push('/dashboard/invoices')} className="mt-4">
          Back to Invoices
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/invoices/${params.id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoice
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Invoice Preview - {data.invoice.invoice_number}
            </h1>
            <p className="text-muted-foreground">
              Preview how your invoice will look to clients
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          {data.invoice.status === 'draft' && (
            <Button onClick={handleSendInvoice}>
              <Send className="mr-2 h-4 w-4" />
              Send Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Preview Container */}
      <div className="bg-gray-100 p-8 rounded-lg">
        <div className="bg-white shadow-lg max-w-4xl mx-auto">
          <InvoiceTemplate
            invoice={data.invoice}
            company={data.company}
            template={data.template}
          />
        </div>
      </div>

      {/* Print Styles Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">💡 Print & PDF Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use your browser's print function (Ctrl+P) for the best results</li>
          <li>• Set margins to "None" or "Minimum" for professional appearance</li>
          <li>• The PDF download uses optimized formatting for professional documents</li>
          <li>• Letter/A4 paper size is automatically configured</li>
        </ul>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Mail, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import InvoiceEmailTemplate from '../../components/InvoiceEmailTemplate';

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  currency: string;
  clients: {
    name: string;
    contact_email: string;
  };
}

interface EmailConfig {
  id: string;
  emailAddress: string;
  displayName: string;
  isActive: boolean;
}

export default function SendInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([]);

  const [formData, setFormData] = useState({
    email_config_id: '',
    subject: '',
    message: '',
    include_pdf: true
  });

  useEffect(() => {
    if (params.id) {
      fetchInvoice();
      fetchEmailConfigs();
    }
  }, [params.id]);

  useEffect(() => {
    if (invoice) {
      // Set default subject and message
      setFormData(prev => ({
        ...prev,
        subject: prev.subject || `Invoice ${invoice.invoice_number}`,
        message: prev.message || generateDefaultMessage(invoice)
      }));
    }
  }, [invoice]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data.invoice);

        if (data.invoice.status !== 'draft') {
          toast.error('This invoice has already been sent');
          router.push(`/dashboard/invoices/${params.id}`);
        }
      } else {
        toast.error('Failed to load invoice');
        router.push('/dashboard/invoices');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice');
      router.push('/dashboard/invoices');
    }
  };

  const fetchEmailConfigs = async () => {
    try {
      const response = await fetch('/api/emails/config');
      if (response.ok) {
        const data = await response.json();
        setEmailConfigs(data);

        // Auto-select first active config
        const activeConfig = data.find((config: EmailConfig) => config.isActive);
        if (activeConfig && !formData.email_config_id) {
          setFormData(prev => ({ ...prev, email_config_id: activeConfig.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching email configs:', error);
    }
  };

  const generateDefaultMessage = (invoice: Invoice) => {
    return `Dear ${invoice.clients.name},

Please find attached invoice ${invoice.invoice_number} for ${invoice.currency} ${invoice.total_amount.toFixed(2)}.

Due date: ${new Date().toLocaleDateString()}

If you have any questions, please don't hesitate to contact us.

Best regards,
Your Company Name`;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/invoices/${params.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Invoice sent successfully!');
        router.push(`/dashboard/invoices/${params.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Failed to send invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    window.open(`/api/invoices/${params.id}/preview`, '_blank');
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading invoice...</p>
        </div>
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
              Send Invoice {invoice.invoice_number}
            </h1>
            <p className="text-muted-foreground">
              Send this invoice to your client via email
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
        </div>
      </div>

      {/* Invoice Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Client</p>
              <p className="font-medium">{invoice.clients.name}</p>
              <p className="text-sm text-muted-foreground">{invoice.clients.contact_email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="font-medium text-lg">
                {formatCurrency(invoice.total_amount, invoice.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="secondary">{invoice.status}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Send Form with Preview */}
      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="compose">Compose Email</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6">
          <form onSubmit={handleSend} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="mr-2 h-4 w-4" />
                  Email Configuration
                </CardTitle>
                <CardDescription>
                  Choose which email account to send from
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email_config">From Email *</Label>
                  <Select
                    value={formData.email_config_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, email_config_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select email account" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailConfigs.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          {config.displayName} ({config.emailAddress})
                          {!config.isActive && ' - Inactive'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {emailConfigs.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No email configurations found. Please set up an email account first.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  Email Content
                </CardTitle>
                <CardDescription>
                  Customize the email subject and message
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Invoice subject"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Email message"
                    rows={8}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_pdf"
                    checked={formData.include_pdf}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, include_pdf: checked as boolean }))
                    }
                  />
                  <Label htmlFor="include_pdf">Attach PDF invoice</Label>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/invoices/${params.id}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !formData.email_config_id}>
                <Send className="mr-2 h-4 w-4" />
                {loading ? 'Sending...' : 'Send Invoice'}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Preview</CardTitle>
              <CardDescription>
                This is how your email will appear to the recipient
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Subject:</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded">{formData.subject}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">From:</Label>
                  <p className="text-sm">
                    {emailConfigs.find(config => config.id === formData.email_config_id)?.displayName ||
                     'Select an email account'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">To:</Label>
                  <p className="text-sm">{invoice?.clients.contact_email}</p>
                </div>

                <Separator />

                <div className="bg-gray-50 p-4 rounded-lg">
                  <InvoiceEmailTemplate
                    invoice={{
                      invoice_number: invoice?.invoice_number || '',
                      total_amount: invoice?.total_amount || 0,
                      currency: invoice?.currency || 'USD',
                      due_date: invoice?.due_date || '',
                      clients: {
                        name: invoice?.clients.name || ''
                      }
                    }}
                    customMessage={formData.message}
                  />
                </div>

                {formData.include_pdf && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      📎 PDF invoice will be attached to this email
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

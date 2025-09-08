'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, FileText, Mail, CreditCard, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import InvoicePreview from '../components/InvoicePreview';
import SignaturePad from '../components/SignaturePad';

interface Client {
  id: string;
  name: string;
  company?: string;
  contact_email: string;
  phone?: string;
  address?: string;
}

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
}

interface InvoiceFormData {
  client_id: string;
  issue_date: string;
  due_date: string;
  currency: string;
  exchange_rate: number;
  notes: string;
  signature: string;
  signature_name: string;
  items: InvoiceItem[];
  // Company details
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  company_website: string;
  company_abn: string;
  // Project details
  project_name: string;
  // Payment details
  payment_method: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  bsb_code: string;
  // Email details
  email_subject: string;
  email_message: string;
}

interface CollapsibleSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<any>({});

  const [formData, setFormData] = useState<InvoiceFormData>({
    client_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'USD',
    exchange_rate: 1.0,
    notes: 'Note: GST will be paid by me, Tony Stark.',
    signature: '',
    signature_name: 'Washim Chowdhury',
    items: [
      {
        description: 'Web & App Design',
        quantity: 1,
        unit_price: 2500,
        tax_rate: 0,
        amount: 2500
      },
      {
        description: 'Logo Design',
        quantity: 1,
        unit_price: 500,
        tax_rate: 0,
        amount: 500
      }
    ],
    company_name: 'Washim Chowdhory',
    company_email: 'washim@gmail.com',
    company_phone: '+88 01725 214 992',
    company_address: 'Zindabazar, Sylhet, Bangladesh',
    company_website: 'washim.com',
    company_abn: '12345',
    project_name: 'Filllo Product Design',
    payment_method: 'EFT Bank Transfer',
    bank_name: '',
    account_name: 'Washim Chowdhury',
    account_number: '991188343445123',
    bsb_code: '123456',
    email_subject: 'Invoice #{INVOICE_NUMBER}',
    email_message: 'Please find attached your invoice for the services provided.'
  });

  const [sections, setSections] = useState<CollapsibleSection[]>([
    { id: 'my-details', title: 'Mes détails', icon: <FileText className="h-4 w-4" />, isOpen: true },
    { id: 'client-details', title: 'Détails du client', icon: <FileText className="h-4 w-4" />, isOpen: true },
    { id: 'invoice-details', title: 'Détails de la facture', icon: <FileText className="h-4 w-4" />, isOpen: true },
    { id: 'payment-details', title: 'Détails de paiement', icon: <CreditCard className="h-4 w-4" />, isOpen: false },
    { id: 'add-notes', title: 'Ajouter des notes', icon: <FileText className="h-4 w-4" />, isOpen: true },
    { id: 'add-signature', title: 'Ajouter une signature', icon: <FileText className="h-4 w-4" />, isOpen: false },
    { id: 'email-details', title: 'Détails de l\'email', icon: <Mail className="h-4 w-4" />, isOpen: false },
  ]);

  useEffect(() => {
    fetchClients();
    fetchSettings();
  }, []);

  // Auto-sync signature name with company name
  useEffect(() => {
    if (formData.company_name && !formData.signature_name) {
      setFormData(prev => ({ ...prev, signature_name: prev.company_name }));
    }
  }, [formData.company_name, formData.signature_name]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/invoices/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || {});
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const toggleSection = (sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, isOpen: !section.isOpen }
        : section
    ));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate amount
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unit_price;
    }

    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: '',
          quantity: 1,
          unit_price: 0,
          tax_rate: 0,
          amount: 0
        }
      ]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = formData.items.reduce((sum, item) => {
      return sum + (item.amount * (item.tax_rate / 100));
    }, 0);
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const totals = calculateTotals();
      const submitData = {
        ...formData,
        ...totals
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Invoice created successfully');
        router.push(`/dashboard/invoices/${data.invoice.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save invoice');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Form */}
      <div className="w-1/2 overflow-y-auto bg-white border-r border-gray-200">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Invoices
            </Button>
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">Créer une nouvelle facture</h1>
            <p className="text-gray-600 mt-1">Remplissez les détails de la facture</p>
          </div>

          {/* Info Note */}
          <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              Vous pouvez sauvegarder une facture incomplète comme brouillon et la terminer plus tard.
            </p>
          </div>

          {/* Collapsible Sections */}
          <div className="space-y-4">
            {/* My Details Section */}
            <Card>
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection('my-details')}
              >
                <div className="flex items-center space-x-3">
                  {sections.find(s => s.id === 'my-details')?.isOpen ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Mes détails</span>
                </div>
              </div>
              {sections.find(s => s.id === 'my-details')?.isOpen && (
                <CardContent className="pt-0 space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Nom de l'entreprise</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                        placeholder="Nom de votre entreprise"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company_email">Email</Label>
                        <Input
                          id="company_email"
                          type="email"
                          value={formData.company_email}
                          onChange={(e) => setFormData(prev => ({ ...prev, company_email: e.target.value }))}
                          placeholder="your@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company_phone">Téléphone</Label>
                        <Input
                          id="company_phone"
                          value={formData.company_phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, company_phone: e.target.value }))}
                          placeholder="+33 1 23 45 67 89"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_address">Adresse</Label>
                      <Textarea
                        id="company_address"
                        value={formData.company_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, company_address: e.target.value }))}
                        placeholder="Adresse de votre entreprise"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company_website">Site web</Label>
                        <Input
                          id="company_website"
                          value={formData.company_website}
                          onChange={(e) => setFormData(prev => ({ ...prev, company_website: e.target.value }))}
                          placeholder="votresite.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company_abn">SIRET/TVA</Label>
                        <Input
                          id="company_abn"
                          value={formData.company_abn}
                          onChange={(e) => setFormData(prev => ({ ...prev, company_abn: e.target.value }))}
                          placeholder="123456789"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Client Details Section */}
            <Card>
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection('client-details')}
              >
                <div className="flex items-center space-x-3">
                  {sections.find(s => s.id === 'client-details')?.isOpen ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Détails du client</span>
                </div>
              </div>
              {sections.find(s => s.id === 'client-details')?.isOpen && (
                <CardContent className="pt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_id">Sélectionner un client *</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} {client.company && `(${client.company})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Invoice Details Section */}
            <Card>
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection('invoice-details')}
              >
                <div className="flex items-center space-x-3">
                  {sections.find(s => s.id === 'invoice-details')?.isOpen ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Détails de la facture</span>
                </div>
              </div>
              {sections.find(s => s.id === 'invoice-details')?.isOpen && (
                <CardContent className="pt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="project_name">Nom du projet</Label>
                    <Input
                      id="project_name"
                      value={formData.project_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, project_name: e.target.value }))}
                      placeholder="Nom du projet"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="issue_date">Date d'émission *</Label>
                      <Input
                        id="issue_date"
                        type="date"
                        value={formData.issue_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due_date">Date d'échéance *</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Devise</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - Dollar américain</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - Livre sterling</SelectItem>
                        <SelectItem value="CAD">CAD - Dollar canadien</SelectItem>
                        <SelectItem value="AUD">AUD - Dollar australien</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Invoice Items */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Articles de la facture</Label>
                      <Button type="button" onClick={addItem} size="sm">
                        Ajouter un article
                      </Button>
                    </div>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[80px]">Unités</TableHead>
                            <TableHead className="w-[100px]">Prix</TableHead>
                            <TableHead className="w-[80px]">TVA</TableHead>
                            <TableHead className="w-[100px]">Montant</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Input
                                  placeholder="Description de l'article"
                                  value={item.description}
                                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                  className="border-0 p-0 h-auto"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="border-0 p-0 h-auto text-right"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                  className="border-0 p-0 h-auto text-right"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={item.tax_rate}
                                  onChange={(e) => handleItemChange(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                                  className="border-0 p-0 h-auto text-right"
                                />
                              </TableCell>
                              <TableCell className="font-medium text-right">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: formData.currency,
                                }).format(item.amount)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                  disabled={formData.items.length === 1}
                                  className="h-6 w-6 p-0"
                                >
                                  ×
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Payment Details Section */}
            <Card>
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection('payment-details')}
              >
                <div className="flex items-center space-x-3">
                  {sections.find(s => s.id === 'payment-details')?.isOpen ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">Détails de paiement</span>
                </div>
              </div>
              {sections.find(s => s.id === 'payment-details')?.isOpen && (
                <CardContent className="pt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment_method">Méthode de paiement</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EFT Bank Transfer">Virement bancaire</SelectItem>
                        <SelectItem value="Credit Card">Carte de crédit</SelectItem>
                        <SelectItem value="PayPal">PayPal</SelectItem>
                        <SelectItem value="Check">Chèque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.payment_method === 'EFT Bank Transfer' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="account_name">Nom du compte</Label>
                        <Input
                          id="account_name"
                          value={formData.account_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                          placeholder="Nom du titulaire du compte"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bsb_code">Code BSB</Label>
                          <Input
                            id="bsb_code"
                            value={formData.bsb_code}
                            onChange={(e) => setFormData(prev => ({ ...prev, bsb_code: e.target.value }))}
                            placeholder="123456"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="account_number">Numéro de compte</Label>
                          <Input
                            id="account_number"
                            value={formData.account_number}
                            onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                            placeholder="123456789"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Add Notes Section */}
            <Card>
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection('add-notes')}
              >
                <div className="flex items-center space-x-3">
                  {sections.find(s => s.id === 'add-notes')?.isOpen ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Ajouter des notes</span>
                </div>
              </div>
              {sections.find(s => s.id === 'add-notes')?.isOpen && (
                <CardContent className="pt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Ajoutez des notes ou conditions supplémentaires..."
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Add Signature Section */}
            <Card>
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection('add-signature')}
              >
                <div className="flex items-center space-x-3">
                  {sections.find(s => s.id === 'add-signature')?.isOpen ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Ajouter une signature</span>
                </div>
              </div>
              {sections.find(s => s.id === 'add-signature')?.isOpen && (
                <CardContent className="pt-0 space-y-4">
                  <SignaturePad
                    signature={formData.signature}
                    signatureName={formData.signature_name}
                    onSignatureChange={(signature) => setFormData(prev => ({ ...prev, signature }))}
                    onSignatureNameChange={(signature_name) => setFormData(prev => ({ ...prev, signature_name }))}
                  />
                </CardContent>
              )}
            </Card>

            {/* Email Details Section */}
            <Card>
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection('email-details')}
              >
                <div className="flex items-center space-x-3">
                  {sections.find(s => s.id === 'email-details')?.isOpen ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                  <Mail className="h-4 w-4" />
                  <span className="font-medium">Détails de l'email</span>
                </div>
              </div>
              {sections.find(s => s.id === 'email-details')?.isOpen && (
                <CardContent className="pt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email_subject">Objet de l'email</Label>
                    <Input
                      id="email_subject"
                      value={formData.email_subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, email_subject: e.target.value }))}
                      placeholder="Facture #{INVOICE_NUMBER}"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email_message">Message de l'email</Label>
                    <Textarea
                      id="email_message"
                      placeholder="Veuillez trouver ci-joint votre facture..."
                      value={formData.email_message}
                      onChange={(e) => setFormData(prev => ({ ...prev, email_message: e.target.value }))}
                      rows={4}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Save Button */}
          <div className="pt-6">
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Sauvegarde...' : 'Sauvegarder la facture'}
            </Button>
          </div>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="w-1/2 overflow-y-auto bg-gray-100">
        <InvoicePreview 
          formData={formData}
          clients={clients}
          totals={{ subtotal, taxAmount, total }}
        />
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { FileText, Mail, CreditCard, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  company_website: string;
  company_abn: string;
  project_name: string;
  payment_method: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  bsb_code: string;
  email_subject: string;
  email_message: string;
}

interface InvoicePreviewProps {
  formData: InvoiceFormData;
  clients: Client[];
  totals: {
    subtotal: number;
    taxAmount: number;
    total: number;
  };
}

export default function InvoicePreview({ formData, clients, totals }: InvoicePreviewProps) {
  const [showPreviewActions, setShowPreviewActions] = useState(false);

  const selectedClient = clients.find(client => client.id === formData.client_id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Preview Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-600">Aperçu</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
            <Button variant="outline" size="sm">
              <CreditCard className="mr-2 h-4 w-4" />
              Paiement en ligne
            </Button>
            <div className="relative">
              <Button 
                variant="default" 
                size="sm"
                onClick={() => setShowPreviewActions(!showPreviewActions)}
              >
                Sauvegarder la facture
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg">
          {/* Invoice Header */}
          <div className="border-b-2 border-gray-200 p-8">
            <div className="flex justify-between items-start">
              {/* Company Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {formData.company_name || 'Clorio'}
                </h1>
                {formData.company_address && (
                  <p className="text-gray-600 mb-1">{formData.company_address}</p>
                )}
                {formData.company_email && (
                  <p className="text-gray-600 mb-1">{formData.company_email}</p>
                )}
                {formData.company_phone && (
                  <p className="text-gray-600 mb-1">{formData.company_phone}</p>
                )}
                {formData.company_website && (
                  <p className="text-gray-600 mb-1">{formData.company_website}</p>
                )}
                {formData.company_abn && (
                  <p className="text-gray-600">ABN: {formData.company_abn}</p>
                )}
              </div>

              {/* Invoice Title */}
              <div className="text-right">
                <h2 className="text-4xl font-bold text-gray-900 mb-2">FACTURE</h2>
                <p className="text-xl font-semibold text-gray-700">
                  #12346
                </p>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="p-8">
            {/* Project Name */}
            {formData.project_name && (
              <div className="mb-6">
                <p className="text-lg font-medium text-gray-900">
                  Projet: {formData.project_name}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* From */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">De:</h3>
                <div className="text-gray-700">
                  <p className="font-medium text-lg">{formData.company_name || 'Washim Chowdhory'}</p>
                  {formData.company_address && (
                    <p className="mb-1">{formData.company_address}</p>
                  )}
                  {formData.company_abn && (
                    <p className="mb-1">SIRET: {formData.company_abn}</p>
                  )}
                  {formData.company_email && (
                    <p className="mb-1">{formData.company_email}</p>
                  )}
                  {formData.company_phone && (
                    <p className="mb-1">{formData.company_phone}</p>
                  )}
                  {formData.company_website && (
                    <p>{formData.company_website}</p>
                  )}
                </div>
              </div>

              {/* To */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">À:</h3>
                <div className="text-gray-700">
                  {selectedClient ? (
                    <>
                      <p className="font-medium text-lg">{selectedClient.name}</p>
                      {selectedClient.company && (
                        <p className="mb-1">{selectedClient.company}</p>
                      )}
                      {selectedClient.address && (
                        <p className="mb-1">{selectedClient.address}</p>
                      )}
                      <p className="mb-1">{selectedClient.contact_email}</p>
                      {selectedClient.phone && (
                        <p>{selectedClient.phone}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-lg">Tony Stark</p>
                      <p className="mb-1">Mirabazar, Sylhet, Bangladesh</p>
                      <p className="mb-1">tony@gmail.com</p>
                      <p>(209) 234-22435</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice Info */}
            <div className="text-right mb-8">
              <div className="space-y-2">
                  <div>
                    <span className="font-medium text-gray-600">Date d'émission: </span>
                    <span>{formatDate(formData.issue_date)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Date d'échéance: </span>
                    <span>{formatDate(formData.due_date)}</span>
                  </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                      Description
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold w-20">
                      Unités
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold w-28">
                      Prix
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold w-20">
                      TVA
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold w-28">
                      Montant
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3">
                        {item.description || 'Description de l\'article'}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right">
                        {item.quantity}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right">
                        {item.tax_rate}%
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-medium">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant total</span>
                    <span className="font-medium">{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Late Payment Note */}
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-8">
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> Des frais de retard de 10% par an calculés quotidiennement seront appliqués pour les paiements effectués après la date d'échéance.
              </p>
            </div>

            {/* Payment Method */}
            {formData.payment_method && (
              <div className="mb-8">
                <h4 className="font-semibold text-gray-900 mb-3">Méthode de paiement</h4>
                <div className="text-gray-700">
                  <p className="font-medium">{formData.payment_method}</p>
                  {formData.payment_method === 'EFT Bank Transfer' && (
                    <div className="mt-2 space-y-1">
                      {formData.account_name && (
                        <p>Nom du compte: {formData.account_name}</p>
                      )}
                      {formData.bsb_code && (
                        <p>Code: {formData.bsb_code}</p>
                      )}
                      {formData.account_number && (
                        <p>Numéro de compte: {formData.account_number}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Signature */}
            {(formData.signature || formData.signature_name) && (
              <div className="border-t border-gray-300 pt-8">
                <div className="flex justify-end">
                  <div className="text-right">
                    {formData.signature ? (
                      <div className="mb-2">
                        <img 
                          src={formData.signature} 
                          alt="Signature" 
                          className="max-w-48 h-12 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="border-b border-gray-400 w-48 inline-block text-center py-2 mb-2">
                        {formData.signature_name}
                      </div>
                    )}
                    <p className="text-sm text-gray-600">
                      {formData.signature_name || formData.company_name || 'Washim Chowdhury'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {formData.notes && (
              <div className="mt-8">
                <h4 className="font-semibold text-gray-900 mb-2">Notes :</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{formData.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

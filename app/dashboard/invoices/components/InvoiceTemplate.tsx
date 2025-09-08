'use client';

import { useEffect, useState } from 'react';

interface Invoice {
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
}

interface Company {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
}

interface InvoiceTemplateProps {
  invoice: Invoice;
  company: Company;
  template?: any;
}

export default function InvoiceTemplate({ invoice, company, template }: InvoiceTemplateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="animate-pulse bg-gray-100 h-96 rounded-lg"></div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg" id="invoice-template">
      {/* Header */}
      <div className="border-b-2 border-gray-200 p-8">
        <div className="flex justify-between items-start">
          {/* Company Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {company.name || 'Your Company Name'}
            </h1>
            {company.address && (
              <p className="text-gray-600 mb-1">{company.address}</p>
            )}
            {company.email && (
              <p className="text-gray-600 mb-1">{company.email}</p>
            )}
            {company.phone && (
              <p className="text-gray-600">{company.phone}</p>
            )}
          </div>

          {/* Invoice Title */}
          <div className="text-right">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">INVOICE</h2>
            <p className="text-xl font-semibold text-gray-700">
              #{invoice.invoice_number}
            </p>
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="p-8">
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Bill To */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
            <div className="text-gray-700">
              <p className="font-medium text-lg">{invoice.clients.name}</p>
              {invoice.clients.company && (
                <p className="mb-1">{invoice.clients.company}</p>
              )}
              <p>{invoice.clients.contact_email}</p>
              {invoice.clients.phone && (
                <p>{invoice.clients.phone}</p>
              )}
              {invoice.clients.address && (
                <p>{invoice.clients.address}</p>
              )}
            </div>
          </div>

          {/* Invoice Info */}
          <div className="text-right">
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-600">Invoice Date:</span>
                <span className="ml-2">{formatDate(invoice.issue_date)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Due Date:</span>
                <span className="ml-2">{formatDate(invoice.due_date)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Amount Due:</span>
                <span className="ml-2 font-bold text-lg">
                  {formatCurrency(invoice.total_amount)}
                </span>
              </div>
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
                  Qty
                </th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold w-28">
                  Rate
                </th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold w-20">
                  Tax
                </th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold w-28">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.invoice_items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3">
                    {item.description}
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
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="border-t-2 border-gray-300 pt-2 flex justify-between">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-lg font-bold">
                  {formatCurrency(invoice.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-8">
            <h4 className="font-semibold text-gray-900 mb-2">Notes:</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Signature */}
        {invoice.signature && (
          <div className="border-t border-gray-300 pt-8">
            <div className="flex justify-end">
              <div className="text-right">
                <p className="font-medium text-gray-900 mb-2">Signature:</p>
                <div className="border-b border-gray-400 w-48 inline-block text-center py-2">
                  {invoice.signature}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-300 mt-8 pt-8 text-center text-sm text-gray-600">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
}

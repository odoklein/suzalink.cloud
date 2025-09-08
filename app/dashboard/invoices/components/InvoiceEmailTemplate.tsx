'use client';

interface Invoice {
  invoice_number: string;
  total_amount: number;
  currency: string;
  due_date: string;
  clients: {
    name: string;
  };
}

interface EmailTemplateProps {
  invoice: Invoice;
  customMessage?: string;
  companyName?: string;
}

export default function InvoiceEmailTemplate({
  invoice,
  customMessage,
  companyName = 'Your Company Name'
}: EmailTemplateProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const defaultMessage = `Dear ${invoice.clients.name},

Please find attached invoice ${invoice.invoice_number} for ${formatCurrency(invoice.total_amount, invoice.currency)}.

Due date: ${formatDate(invoice.due_date)}

${customMessage || 'If you have any questions, please don\'t hesitate to contact us.'}

Best regards,
${companyName}`;

  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Email Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Invoice {invoice.invoice_number}
        </h2>
        <p className="text-sm text-gray-600">
          {formatCurrency(invoice.total_amount, invoice.currency)} • Due {formatDate(invoice.due_date)}
        </p>
      </div>

      {/* Email Content */}
      <div className="p-6">
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
            {defaultMessage}
          </pre>
        </div>

        {/* Attachment Notice */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">
                PDF Invoice Attached
              </h4>
              <p className="text-sm text-blue-700">
                The invoice has been attached as a PDF for your records.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Email Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          This email was sent by {companyName}. Please do not reply to this email.
        </p>
      </div>
    </div>
  );
}

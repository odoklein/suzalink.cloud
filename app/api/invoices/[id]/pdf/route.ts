import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/invoices/[id]/pdf - Generate and download PDF
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Get invoice with all related data
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (
          id,
          name,
          company,
          contact_email,
          phone,
          status,
          region,
          industry,
          notes
        ),
        invoice_items (
          id,
          description,
          quantity,
          unit_price,
          tax_rate,
          amount,
          display_order
        ),
        invoice_templates (
          id,
          template_name,
          layout_config
        )
      `)
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      console.error('Error fetching invoice for PDF:', error);
      return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
    }

    // Get user settings and profile
    const { data: settings } = await supabase
      .from('invoice_settings')
      .select('company_details')
      .eq('user_id', session.user.id)
      .single();

    const { data: userProfile } = await supabase
      .from('users')
      .select('full_name, email, phone, job_title, company, location')
      .eq('id', session.user.id)
      .single();

    // Generate PDF
    try {
      const pdfBuffer = await generateInvoicePDF({
        invoice: {
          ...invoice,
          invoice_items: invoice.invoice_items.sort((a: any, b: any) => a.display_order - b.display_order)
        },
        company: {
          ...settings?.company_details,
          name: userProfile?.full_name,
          email: userProfile?.email,
          phone: userProfile?.phone,
          job_title: userProfile?.job_title,
          company: userProfile?.company || settings?.company_details?.company,
          location: userProfile?.location
        },
        template: invoice.invoice_templates
      });

      // Return PDF as downloadable file
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
        },
      });
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in PDF API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/invoices/[id]/pdf - Generate PDF and return base64
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Get invoice with all related data (same as GET)
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (
          id,
          name,
          company,
          contact_email,
          phone,
          status,
          region,
          industry,
          notes
        ),
        invoice_items (
          id,
          description,
          quantity,
          unit_price,
          tax_rate,
          amount,
          display_order
        ),
        invoice_templates (
          id,
          template_name,
          layout_config
        )
      `)
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      console.error('Error fetching invoice for PDF:', error);
      return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
    }

    // Get user settings and profile
    const { data: settings } = await supabase
      .from('invoice_settings')
      .select('company_details')
      .eq('user_id', session.user.id)
      .single();

    const { data: userProfile } = await supabase
      .from('users')
      .select('full_name, email, phone, job_title, company, location')
      .eq('id', session.user.id)
      .single();

    // Generate PDF
    try {
      const pdfBuffer = await generateInvoicePDF({
        invoice: {
          ...invoice,
          invoice_items: invoice.invoice_items.sort((a: any, b: any) => a.display_order - b.display_order)
        },
        company: {
          ...settings?.company_details,
          name: userProfile?.full_name,
          email: userProfile?.email,
          phone: userProfile?.phone,
          job_title: userProfile?.job_title,
          company: userProfile?.company || settings?.company_details?.company,
          location: userProfile?.location
        },
        template: invoice.invoice_templates
      });

      // Return PDF as base64 string
      const base64PDF = pdfBuffer.toString('base64');

      return NextResponse.json({
        pdf: base64PDF,
        filename: `invoice-${invoice.invoice_number}.pdf`
      });
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in PDF API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate invoice PDF
async function generateInvoicePDF(data: any): Promise<Buffer> {
  // TODO: Implement actual PDF generation using Puppeteer, jsPDF, or similar
  // For now, return a placeholder PDF

  // This would typically:
  // 1. Use a template engine to generate HTML
  // 2. Use Puppeteer to convert HTML to PDF
  // 3. Return the PDF buffer

  const htmlTemplate = generateInvoiceHTML(data);

  // Placeholder - in production, use Puppeteer or similar
  return Buffer.from(htmlTemplate);
}

// Helper function to generate invoice HTML (for PDF conversion)
function generateInvoiceHTML(data: any): string {
  const { invoice, company, template } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoice.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .company-details, .client-details { margin-bottom: 20px; }
        .invoice-details { margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { font-weight: bold; }
        .text-right { text-align: right; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-details">
          <h2>${company.company || company.name}</h2>
          <p>${company.name}</p>
          <p>${company.email}</p>
          <p>${company.phone || ''}</p>
          <p>${company.location || ''}</p>
        </div>
        <div>
          <h1>INVOICE</h1>
          <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
          <p><strong>Date:</strong> ${new Date(invoice.issue_date).toLocaleDateString()}</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
        </div>
      </div>

      <div class="client-details">
        <h3>Bill To:</h3>
        <p><strong>${invoice.clients.name}</strong></p>
        <p>${invoice.clients.company || ''}</p>
        <p>${invoice.clients.contact_email}</p>
        <p>${invoice.clients.phone || ''}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Tax Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.invoice_items.map((item: any) => `
            <tr>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td>${invoice.currency} ${item.unit_price.toFixed(2)}</td>
              <td>${item.tax_rate}%</td>
              <td>${invoice.currency} ${item.amount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="text-right"><strong>Subtotal:</strong></td>
            <td>${invoice.currency} ${invoice.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="4" class="text-right"><strong>Tax:</strong></td>
            <td>${invoice.currency} ${invoice.tax_amount.toFixed(2)}</td>
          </tr>
          <tr class="total">
            <td colspan="4" class="text-right"><strong>Total:</strong></td>
            <td>${invoice.currency} ${invoice.total_amount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      ${invoice.notes ? `<div class="notes"><p><strong>Notes:</strong> ${invoice.notes}</p></div>` : ''}
    </body>
    </html>
  `;
}

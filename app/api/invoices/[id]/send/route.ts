import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';

// POST /api/invoices/[id]/send - Send invoice via email
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
    const body = await request.json();

    const {
      email_config_id,
      subject,
      message,
      include_pdf = true
    } = body;

    // Validate required fields
    if (!email_config_id) {
      return NextResponse.json({
        error: 'email_config_id is required'
      }, { status: 400 });
    }

    // Verify invoice ownership and get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (
          id,
          name,
          company,
          contact_email
        ),
        invoice_items (
          id,
          description,
          quantity,
          unit_price,
          tax_rate,
          amount
        )
      `)
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'sent' || invoice.status === 'paid') {
      return NextResponse.json({
        error: 'Invoice has already been sent or paid'
      }, { status: 400 });
    }

    // Verify email config ownership
    const { data: emailConfig, error: configError } = await supabase
      .from('user_email_configs')
      .select('*')
      .eq('id', email_config_id)
      .eq('user_id', session.user.id)
      .single();

    if (configError || !emailConfig) {
      return NextResponse.json({ error: 'Email configuration not found' }, { status: 404 });
    }

    // Generate PDF if requested
    let pdfBuffer = null;
    if (include_pdf) {
      try {
        pdfBuffer = await generateInvoicePDF(invoice);
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        // Continue without PDF if generation fails
      }
    }

    // Send email using existing email system
    const emailSubject = subject || `Invoice ${invoice.invoice_number}`;
    const emailMessage = message || generateDefaultEmailMessage(invoice);

    try {
      await sendInvoiceEmail(emailConfig, invoice, emailSubject, emailMessage, pdfBuffer);

      // Update invoice status to 'sent'
      await supabase
        .from('invoices')
        .update({
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id);

      // Log audit event
      await supabase
        .from('invoice_audit_log')
        .insert({
          invoice_id: params.id,
          action: 'sent',
          details: {
            email_config_id,
            recipient: invoice.clients.contact_email,
            subject: emailSubject,
            include_pdf
          },
          performed_by: session.user.id
        });

      // Log activity
      await ActivityHelpers.logInvoiceSent(session.user.id, invoice.invoice_number, params.id);

      return NextResponse.json({
        message: 'Invoice sent successfully',
        invoice: {
          ...invoice,
          status: 'sent'
        }
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return NextResponse.json({ error: 'Failed to send invoice email' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error sending invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate invoice PDF
async function generateInvoicePDF(invoice: any): Promise<Buffer> {
  // TODO: Implement PDF generation using Puppeteer or similar
  // For now, return a placeholder
  return Buffer.from('PDF_PLACEHOLDER');
}

// Helper function to send invoice email
async function sendInvoiceEmail(
  emailConfig: any,
  invoice: any,
  subject: string,
  message: string,
  pdfBuffer?: Buffer | null
) {
  // TODO: Integrate with existing email sending system
  // This would use the email config to send via SMTP/IMAP
  console.log('Sending invoice email:', {
    to: invoice.clients.contact_email,
    subject,
    message,
    hasPdf: !!pdfBuffer
  });
}

// Helper function to generate default email message
function generateDefaultEmailMessage(invoice: any): string {
  return `Dear ${invoice.clients.name},

Please find attached invoice ${invoice.invoice_number} for ${invoice.currency} ${invoice.total_amount.toFixed(2)}.

Due date: ${new Date(invoice.due_date).toLocaleDateString()}

If you have any questions, please don't hesitate to contact us.

Best regards,
Your Company Name`;
}

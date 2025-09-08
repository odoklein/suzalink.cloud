import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';

// POST /api/invoices/[id]/duplicate - Duplicate an invoice
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

    // Get the original invoice with all details
    const { data: originalInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (*)
      `)
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (invoiceError || !originalInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get user settings for new invoice numbering
    const { data: settings } = await supabase
      .from('invoice_settings')
      .select('number_prefix, number_format, next_number')
      .eq('user_id', session.user.id)
      .single();

    // Generate new invoice number
    const nextNumber = settings?.next_number || 1;
    const prefix = settings?.number_prefix || 'INV';
    const format = settings?.number_format || '{PREFIX}-{YEAR}-{COUNTER}';

    const currentYear = new Date().getFullYear();
    const newInvoiceNumber = format
      .replace('{PREFIX}', prefix)
      .replace('{YEAR}', currentYear.toString())
      .replace('{COUNTER}', nextNumber.toString().padStart(3, '0'));

    // Calculate new dates (current date + 30 days by default)
    const today = new Date();
    const issueDate = today.toISOString().split('T')[0];
    const dueDate = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000))
      .toISOString()
      .split('T')[0];

    // Create the duplicated invoice
    const { data: newInvoice, error: createError } = await supabase
      .from('invoices')
      .insert({
        user_id: session.user.id,
        client_id: originalInvoice.client_id,
        invoice_number: newInvoiceNumber,
        issue_date: issueDate,
        due_date: dueDate,
        currency: originalInvoice.currency,
        exchange_rate: originalInvoice.exchange_rate,
        subtotal: originalInvoice.subtotal,
        tax_amount: originalInvoice.tax_amount,
        total_amount: originalInvoice.total_amount,
        notes: originalInvoice.notes,
        signature: null, // Don't copy signature
        template_id: originalInvoice.template_id,
        status: 'draft'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating duplicated invoice:', createError);
      return NextResponse.json({ error: 'Failed to duplicate invoice' }, { status: 500 });
    }

    // Duplicate invoice items
    if (originalInvoice.invoice_items && originalInvoice.invoice_items.length > 0) {
      const duplicatedItems = originalInvoice.invoice_items.map((item: any) => ({
        invoice_id: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        amount: item.amount,
        display_order: item.display_order
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(duplicatedItems);

      if (itemsError) {
        console.error('Error duplicating invoice items:', itemsError);
        // Don't fail the whole operation, but log the error
      }
    }

    // Update invoice settings with next number
    await supabase
      .from('invoice_settings')
      .upsert({
        user_id: session.user.id,
        next_number: nextNumber + 1
      }, {
        onConflict: 'user_id'
      });

    // Log audit event
    await supabase
      .from('invoice_audit_log')
      .insert({
        invoice_id: newInvoice.id,
        action: 'created',
        details: {
          duplicated_from: params.id,
          original_number: originalInvoice.invoice_number
        },
        performed_by: session.user.id
      });

    // Log activity
    await ActivityHelpers.logInvoiceCreated(session.user.id, newInvoiceNumber, newInvoice.id);

    // Get the complete duplicated invoice
    const { data: completeInvoice, error: fetchError } = await supabase
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
          amount,
          display_order
        )
      `)
      .eq('id', newInvoice.id)
      .single();

    if (fetchError) {
      console.error('Error fetching duplicated invoice:', fetchError);
    }

    return NextResponse.json({
      invoice: completeInvoice || newInvoice,
      message: 'Invoice duplicated successfully'
    });
  } catch (error) {
    console.error('Error duplicating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';

// GET /api/invoices/[id] - Get specific invoice
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
        )
      `)
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      console.error('Error fetching invoice:', error);
      return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error in invoice API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/invoices/[id] - Update invoice
export async function PUT(
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
      client_id,
      issue_date,
      due_date,
      currency,
      exchange_rate,
      notes,
      signature,
      template_id,
      status,
      items = []
    } = body;

    // Verify invoice ownership
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Calculate totals if items are provided
    let updateData: any = {
      client_id,
      issue_date,
      due_date,
      currency,
      exchange_rate,
      notes,
      signature,
      template_id,
      status,
      updated_at: new Date().toISOString()
    };

    if (items.length > 0) {
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const taxAmount = items.reduce((sum, item) => {
        const itemTotal = item.quantity * item.unit_price;
        return sum + (itemTotal * (item.tax_rate || 0) / 100);
      }, 0);
      const totalAmount = subtotal + taxAmount;

      updateData = {
        ...updateData,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount
      };

      // Update invoice items
      await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', params.id);

      const invoiceItems = items.map((item, index) => ({
        invoice_id: params.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate || 0,
        amount: item.quantity * item.unit_price,
        display_order: index
      }));

      await supabase
        .from('invoice_items')
        .insert(invoiceItems);
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', session.user.id)
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
      .single();

    if (error) {
      console.error('Error updating invoice:', error);
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }

    // Log activity
    try {
      await ActivityHelpers.logInvoiceUpdated(session.user.id, invoice.invoice_number, params.id);
    } catch (logError) {
      console.error('Error logging invoice update:', logError);
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/invoices/[id] - Delete invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Get invoice details before deletion for logging
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, invoice_number, status')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Don't allow deletion of sent or paid invoices
    if (invoice.status === 'sent' || invoice.status === 'paid') {
      return NextResponse.json({
        error: 'Cannot delete sent or paid invoices'
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', params.id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error deleting invoice:', error);
      return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
    }

    // Log activity
    try {
      await ActivityHelpers.logInvoiceDeleted(session.user.id, invoice.invoice_number, params.id);
    } catch (logError) {
      console.error('Error logging invoice deletion:', logError);
    }

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// PUT /api/invoices/[id]/items/[itemId] - Update specific item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const {
      description,
      quantity,
      unit_price,
      tax_rate,
      display_order
    } = body;

    // Verify invoice ownership
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Don't allow updating items in sent or paid invoices
    if (invoice.status === 'sent' || invoice.status === 'paid') {
      return NextResponse.json({
        error: 'Cannot modify items in sent or paid invoices'
      }, { status: 400 });
    }

    // Verify item exists and belongs to the invoice
    const { data: existingItem } = await supabase
      .from('invoice_items')
      .select('id')
      .eq('id', params.itemId)
      .eq('invoice_id', params.id)
      .single();

    if (!existingItem) {
      return NextResponse.json({ error: 'Invoice item not found' }, { status: 404 });
    }

    const amount = quantity * unit_price;

    const updateData: any = {
      description,
      quantity,
      unit_price,
      tax_rate,
      amount
    };

    if (display_order !== undefined) {
      updateData.display_order = display_order;
    }

    const { data: item, error } = await supabase
      .from('invoice_items')
      .update(updateData)
      .eq('id', params.itemId)
      .eq('invoice_id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating invoice item:', error);
      return NextResponse.json({ error: 'Failed to update invoice item' }, { status: 500 });
    }

    // Update invoice totals
    await updateInvoiceTotals(supabase, params.id);

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error updating invoice item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/invoices/[id]/items/[itemId] - Delete specific item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Verify invoice ownership
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Don't allow deleting items from sent or paid invoices
    if (invoice.status === 'sent' || invoice.status === 'paid') {
      return NextResponse.json({
        error: 'Cannot delete items from sent or paid invoices'
      }, { status: 400 });
    }

    // Verify item exists and belongs to the invoice
    const { data: existingItem } = await supabase
      .from('invoice_items')
      .select('id')
      .eq('id', params.itemId)
      .eq('invoice_id', params.id)
      .single();

    if (!existingItem) {
      return NextResponse.json({ error: 'Invoice item not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('invoice_items')
      .delete()
      .eq('id', params.itemId)
      .eq('invoice_id', params.id);

    if (error) {
      console.error('Error deleting invoice item:', error);
      return NextResponse.json({ error: 'Failed to delete invoice item' }, { status: 500 });
    }

    // Update invoice totals
    await updateInvoiceTotals(supabase, params.id);

    return NextResponse.json({ message: 'Invoice item deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to update invoice totals
async function updateInvoiceTotals(supabase: any, invoiceId: string) {
  const { data: items } = await supabase
    .from('invoice_items')
    .select('quantity, unit_price, tax_rate')
    .eq('invoice_id', invoiceId);

  if (items && items.length > 0) {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unit_price;
      return sum + (itemTotal * (item.tax_rate || 0) / 100);
    }, 0);
    const totalAmount = subtotal + taxAmount;

    await supabase
      .from('invoices')
      .update({
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId);
  } else {
    // No items left, reset totals
    await supabase
      .from('invoices')
      .update({
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId);
  }
}

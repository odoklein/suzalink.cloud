import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/invoices/[id]/items - Get all items for an invoice
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

    // Verify invoice ownership
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const { data: items, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', params.id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching invoice items:', error);
      return NextResponse.json({ error: 'Failed to fetch invoice items' }, { status: 500 });
    }

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    console.error('Error in invoice items API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/invoices/[id]/items - Add new item to invoice
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
      description,
      quantity,
      unit_price,
      tax_rate = 0
    } = body;

    // Validate required fields
    if (!description || !quantity || unit_price === undefined) {
      return NextResponse.json({
        error: 'Missing required fields: description, quantity, unit_price'
      }, { status: 400 });
    }

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

    // Don't allow adding items to sent or paid invoices
    if (invoice.status === 'sent' || invoice.status === 'paid') {
      return NextResponse.json({
        error: 'Cannot modify items in sent or paid invoices'
      }, { status: 400 });
    }

    // Get next display order
    const { data: lastItem } = await supabase
      .from('invoice_items')
      .select('display_order')
      .eq('invoice_id', params.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = lastItem ? lastItem.display_order + 1 : 0;

    const amount = quantity * unit_price;

    const { data: item, error } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: params.id,
        description,
        quantity,
        unit_price,
        tax_rate,
        amount,
        display_order: nextOrder
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invoice item:', error);
      return NextResponse.json({ error: 'Failed to create invoice item' }, { status: 500 });
    }

    // Update invoice totals
    await updateInvoiceTotals(supabase, params.id);

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error creating invoice item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to update invoice totals
async function updateInvoiceTotals(supabase: any, invoiceId: string) {
  const { data: items } = await supabase
    .from('invoice_items')
    .select('quantity, unit_price, tax_rate')
    .eq('invoice_id', invoiceId);

  if (items) {
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
  }
}

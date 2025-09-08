import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';

// GET /api/invoices - List all invoices for the user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('client_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        client_id,
        status,
        total_amount,
        currency,
        issue_date,
        due_date,
        created_at,
        updated_at,
        clients (
          id,
          name,
          company,
          contact_email
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data: invoices, error, count } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    return NextResponse.json({
      invoices: invoices || [],
      total: count || 0,
      offset,
      limit
    });
  } catch (error) {
    console.error('Error in invoices API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/invoices - Create new invoice
export async function POST(request: NextRequest) {
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
      currency = 'USD',
      exchange_rate = 1.0,
      notes,
      signature,
      template_id,
      items = []
    } = body;

    // Validate required fields
    if (!client_id || !issue_date || !due_date || !items.length) {
      return NextResponse.json({
        error: 'Missing required fields: client_id, issue_date, due_date, items'
      }, { status: 400 });
    }

    // Get user settings for invoice numbering
    const { data: settings } = await supabase
      .from('invoice_settings')
      .select('number_prefix, number_format, next_number')
      .eq('user_id', session.user.id)
      .single();

    // Generate invoice number
    const nextNumber = settings?.next_number || 1;
    const prefix = settings?.number_prefix || 'INV';
    const format = settings?.number_format || '{PREFIX}-{YEAR}-{COUNTER}';

    const currentYear = new Date().getFullYear();
    const invoiceNumber = format
      .replace('{PREFIX}', prefix)
      .replace('{YEAR}', currentYear.toString())
      .replace('{COUNTER}', nextNumber.toString().padStart(3, '0'));

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unit_price;
      return sum + (itemTotal * (item.tax_rate || 0) / 100);
    }, 0);
    const totalAmount = subtotal + taxAmount;

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: session.user.id,
        client_id,
        invoice_number: invoiceNumber,
        issue_date,
        due_date,
        currency,
        exchange_rate,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        notes,
        signature,
        template_id,
        status: 'draft'
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    // Create invoice items
    const invoiceItems = items.map((item, index) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate || 0,
      amount: item.quantity * item.unit_price,
      display_order: index
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems);

    if (itemsError) {
      console.error('Error creating invoice items:', itemsError);
      // Don't fail the whole operation, but log the error
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

    // Log activity
    try {
      await ActivityHelpers.logInvoiceCreated(session.user.id, invoiceNumber, invoice.id);
    } catch (logError) {
      console.error('Error logging invoice creation:', logError);
    }

    return NextResponse.json({
      invoice: {
        ...invoice,
        items: invoiceItems
      }
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

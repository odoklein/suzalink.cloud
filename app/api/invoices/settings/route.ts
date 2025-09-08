import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/invoices/settings - Get user invoice settings
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: settings, error } = await supabase
      .from('invoice_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching invoice settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Return default settings if none exist
    if (!settings) {
      const defaultSettings = {
        number_prefix: 'INV',
        number_format: '{PREFIX}-{YEAR}-{COUNTER}',
        next_number: 1,
        default_currency: 'USD',
        default_payment_terms: 30,
        company_details: {},
        tax_settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return NextResponse.json({ settings: defaultSettings });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error in settings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/invoices/settings - Update user invoice settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const {
      number_prefix,
      number_format,
      next_number,
      default_currency,
      default_payment_terms,
      company_details,
      tax_settings
    } = body;

    const updateData: any = { updated_at: new Date().toISOString() };

    // Only include defined fields
    if (number_prefix !== undefined) updateData.number_prefix = number_prefix;
    if (number_format !== undefined) updateData.number_format = number_format;
    if (next_number !== undefined) updateData.next_number = next_number;
    if (default_currency !== undefined) updateData.default_currency = default_currency;
    if (default_payment_terms !== undefined) updateData.default_payment_terms = default_payment_terms;
    if (company_details !== undefined) updateData.company_details = company_details;
    if (tax_settings !== undefined) updateData.tax_settings = tax_settings;

    const { data: settings, error } = await supabase
      .from('invoice_settings')
      .upsert({
        user_id: session.user.id,
        ...updateData
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating invoice settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

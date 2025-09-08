import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/invoices/[id]/preview - Get invoice preview data
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
          notes,
          created_at
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
      console.error('Error fetching invoice preview:', error);
      return NextResponse.json({ error: 'Failed to fetch invoice preview' }, { status: 500 });
    }

    // Get user settings for company details
    const { data: settings } = await supabase
      .from('invoice_settings')
      .select('company_details, tax_settings')
      .eq('user_id', session.user.id)
      .single();

    // Get user profile for sender details
    const { data: userProfile } = await supabase
      .from('users')
      .select('full_name, email, phone, job_title, company, location')
      .eq('id', session.user.id)
      .single();

    // Prepare preview data
    const previewData = {
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
      settings: settings || {},
      template: invoice.invoice_templates || null
    };

    return NextResponse.json(previewData);
  } catch (error) {
    console.error('Error in preview API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';
import FirecrawlService from '@/lib/firecrawl-service';

// Mock data for MVP - in production this would use Firecrawl
const mockProspectsData = {
  "Technologie & IT": [
    {
      name: "TechCorp Solutions",
      email: "contact@techcorp.fr",
      phone: "+33 1 23 45 67 89",
      address: "123 Avenue des Champs-Élysées, 75008 Paris",
      website: "https://techcorp.fr",
      description: "Solutions informatiques pour entreprises",
      category: "Développement logiciel"
    },
    {
      name: "Digital Innovation",
      email: "info@digital-innovation.com",
      phone: "+33 1 98 76 54 32",
      address: "45 Rue de Rivoli, 75001 Paris",
      website: "https://digital-innovation.com",
      description: "Agence digitale spécialisée en transformation numérique",
      category: "Conseil IT"
    },
    {
      name: "CloudTech Services",
      email: "hello@cloudtech.fr",
      phone: "+33 1 55 44 33 22",
      address: "78 Boulevard Saint-Germain, 75005 Paris",
      website: "https://cloudtech.fr",
      description: "Services cloud et infrastructure IT",
      category: "Services cloud"
    }
  ],
  "Santé & Médical": [
    {
      name: "Clinique Santé Plus",
      email: "contact@santeplus.fr",
      phone: "+33 1 11 22 33 44",
      address: "12 Place de la République, 75003 Paris",
      website: "https://santeplus.fr",
      description: "Clinique médicale multidisciplinaire",
      category: "Médecine générale"
    },
    {
      name: "Cabinet Dentaire Moderne",
      email: "rdv@dentaire-moderne.fr",
      phone: "+33 1 66 77 88 99",
      address: "89 Rue de la Paix, 75002 Paris",
      website: "https://dentaire-moderne.fr",
      description: "Cabinet dentaire avec technologies modernes",
      category: "Dentisterie"
    }
  ],
  "Immobilier": [
    {
      name: "Agence Immobilière Premium",
      email: "vente@immobilier-premium.fr",
      phone: "+33 1 22 33 44 55",
      address: "156 Avenue des Ternes, 75017 Paris",
      website: "https://immobilier-premium.fr",
      description: "Agence immobilière haut de gamme",
      category: "Vente immobilière"
    },
    {
      name: "Location Paris Pro",
      email: "location@paris-pro.fr",
      phone: "+33 1 77 88 99 00",
      address: "34 Rue de la Tour, 75016 Paris",
      website: "https://paris-pro.fr",
      description: "Spécialiste de la location à Paris",
      category: "Location immobilière"
    }
  ]
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { 
      industry, 
      location, 
      targetCount, 
      listName, 
      preview = false, 
      selectedColumns, 
      previewData 
    } = await request.json();

    // Validate input
    if (!industry || !location || !targetCount || !listName) {
      return NextResponse.json({ 
        error: 'Missing required fields: industry, location, targetCount, listName' 
      }, { status: 400 });
    }

    // Handle preview mode
    if (preview) {
      const firecrawlService = FirecrawlService.getInstance();
      const scrapingResult = await firecrawlService.generateProspects(industry, location, targetCount);
      
      if (scrapingResult.errors.length > 0) {
        console.warn('Scraping errors:', scrapingResult.errors);
      }

      return NextResponse.json({
        success: true,
        previewData: {
          prospects: scrapingResult.prospects,
          sources_used: scrapingResult.sources_used,
          total_found: scrapingResult.total_found,
          errors: scrapingResult.errors
        }
      });
    }

    // Handle import mode with selected columns
    if (previewData && selectedColumns) {
      const generatedProspects = previewData.prospects
        .filter((prospect: any) => prospect.name) // Only include prospects with names
        .map((prospect: any) => {
          const data: any = {};
          
          // Only include selected columns
          if (selectedColumns.name) data.name = prospect.name;
          if (selectedColumns.email) data.email = prospect.email || '';
          if (selectedColumns.phone) data.phone = prospect.phone || '';
          if (selectedColumns.address) data.address = prospect.address || '';
          if (selectedColumns.website) data.website = prospect.website || '';
          if (selectedColumns.description) data.description = prospect.description || '';
          if (selectedColumns.category) data.category = prospect.category || industry;
          
          return data;
        });

    // Create the prospect list
    const { data: listData, error: listError } = await supabase
      .from('prospect_lists')
      .insert({
        name: listName,
        description: `Liste générée automatiquement pour ${industry} à ${location}`,
        created_by: session.user.id,
        status: 'active'
      })
      .select()
      .single();

    if (listError) {
      console.error('Error creating list:', listError);
      return NextResponse.json({ error: 'Failed to create prospect list' }, { status: 500 });
    }

    // Create columns for the list based on selected columns
    const columnTypes: Record<string, string> = {
      name: 'text',
      email: 'email',
      phone: 'phone',
      address: 'text',
      website: 'text',
      description: 'text',
      category: 'text'
    };

    const columns = Object.entries(selectedColumns)
      .filter(([_, selected]) => selected)
      .map(([columnName, _], index) => ({
        column_name: columnName,
        column_type: columnTypes[columnName] || 'text',
        display_order: index + 1,
        is_phone: columnName === 'phone'
      }));

     const { error: columnsError } = await supabase
       .from('prospect_columns')
       .insert(
         columns.map(col => ({
           ...col,
           list_id: listData.id
         }))
       );

    if (columnsError) {
      console.error('Error creating columns:', columnsError);
      return NextResponse.json({ error: 'Failed to create columns' }, { status: 500 });
    }

    // Insert prospects
    const prospectsToInsert = generatedProspects.map((prospect: any, index: number) => ({
      list_id: listData.id,
      created_by: session.user.id,
      data: prospect, // Use the filtered data based on selected columns
      status: 'nouveau',
      commentaire: '',
      rappel_date: null
    }));

    const { error: prospectsError } = await supabase
      .from('prospects')
      .insert(prospectsToInsert);

    if (prospectsError) {
      console.error('Error creating prospects:', prospectsError);
      return NextResponse.json({ error: 'Failed to create prospects' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      listId: listData.id,
      generatedCount: generatedProspects.length,
      sourcesUsed: previewData.sources_used,
      errors: previewData.errors || [],
      message: `Liste "${listName}" créée avec ${generatedProspects.length} prospects`
    });
    }

    // Fallback to original behavior if no preview data
    return NextResponse.json({ 
      error: 'Invalid request: preview data required for import mode' 
    }, { status: 400 });

  } catch (error) {
    console.error('Error in generate-ai-list:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

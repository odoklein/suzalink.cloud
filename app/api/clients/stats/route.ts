import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    // Get all clients with their status and creation date
    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, status, created_at, region");

    if (error) {
      console.error("Error fetching clients:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Calculate statistics
    const total = clients?.length || 0;
    const active = clients?.filter(c => c.status === 'active').length || 0;
    const pending = clients?.filter(c => c.status === 'pending').length || 0;
    const inactive = clients?.filter(c => c.status === 'inactive').length || 0;
    const newThisMonth = clients?.filter(c => new Date(c.created_at) >= startOfMonth).length || 0;
    
    // Calculate growth rate
    const lastMonthClients = clients?.filter(c => {
      const created = new Date(c.created_at);
      return created >= lastMonth && created < startOfMonth;
    }).length || 0;
    
    const growthRate = lastMonthClients > 0 ? ((newThisMonth - lastMonthClients) / lastMonthClients) * 100 : 0;

    // Calculate regional distribution
    const regionStats: { [key: string]: number } = {};
    (clients || []).forEach(client => {
      const region = client.region || "Non spécifié";
      regionStats[region] = (regionStats[region] || 0) + 1;
    });

    const regionalDistribution = Object.entries(regionStats).map(([region, count]) => ({
      region,
      count
    }));

    // Get top clients by project count
    const { data: topClients } = await supabase
      .from("clients")
      .select(`
        id, 
        name, 
        company, 
        status,
        projects:projects(id)
      `)
      .order("created_at", { ascending: false })
      .limit(5);

    const topClientsData = (topClients || []).map(client => ({
      id: client.id,
      name: client.name,
      company: client.company || "N/A",
      projects_count: client.projects?.length || 0,
      total_revenue: 0, // You can calculate this from invoices/finance table
      status: client.status
    }));

    return NextResponse.json({
      stats: {
        total,
        active,
        pending,
        inactive,
        newThisMonth,
        growthRate
      },
      regionalDistribution,
      topClients: topClientsData
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 
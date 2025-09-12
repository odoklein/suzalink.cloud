"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProspectsGrid } from "../components/ProspectsGrid";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProspectList {
  id: string;
  name: string;
  description?: string;
  status: string;
  prospect_count: number;
  created_at: string;
  created_by: string;
}

function ProspectSpreadsheetPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.listId as string;

  const [listData, setListData] = useState<ProspectList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListData = async () => {
      if (!listId) return;

      try {
        const res = await fetch(`/api/prospects/lists/${listId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch list data');
        }
        const data = await res.json();
        setListData(data.list || null);
      } catch (error) {
        console.error('Error fetching list data:', error);
        // If list doesn't exist or error, redirect back to prospects
        router.push('/dashboard/prospects');
      } finally {
        setLoading(false);
      }
    };

    fetchListData();
  }, [listId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <div className="p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!listData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Liste introuvable</h2>
          <p className="text-gray-600 mb-4">La liste de prospects demandée n'existe pas.</p>
          <Button onClick={() => router.push('/dashboard/prospects')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux listes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Google Sheets style */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/prospects')}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <Building className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{listData.name}</h1>
              <p className="text-sm text-gray-600">
                {listData.prospect_count} prospect{listData.prospect_count > 1 ? 's' : ''}
                {listData.description && ` • ${listData.description}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet Content */}
      <div className="flex-1">
        <Suspense fallback={
          <div className="p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </div>
        }>
          <ProspectsGrid listId={listId} />
        </Suspense>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <ProspectSpreadsheetPage />
    </Suspense>
  );
}

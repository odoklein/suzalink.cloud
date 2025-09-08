"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Building, Phone, Download, Upload, Trash2, Edit, Calendar, Users, Info, Settings, MoreHorizontal, ChevronRight, Search, Filter, Eye, EyeOff, CheckSquare, Square, RefreshCw } from "lucide-react";
import { ProspectTable } from "../../components/ProspectTable";
import { toast } from "sonner";
import { format } from "date-fns";
import { DeleteListDialog } from "../../components/DeleteListDialog";
import { AssignClientModal } from "../../components/AssignClientModal";
import { ColumnManagerModal } from "../../components/ColumnManagerModal";
import { EditListModal } from "../../components/EditListModal";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ListDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  
  const [list, setList] = useState<any>(null);
  const [columns, setColumns] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [infoPopoverOpen, setInfoPopoverOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProspects, setSelectedProspects] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch list data
  const fetchListData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prospects/lists/${id}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Liste de prospects introuvable");
          router.push("/dashboard/prospects");
          return;
        }
        throw new Error("Échec du chargement des données de la liste");
      }
      
      const data = await res.json();
      setList(data.list);
      setColumns(data.columns);
      setProspects(data.prospects);
    } catch (error) {
      console.error("Error fetching list data:", error);
      toast.error("Failed to load list data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListData();
  }, [id]);

  const handleBack = () => {
    router.push("/dashboard/prospects");
  };

  const handleDeleteSuccess = () => {
    router.push("/dashboard/prospects");
  };

  // Status badge color - pastel theme
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "inactive":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "archived":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-sky-100 text-sky-700 border-sky-200";
    }
  };

  // French status labels
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Actif";
      case "inactive":
        return "Inactif";
      case "archived":
        return "Archivé";
      default:
        return "Nouveau";
    }
  };

  return (
    <div className="w-full py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {loading ? (
            <Skeleton className="h-8 w-[200px]" />
          ) : (
            <h1 className="text-2xl font-bold">{list?.name}</h1>
          )}
          
          {loading ? (
            <Skeleton className="h-5 w-[60px]" />
          ) : (
            <Badge className={`text-xs ${getStatusColor(list?.status)}`}>
              {getStatusLabel(list?.status)}
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 hover:bg-slate-50"
            onClick={() => setEditModalOpen(true)}
          >
            <Edit className="h-3 w-3 mr-2" />
            Modifier
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-xs"
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Supprimer
          </Button>

          {/* Info Mega Menu */}
          <Popover open={infoPopoverOpen} onOpenChange={setInfoPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="border-slate-200 hover:bg-slate-50">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
              <div className="p-4 space-y-4">
                {/* List Details Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Info className="h-4 w-4 text-slate-500" />
                    <h4 className="font-medium text-sm text-slate-700">Détails Liste</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Description</p>
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {list?.description || "Aucune description"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Créé le</p>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-600">
                          {list?.created_at ? format(new Date(list.created_at), "MMM d, yyyy") : "Date inconnue"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Prospects</p>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">{list?.prospect_count}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client Assignment Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Building className="h-4 w-4 text-slate-500" />
                    <h4 className="font-medium text-sm text-slate-700">Assignation Client</h4>
                  </div>
                  <div className="flex items-center justify-between">
                    {list?.clients ? (
                      <>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Assigné à</p>
                          <p className="text-sm font-medium text-slate-700">{list.clients.name}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAssignDialogOpen(true);
                            setInfoPopoverOpen(false);
                          }}
                          className="h-7 text-xs border-slate-200"
                        >
                          Changer
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-slate-600">Non assigné</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAssignDialogOpen(true);
                            setInfoPopoverOpen(false);
                          }}
                          className="h-7 text-xs border-slate-200"
                        >
                          Assigner
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Actions Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <h4 className="font-medium text-sm text-slate-700">Actions Rapides</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-slate-200 hover:bg-slate-50 justify-start"
                      onClick={() => setInfoPopoverOpen(false)}
                    >
                      <Upload className="h-3 w-3 mr-2" />
                      Importer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-slate-200 hover:bg-slate-50 justify-start"
                      onClick={() => setInfoPopoverOpen(false)}
                    >
                      <Download className="h-3 w-3 mr-2" />
                      Exporter
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-slate-200 hover:bg-slate-50 w-full justify-start"
                    onClick={() => setInfoPopoverOpen(false)}
                  >
                    <Phone className="h-3 w-3 mr-2" />
                    Actions d'appel
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Integrated Layout - Cards + Table */}
      <Card className="bg-gradient-to-br from-slate-50/30 via-white to-blue-50/20 border-slate-200/60 shadow-sm overflow-hidden">
        {/* Header with Table Controls */}
        <CardHeader className="py-4 px-4 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-blue-50/30">
          <div className="space-y-4">
            {/* Title and Count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg font-medium text-slate-800">Prospects</CardTitle>
                <Badge variant="default" className="bg-slate-100 text-slate-700 border-slate-200">
                  {list?.prospect_count || 0} total
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setColumnManagerOpen(true)}
                  className="h-8 border-slate-200 hover:bg-slate-50"
                >
                  <Settings className="h-3 w-3 mr-2" />
                  Colonnes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-slate-200 hover:bg-slate-50"
                >
                  <Upload className="h-3 w-3 mr-2" />
                  Ajouter
                </Button>
              </div>
            </div>

            {/* Table Controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher prospects..."
                    className="pl-10 h-9 border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Filters */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-9 border-slate-200 hover:bg-slate-50"
                >
                  <Filter className="h-3 w-3 mr-2" />
                  Filtres
                </Button>

                {/* Refresh */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchListData}
                  className="h-9 border-slate-200 hover:bg-slate-50"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>

              {/* Bulk Actions */}
              {selectedProspects.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">
                    {selectedProspects.length} sélectionné{selectedProspects.length > 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-slate-200 hover:bg-slate-50"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Exporter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-slate-200 hover:bg-slate-50"
                  >
                    <Phone className="h-3 w-3 mr-2" />
                    Appeler
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Supprimer
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 bg-gradient-to-br from-slate-50/20 to-white">
          <ProspectTable
            columns={columns}
            prospects={prospects}
            loading={loading}
            onRefresh={fetchListData}
            searchTerm={searchTerm}
            selectedProspects={selectedProspects}
            onSelectionChange={setSelectedProspects}
          />
        </CardContent>
      </Card>
      
      {/* Delete Dialog */}
      <DeleteListDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        list={list}
        onSuccess={handleDeleteSuccess}
      />
      
      {/* Assign Client Dialog */}
      <AssignClientModal
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        list={list}
        onSuccess={fetchListData}
      />
      
      {/* Column Manager Dialog */}
      <ColumnManagerModal
        open={columnManagerOpen}
        onOpenChange={setColumnManagerOpen}
        listId={id}
        columns={columns}
        onColumnsUpdated={fetchListData}
      />

      {/* Edit List Modal */}
      <EditListModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        list={list}
        onSuccess={fetchListData}
      />
    </div>
  );
}
import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Building,
  LinkIcon,
  UnlinkIcon,
  Users,
  Calendar,
  Phone,
  Mail
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AssignClientModal } from "./AssignClientModal";
import { DeleteListDialog } from "./DeleteListDialog";

interface ListsCardsProps {
  lists: any[];
  loading: boolean;
  onRefresh: () => void;
}

// Generate pastel background based on first letter (like status badges)
const getAvatarGradient = (name: string) => {
  const pastelColors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-yellow-100 text-yellow-700',
    'bg-red-100 text-red-700',
    'bg-indigo-100 text-indigo-700',
    'bg-teal-100 text-teal-700',
    'bg-orange-100 text-orange-700',
    'bg-cyan-100 text-cyan-700',
  ];

  const firstChar = name.charAt(0).toUpperCase();
  const index = firstChar.charCodeAt(0) % pastelColors.length;
  return pastelColors[index];
};

export function ListsCards({ lists, loading, onRefresh }: ListsCardsProps) {
  const router = useRouter();
  const [listToAssign, setListToAssign] = useState<any>(null);
  const [listToDelete, setListToDelete] = useState<any>(null);



  // View list details
  const handleViewList = (listId: string) => {
    router.push(`/dashboard/prospects/lists/${listId}`);
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={`skeleton-${index}`} className="hover:shadow-sm transition-all duration-200 bg-gradient-to-br from-slate-50/50 to-blue-50/30 border-slate-200/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[50px]" />
              </div>
              <Skeleton className="h-3 w-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3 w-[80px]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
              <Skeleton className="h-7 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
          <Users className="h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-slate-600 mb-2">Aucune liste de prospects trouvée</h3>
        <p className="text-sm text-slate-500">Commencez par créer votre première liste de prospects</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {lists.map((list) => (
          <Card
            key={list.id}
            className="hover:shadow-md transition-all duration-200 cursor-pointer group bg-gradient-to-br from-slate-50/50 via-white to-blue-50/30 border-slate-200 hover:border-slate-300"
            onClick={() => handleViewList(list.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-sm font-medium group-hover:text-slate-800 transition-colors line-clamp-1 text-slate-800">
                    {list.name}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2 text-slate-600">
                    {list.description || "Aucune description fournie"}
                  </CardDescription>
                </div>
                <Badge className={`ml-2 text-xs ${getStatusColor(list.status)}`}>
                  {getStatusLabel(list.status)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Client assignment */}
              <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-slate-50/80 to-blue-50/50 rounded-md border border-slate-200">
                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                  <Building className="h-3 w-3 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-600 truncate">
                    {list.clients ? list.clients.name : "Non assigné"}
                  </p>
                </div>
              </div>

              {/* Contributors */}
              <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-slate-50/80 to-green-50/50 rounded-md border border-slate-200">
                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                  <Users className="h-3 w-3 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-600">
                    {list.contributors && list.contributors.length > 0 ? (
                      <span>
                        {list.contributors.length} contributeur{list.contributors.length > 1 ? 's' : ''}
                      </span>
                    ) : (
                      "Aucun contributeur"
                    )}
                  </p>
                  {list.contributors && list.contributors.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {list.contributors.slice(0, 2).map((contributor: any, index: number) => (
                        <Badge
                          key={contributor.id}
                          variant="default"
                          className={`text-[9px] px-1.5 py-0.5 h-4 ${getAvatarGradient(contributor.name)} border-0 truncate max-w-24`}
                        >
                          {contributor.email.split('@')[0]}
                        </Badge>
                      ))}
                      {list.contributors.length > 2 && (
                        <Badge
                          variant="default"
                          className="text-[9px] px-1.5 py-0.5 h-4 bg-slate-100 text-slate-600 border-slate-200"
                        >
                          +{list.contributors.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-400">Prospects</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">{list.prospect_count}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-400">Créé</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    {format(new Date(list.created_at), "MMM d")}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-1 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs border-slate-200 hover:bg-slate-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewList(list.id);
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Voir
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 h-7 hover:bg-slate-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleViewList(list.id);
                    }} className="text-xs">
                      <Eye className="mr-2 h-3 w-3" />
                      Voir Détails
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-xs">
                      <Edit className="mr-2 h-3 w-3" />
                      Modifier Liste
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {list.client_id ? (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        setListToAssign({ ...list, unassign: true });
                      }} className="text-xs">
                        <UnlinkIcon className="mr-2 h-3 w-3" />
                        Désassigner Client
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        setListToAssign(list);
                      }} className="text-xs">
                        <LinkIcon className="mr-2 h-3 w-3" />
                        Assigner au Client
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setListToDelete(list);
                      }}
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assign Client Modal */}
      <AssignClientModal
        open={!!listToAssign}
        onOpenChange={(open) => !open && setListToAssign(null)}
        list={listToAssign}
        onSuccess={onRefresh}
      />

      {/* Delete List Dialog */}
      <DeleteListDialog
        open={!!listToDelete}
        onOpenChange={(open) => !open && setListToDelete(null)}
        list={listToDelete}
        onSuccess={onRefresh}
      />
    </>
  );
}

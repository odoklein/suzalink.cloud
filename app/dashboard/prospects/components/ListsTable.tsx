import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Building, 
  LinkIcon, 
  UnlinkIcon 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignClientModal } from "./AssignClientModal";
import { DeleteListDialog } from "./DeleteListDialog";

interface ListsTableProps {
  lists: any[];
  loading: boolean;
  onRefresh: () => void;
}

export function ListsTable({ lists, loading, onRefresh }: ListsTableProps) {
  const router = useRouter();
  const [listToAssign, setListToAssign] = useState<any>(null);
  const [listToDelete, setListToDelete] = useState<any>(null);

  // View list details
  const handleViewList = (listId: string) => {
    router.push(`/dashboard/prospects/lists/${listId}`);
  };

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "secondary";
      case "archived":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Prospects</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell><Skeleton className="h-5 w-[180px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : lists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No prospect lists found
                </TableCell>
              </TableRow>
            ) : (
              lists.map((list) => (
                <TableRow key={list.id}>
                  <TableCell className="font-medium cursor-pointer hover:underline" onClick={() => handleViewList(list.id)}>
                    {list.name}
                  </TableCell>
                  <TableCell>
                    {list.clients ? (
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        {list.clients.name}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell>{list.prospect_count}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(list.status) as any}>
                      {list.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(list.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewList(list.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {list.client_id ? (
                          <DropdownMenuItem onClick={() => setListToAssign({ ...list, unassign: true })}>
                            <UnlinkIcon className="mr-2 h-4 w-4" />
                            Unassign Client
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setListToAssign(list)}>
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Assign to Client
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => setListToDelete(list)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
    </div>
  );
}

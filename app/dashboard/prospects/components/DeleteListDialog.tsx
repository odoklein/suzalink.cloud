import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DeleteListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: any;
  onSuccess: () => void;
}

export function DeleteListDialog({ open, onOpenChange, list, onSuccess }: DeleteListDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!list) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/prospects/lists/${list.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete list");
      }
      
      toast.success(`List "${list.name}" deleted successfully`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete list");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!list) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Prospect List</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the list "{list.name}"? This action cannot be undone.
            {list.prospect_count > 0 && (
              <span className="block mt-2 font-medium text-destructive">
                This will also delete {list.prospect_count} prospects in this list.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete List"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


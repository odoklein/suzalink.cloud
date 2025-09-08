import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClientSelect } from "./ClientSelect";
import { toast } from "sonner";
import { Building } from "lucide-react";

interface AssignClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: any;
  onSuccess: () => void;
}

export function AssignClientModal({ open, onOpenChange, list, onSuccess }: AssignClientModalProps) {
  const [clientId, setClientId] = useState<string | undefined>(list?.client_id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isUnassigning = list?.unassign;

  const handleSubmit = async () => {
    if (!list) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/prospects/assign-client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listId: list.id,
          clientId: isUnassigning ? null : clientId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to assign client");
      }
      
      toast.success(isUnassigning ? "Client unassigned successfully" : "Client assigned successfully");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign client");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!list) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isUnassigning ? "Unassign Client" : "Assign List to Client"}
          </DialogTitle>
          <DialogDescription>
            {isUnassigning
              ? `Remove client assignment from list "${list.name}"`
              : `Assign list "${list.name}" to a client`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {isUnassigning ? (
            <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
              <Building className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Currently assigned to:</p>
                <p className="text-sm">{list.clients?.name || "Unknown Client"}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Client</label>
              <ClientSelect
                value={clientId}
                onChange={setClientId}
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (!isUnassigning && !clientId)}
            variant={isUnassigning ? "destructive" : "default"}
          >
            {isSubmitting
              ? "Processing..."
              : isUnassigning
              ? "Unassign Client"
              : "Assign Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


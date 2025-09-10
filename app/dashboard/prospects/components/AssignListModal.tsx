"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, UserCheck, UserX, Shield } from "lucide-react";
import { toast } from "sonner";

interface AssignListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  listName: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface AssignedUser {
  user_id: string;
  full_name: string;
  email: string;
  assigned_at: string;
  can_edit: boolean;
  can_delete: boolean;
}

export function AssignListModal({ open, onOpenChange, listId, listName }: AssignListModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [canEdit, setCanEdit] = useState(true);
  const [canDelete, setCanDelete] = useState(false);

  // Fetch users and current assignments when modal opens
  useEffect(() => {
    if (open && listId) {
      fetchUsers();
      fetchAssignedUsers();
    }
  }, [open, listId]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data && Array.isArray(data)) {
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erreur lors du chargement des utilisateurs");
    }
  };

  const fetchAssignedUsers = async () => {
    try {
      const res = await fetch(`/api/prospects/lists/${listId}/assignments`);
      const data = await res.json();
      if (data.assignedUsers) {
        setAssignedUsers(data.assignedUsers);
      }
    } catch (error) {
      console.error("Error fetching assigned users:", error);
      toast.error("Erreur lors du chargement des assignations");
    }
  };

  const handleAssignUser = async () => {
    if (!selectedUserId) {
      toast.error("Veuillez sélectionner un utilisateur");
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch(`/api/prospects/lists/${listId}/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUserId,
          canEdit,
          canDelete,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'assignation");
      }

      toast.success("Utilisateur assigné avec succès");
      setSelectedUserId("");
      setCanEdit(true);
      setCanDelete(false);

      // Refresh assigned users
      await fetchAssignedUsers();

    } catch (error) {
      console.error("Error assigning user:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'assignation");
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignUser = async (userId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir retirer cette assignation ?")) {
      return;
    }

    try {
      const res = await fetch(`/api/prospects/lists/${listId}/assignments?userId=${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      toast.success("Utilisateur retiré avec succès");

      // Refresh assigned users
      await fetchAssignedUsers();

    } catch (error) {
      console.error("Error unassigning user:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression");
    }
  };

  // Filter out already assigned users from the selection
  const availableUsers = users.filter(
    user => !assignedUsers.some(assigned => assigned.user_id === user.id)
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'commercial':
        return <UserCheck className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'commercial':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assigner la liste "{listName}"</DialogTitle>
          <DialogDescription>
            Assignez des utilisateurs à cette liste de prospects. Ils recevront une notification et pourront accéder à la liste.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assign New User Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Assigner un nouvel utilisateur</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-select">Sélectionner un utilisateur</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un utilisateur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.full_name || user.email}</span>
                          <Badge variant="outline" className={`text-xs ${getRoleColor(user.role)}`}>
                            {getRoleIcon(user.role)}
                            <span className="ml-1">{user.role}</span>
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="can-edit"
                      checked={canEdit}
                      onCheckedChange={(checked) => setCanEdit(checked as boolean)}
                    />
                    <Label htmlFor="can-edit" className="text-sm">
                      Peut modifier les prospects
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="can-delete"
                      checked={canDelete}
                      onCheckedChange={(checked) => setCanDelete(checked as boolean)}
                    />
                    <Label htmlFor="can-delete" className="text-sm">
                      Peut supprimer les prospects
                    </Label>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAssignUser}
                disabled={!selectedUserId || assigning}
                className="w-full"
              >
                {assigning ? "Assignation..." : "Assigner l'utilisateur"}
              </Button>
            </div>
          </div>

          {/* Currently Assigned Users Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">
              Utilisateurs assignés ({assignedUsers.length})
            </h3>

            {assignedUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun utilisateur assigné à cette liste.
              </p>
            ) : (
              <div className="space-y-3">
                {assignedUsers.map((assigned) => (
                  <div
                    key={assigned.user_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {assigned.full_name?.charAt(0) || assigned.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{assigned.full_name || assigned.email}</p>
                        <p className="text-sm text-muted-foreground">{assigned.email}</p>
                        <div className="flex gap-2 mt-1">
                          {assigned.can_edit && (
                            <Badge variant="secondary" className="text-xs">
                              Édition
                            </Badge>
                          )}
                          {assigned.can_delete && (
                            <Badge variant="destructive" className="text-xs">
                              Suppression
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnassignUser(assigned.user_id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

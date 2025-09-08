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
import { Badge } from "@/components/ui/badge";
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
import { Trash2, Edit2, Plus, Eye, EyeOff, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface Column {
  id: string;
  column_name: string;
  column_type: string;
  is_phone: boolean;
  display_order: number;
  visible?: boolean;
}

interface ColumnManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  columns: Column[];
  onColumnsUpdated: () => void;
}

export function ColumnManagerModal({ 
  open, 
  onOpenChange, 
  listId, 
  columns, 
  onColumnsUpdated 
}: ColumnManagerModalProps) {
  const [localColumns, setLocalColumns] = useState<Column[]>([]);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState("text");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Add visibility property to columns
      setLocalColumns(columns.map(col => ({ ...col, visible: true })));
    }
  }, [open, columns]);

  const handleToggleVisibility = (columnId: string) => {
    setLocalColumns(prev => 
      prev.map(col => 
        col.id === columnId 
          ? { ...col, visible: !col.visible }
          : col
      )
    );
  };

  const handleStartEdit = (column: Column) => {
    setEditingColumn(column.id);
    setEditName(column.column_name);
    setEditType(column.column_type);
  };

  const handleCancelEdit = () => {
    setEditingColumn(null);
    setEditName("");
    setEditType("");
  };

  const handleSaveEdit = async (columnId: string) => {
    if (!editName.trim()) {
      toast.error("Column name cannot be empty");
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/prospects/columns/${columnId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          column_name: editName.trim(),
          column_type: editType
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update column");
      }

      setLocalColumns(prev => 
        prev.map(col => 
          col.id === columnId 
            ? { ...col, column_name: editName.trim(), column_type: editType }
            : col
        )
      );

      handleCancelEdit();
      toast.success("Column updated successfully");
    } catch (error) {
      console.error("Error updating column:", error);
      toast.error("Failed to update column");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/prospects/columns/${columnId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to delete column");
      }

      setLocalColumns(prev => prev.filter(col => col.id !== columnId));
      setDeleteConfirm(null);
      toast.success("Column deleted successfully");
    } catch (error) {
      console.error("Error deleting column:", error);
      toast.error("Failed to delete column");
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      toast.error("Column name cannot be empty");
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/prospects/columns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          list_id: listId,
          column_name: newColumnName.trim(),
          column_type: newColumnType,
          display_order: localColumns.length + 1
        })
      });

      if (!response.ok) {
        throw new Error("Failed to add column");
      }

      const newColumn = await response.json();
      setLocalColumns(prev => [...prev, { ...newColumn, visible: true }]);
      setNewColumnName("");
      setNewColumnType("text");
      toast.success("Column added successfully");
    } catch (error) {
      console.error("Error adding column:", error);
      toast.error("Failed to add column");
    } finally {
      setLoading(false);
    }
  };

  const handleReorderColumns = (fromIndex: number, toIndex: number) => {
    const newColumns = [...localColumns];
    const [movedColumn] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, movedColumn);
    
    // Update display_order
    const updatedColumns = newColumns.map((col, index) => ({
      ...col,
      display_order: index + 1
    }));
    
    setLocalColumns(updatedColumns);
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);

      // Save column order and visibility
      const response = await fetch(`/api/prospects/columns/bulk-update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          list_id: listId,
          columns: localColumns.map((col, index) => ({
            id: col.id,
            display_order: index + 1,
            visible: col.visible
          }))
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update columns");
      }

      onColumnsUpdated();
      onOpenChange(false);
      toast.success("Column settings saved successfully");
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      text: "bg-blue-100 text-blue-800",
      email: "bg-green-100 text-green-800",
      phone: "bg-purple-100 text-purple-800",
      number: "bg-orange-100 text-orange-800",
      date: "bg-pink-100 text-pink-800",
      boolean: "bg-gray-100 text-gray-800"
    };
    return colors[type as keyof typeof colors] || colors.text;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
            <DialogDescription>
              Add, edit, reorder, or hide columns for this prospect list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto max-h-[60vh]">
            {/* Add new column */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="text-sm font-medium mb-3">Add New Column</h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label htmlFor="newColumnName">Column Name</Label>
                  <Input
                    id="newColumnName"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="Enter column name"
                  />
                </div>
                <div className="w-32">
                  <Label htmlFor="newColumnType">Type</Label>
                  <Select value={newColumnType} onValueChange={setNewColumnType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleAddColumn}
                  disabled={loading || !newColumnName.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {/* Existing columns */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Existing Columns ({localColumns.length})</h3>
              {localColumns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No columns found
                </div>
              ) : (
                <div className="space-y-2">
                  {localColumns
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((column, index) => (
                    <div
                      key={column.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                    >
                      {/* Drag handle */}
                      <div className="cursor-move text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                      </div>

                      {/* Visibility toggle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleVisibility(column.id)}
                      >
                        {column.visible ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>

                      {/* Column info */}
                      <div className="flex-1 min-w-0">
                        {editingColumn === column.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8"
                              autoFocus
                            />
                            <Select value={editType} onValueChange={setEditType}>
                              <SelectTrigger className="w-24 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="phone">Phone</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {column.column_name}
                            </span>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${getTypeColor(column.column_type)}`}
                            >
                              {column.column_type}
                            </Badge>
                            {column.is_phone && (
                              <Badge variant="outline" className="text-xs">
                                Phone
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {editingColumn === column.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSaveEdit(column.id)}
                              disabled={loading}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              disabled={loading}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleStartEdit(column)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm(column.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this column? This action cannot be undone and will remove all data in this column for all prospects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteColumn(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


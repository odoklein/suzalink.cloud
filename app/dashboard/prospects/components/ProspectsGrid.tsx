"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { ChevronDown, GripVertical, Plus, Trash2, Calendar, Hash, Type, Check, Phone, Mail, User, Building, Edit, MoreHorizontal, UserPlus, StickyNote, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AddInterlocuteurModal } from "./AddInterlocuteurModal";
import { ChangeStatusModal } from "./ChangeStatusModal";
import { AddNoteModal } from "./AddNoteModal";
import { ProspectEmailDialog } from "./ProspectEmailDialog";
import { BulkCampaignModal } from "./BulkCampaignModal";
import { EmailHistoryModal } from "./EmailHistoryModal";


// Column types
type ColumnType = "text" | "number" | "select" | "checkbox" | "date" | "action";

interface Column {
  id: string;
  name: string;
  type: ColumnType;
  width: number;
  options?: string[]; // For select type
  editable?: boolean;
}

interface Interlocuteur {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Prospect {
  id: string;
  list_id: string;
  data: {
    name: string;
    email?: string;
    phone?: string;
    industry?: string;
    website?: string;
    notes?: string;
    rappel?: string;
  };
  status: string;
  rappel_date?: string;
  created_at: string;
  updated_at: string;
  prospect_interlocuteurs?: Interlocuteur[];
  prospect_assignments?: any[];
  prospect_activities?: {
    id: string;
    activity_type: string;
    description: string;
    metadata?: any;
    created_at: string;
  }[];
}

interface ProspectsGridProps {
  listId: string;
}

// Define our base columns for prospects
const baseProspectColumns: Column[] = [
  { id: "name", name: "Nom de l'entreprise", type: "text", width: 200, editable: true },
  { id: "email", name: "Email", type: "text", width: 180, editable: true },
  { id: "phone", name: "Téléphone", type: "text", width: 150, editable: true },
  { id: "industry", name: "Secteur", type: "text", width: 150, editable: true },
  { id: "website", name: "Site web", type: "text", width: 150, editable: true },
  { id: "rappel", name: "Rappel", type: "date", width: 150, editable: true },
  { id: "status", name: "Statut", type: "select", width: 150, editable: true, options: ["nouveau", "contacte", "interesse", "non_interesse", "rappel", "ferme"] },
  { id: "interlocuteurs", name: "Interlocuteurs", type: "text", width: 180, editable: false },
  { id: "actions", name: "Actions", type: "action", width: 100, editable: false },
];

export function ProspectsGrid({ listId }: ProspectsGridProps) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>(() => {
    const savedColumns = localStorage.getItem(`prospects-columns-${listId}`);
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        return [...baseProspectColumns, ...parsed];
      } catch (error) {
        console.error('Error parsing saved columns:', error);
      }
    }
    return [...baseProspectColumns];
  });
  const [showAddInterlocuteurModal, setShowAddInterlocuteurModal] = useState(false);
  const [selectedProspectForInterlocuteur, setSelectedProspectForInterlocuteur] = useState<string | null>(null);
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false);
  const [selectedProspectForStatus, setSelectedProspectForStatus] = useState<{id: string, name: string, status: string} | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [selectedProspectForNote, setSelectedProspectForNote] = useState<{id: string, name: string} | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedProspectForEmail, setSelectedProspectForEmail] = useState<Prospect | null>(null);
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  const [showBulkCampaignModal, setShowBulkCampaignModal] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<ColumnType>('text');
  const [showEmailHistory, setShowEmailHistory] = useState(false);
  const [selectedProspectForHistory, setSelectedProspectForHistory] = useState<Prospect | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  // Fetch prospects
  const fetchProspects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prospects/lists/${listId}`);
      const data = await res.json();
      
      if (data.prospects) {
        setProspects(data.prospects);
      }
    } catch (error) {
      console.error("Error fetching prospects:", error);
      toast.error("Erreur lors du chargement des prospects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listId) {
      fetchProspects();
    }
  }, [listId]);

  // Selection functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProspects(new Set(prospects.map(p => p.id)));
    } else {
      setSelectedProspects(new Set());
    }
  };

  const handleSelectProspect = (prospectId: string, checked: boolean) => {
    const newSelected = new Set(selectedProspects);
    if (checked) {
      newSelected.add(prospectId);
    } else {
      newSelected.delete(prospectId);
    }
    setSelectedProspects(newSelected);
  };

  const isAllSelected = prospects.length > 0 && selectedProspects.size === prospects.length;
  const isIndeterminate = selectedProspects.size > 0 && selectedProspects.size < prospects.length;

  // Handle column resizing
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, columnId: string) => {
      e.preventDefault();
      setResizingColumn(columnId);
      resizeStartX.current = e.clientX;
      const column = columns.find((col) => col.id === columnId);
      resizeStartWidth.current = column?.width || 150;
    },
    [columns],
  );

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!resizingColumn) return;

      const deltaX = e.clientX - resizeStartX.current;
      const newWidth = Math.max(80, resizeStartWidth.current + deltaX);

      setColumns((prev) => prev.map((col) => (col.id === resizingColumn ? { ...col, width: newWidth } : col)));
    },
    [resizingColumn],
  );

  const handleResizeEnd = useCallback(() => {
    setResizingColumn(null);
  }, []);

  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      return () => {
        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [resizingColumn, handleResizeMove, handleResizeEnd]);

  // Handle column reordering
  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleColumnDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnId) return;

    const draggedIndex = columns.findIndex((col) => col.id === draggedColumn);
    const targetIndex = columns.findIndex((col) => col.id === targetColumnId);

    const newColumns = [...columns];
    const [draggedCol] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(targetIndex, 0, draggedCol);

    setColumns(newColumns);
    setDraggedColumn(null);
  };

  // Cell editing
  const handleCellClick = (rowId: string, columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (column?.editable !== false) {
      setEditingCell({ rowId, columnId });
    }
  };

  const handleCellChange = async (rowId: string, columnId: string, value: any) => {
    // Update local state immediately for better UX
    setProspects((prev) =>
      prev.map((prospect) => {
        if (prospect.id === rowId) {
          if (columnId === 'status') {
            return { ...prospect, [columnId]: value };
          } else if (columnId === 'rappel') {
            // Handle rappel date specially - store in separate field
            return { ...prospect, rappel_date: value };
          } else {
            return {
              ...prospect,
              data: { ...prospect.data, [columnId]: value }
            };
          }
        }
        return prospect;
      }),
    );

    // Update on server
    try {
      const requestBody: any = {};
      if (columnId === 'rappel') {
        // Send rappel date as separate field
        requestBody.rappel_date = value;
        requestBody.isDataField = false;
      } else {
        requestBody[columnId] = value;
        requestBody.isDataField = columnId !== 'status' || columnId.startsWith('custom_');
      }

      const res = await fetch(`/api/prospects/${rowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error('Failed to update prospect');
      }

      toast.success("Prospect mis à jour");
    } catch (error) {
      console.error('Error updating prospect:', error);
      toast.error("Erreur lors de la mise à jour");
      // Revert local state
      fetchProspects();
    }
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  // Delete prospect
  const deleteProspect = async (prospectId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce prospect ?")) {
      return;
    }

    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete prospect');
      }

      setProspects(prev => prev.filter(p => p.id !== prospectId));
      toast.success("Prospect supprimé");
    } catch (error) {
      console.error('Error deleting prospect:', error);
      toast.error("Erreur lors de la suppression");
    }
  };

  // Bulk delete selected prospects
  const deleteSelectedProspects = async () => {
    const selectedIds = Array.from(selectedProspects);
    if (selectedIds.length === 0) return;

    const confirmMessage = `Êtes-vous sûr de vouloir supprimer ${selectedIds.length} prospect${selectedIds.length > 1 ? 's' : ''} ?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const deletePromises = selectedIds.map(id =>
        fetch(`/api/prospects/${id}`, { method: 'DELETE' })
      );

      const results = await Promise.allSettled(deletePromises);
      const successful = results.filter(result =>
        result.status === 'fulfilled' &&
        result.value.ok
      ).length;

      if (successful > 0) {
        setProspects(prev => prev.filter(p => !selectedProspects.has(p.id)));
        setSelectedProspects(new Set());
        toast.success(`${successful} prospect${successful > 1 ? 's' : ''} supprimé${successful > 1 ? 's' : ''}`);
      }

      if (successful < selectedIds.length) {
        toast.error(`${selectedIds.length - successful} suppression${selectedIds.length - successful > 1 ? 's' : ''} échouée${selectedIds.length - successful > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Error bulk deleting prospects:', error);
      toast.error("Erreur lors de la suppression en masse");
    }
  };

  // Column management functions
  const addColumn = () => {
    if (!newColumnName.trim()) return;

    const newColumn: Column = {
      id: `custom_${Date.now()}`,
      name: newColumnName.trim(),
      type: newColumnType,
      width: 150,
      editable: true,
    };

    const newColumns = [...columns, newColumn];
    setColumns(newColumns);

    // Save to localStorage
    const customColumns = newColumns.filter(col =>
      !baseProspectColumns.some(baseCol => baseCol.id === col.id)
    );
    localStorage.setItem(`prospects-columns-${listId}`, JSON.stringify(customColumns));

    // Reset form
    setNewColumnName('');
    setNewColumnType('text');

    toast.success(`Colonne "${newColumn.name}" ajoutée`);
  };

  const handleAddColumn = (name: string, type: ColumnType) => {
    const newColumn: Column = {
      id: `custom_${Date.now()}`,
      name,
      type,
      width: 150,
      editable: true,
    };

    const newColumns = [...columns, newColumn];
    setColumns(newColumns);

    // Save to localStorage
    const customColumns = newColumns.filter(col =>
      !baseProspectColumns.some(baseCol => baseCol.id === col.id)
    );
    localStorage.setItem(`prospects-columns-${listId}`, JSON.stringify(customColumns));
  };

  const removeColumn = (columnId: string) => {
    const columnToRemove = columns.find(col => col.id === columnId);
    const newColumns = columns.filter(col => col.id !== columnId);
    setColumns(newColumns);

    // Save to localStorage
    const customColumns = newColumns.filter(col =>
      !baseProspectColumns.some(baseCol => baseCol.id === col.id)
    );
    localStorage.setItem(`prospects-columns-${listId}`, JSON.stringify(customColumns));

    if (columnToRemove) {
      toast.success(`Colonne "${columnToRemove.name}" supprimée`);
    }
  };

  // Render cell content based on type
  const renderCell = (prospect: Prospect, column: Column) => {
    let value: any;
    if (column.id === 'status') {
      value = prospect[column.id as keyof Prospect];
    } else if (column.id === 'rappel') {
      // Handle rappel date - stored in separate field
      value = prospect.rappel_date;
    } else if (column.id.startsWith('custom_')) {
      // Handle custom columns - store in prospect data
      value = prospect.data[column.id as keyof typeof prospect.data];
    } else {
      value = prospect.data[column.id as keyof typeof prospect.data];
    }
    const isEditing = editingCell?.rowId === prospect.id && editingCell?.columnId === column.id;

    if (column.type === "action") {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
            {/* Communication Actions */}
            <DropdownMenuItem
              onClick={() => window.open(`tel:${prospect.data.phone}`, '_self')}
              disabled={!prospect.data.phone}
              className="flex items-center gap-2"
            >
              <Phone className="h-4 w-4" />
              <span>Appeler</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedProspectForEmail(prospect);
                setShowEmailDialog(true);
              }}
              disabled={!prospect.data.email}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              <span>Envoyer un email</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                // Fetch latest email history from API
                try {
                  const res = await fetch(`/api/prospects/${prospect.id}/activities?type=email`);
                  const data = await res.json();
                  if (data.activities) {
                    // Update prospect data with fresh activities
                    const updatedProspect = { ...prospect, prospect_activities: data.activities };
                    setSelectedProspectForHistory(updatedProspect);
                  } else {
                    setSelectedProspectForHistory(prospect);
                  }
                  setShowEmailHistory(true);
                } catch (error) {
                  console.error('Error fetching email history:', error);
                  setSelectedProspectForHistory(prospect);
                  setShowEmailHistory(true);
                }
              }}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              <span>Historique des emails</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Prospect Actions */}
            <DropdownMenuItem
              onClick={() => {
                setSelectedProspectForInterlocuteur(prospect.id);
                setShowAddInterlocuteurModal(true);
              }}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>Ajouter interlocuteur</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedProspectForStatus({
                  id: prospect.id,
                  name: prospect.data.name,
                  status: prospect.status
                });
                setShowChangeStatusModal(true);
              }}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              <span>Changer statut</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedProspectForNote({
                  id: prospect.id,
                  name: prospect.data.name
                });
                setShowAddNoteModal(true);
              }}
              className="flex items-center gap-2"
            >
              <StickyNote className="h-4 w-4" />
              <span>Ajouter note</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Destructive Actions */}
            <DropdownMenuItem
              onClick={() => deleteProspect(prospect.id)}
              className="flex items-center gap-2 text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              <span>Supprimer</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    if (isEditing) {
      switch (column.type) {
        case "select":
          return (
            <Select
              value={value as string || "nouveau"}
              onValueChange={(newValue) => handleCellChange(prospect.id, column.id, newValue)}
              onOpenChange={(open) => !open && handleCellBlur()}
            >
              <SelectTrigger className="h-8 border-0 shadow-none focus:ring-2 focus:ring-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {column.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        default:
          return (
            <Input
              value={value as string || "nouveau"}
              onChange={(e) => handleCellChange(prospect.id, column.id, e.target.value)}
              onBlur={handleCellBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  handleCellBlur();
                }
              }}
              className="h-8 border-0 shadow-none focus:ring-2 focus:ring-primary"
              type={column.type === "number" ? "number" : column.type === "date" ? "date" : "text"}
              autoFocus
            />
          );
      }
    }

    // Display mode
    switch (column.id) {
      case "status":
        const statusColors = {
          nouveau: "bg-gray-100 text-gray-800",
          contacte: "bg-blue-100 text-blue-800",
          interesse: "bg-yellow-100 text-yellow-800",
          rappel: "bg-purple-100 text-purple-800",
          ferme: "bg-green-100 text-green-800",
          non_interesse: "bg-red-100 text-red-800",
        };
        return (
          <Badge className={cn("text-xs", statusColors[value as keyof typeof statusColors] || "bg-gray-100 text-gray-800")}>
            {value as string}
          </Badge>
        );
      case "interlocuteurs":
        const interlocuteurs = prospect.prospect_interlocuteurs;
        if (!interlocuteurs || interlocuteurs.length === 0) {
          return <span className="text-muted-foreground text-sm">Aucun interlocuteur</span>;
        }
        return (
          <div className="flex flex-col gap-1">
            {interlocuteurs.map((interlocuteur, index) => (
              <div key={interlocuteur.id} className="flex items-center gap-1">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs truncate" title={`${interlocuteur.name}${interlocuteur.position ? ` (${interlocuteur.position})` : ''}`}>
                  {interlocuteur.name}
                  {interlocuteur.position && ` (${interlocuteur.position})`}
                </span>
              </div>
            ))}
          </div>
        );
      default:
        return <span className="truncate">{value as string || ""}</span>;
    }
  };

  // Get column type icon
  const getColumnTypeIcon = (type: ColumnType) => {
    switch (type) {
      case "text":
        return <Type className="h-4 w-4" />;
      case "number":
        return <Hash className="h-4 w-4" />;
      case "date":
        return <Calendar className="h-4 w-4" />;
      case "checkbox":
        return <Check className="h-4 w-4" />;
      case "action":
        return <MoreHorizontal className="h-4 w-4" />;
      default:
        return <ChevronDown className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-500">Chargement des prospects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background">
      {/* Column Manager */}
      <div className="flex justify-end mb-4 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowColumnManager(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Gérer les colonnes
        </Button>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto" ref={tableRef}>
        <div className="min-w-full">
          {/* Header Row */}
          <div className="sticky top-0 z-10 flex bg-table-header border-b border-table-cell-border">
            {/* Selection header */}
            <div className="w-12 min-w-12 h-10 flex items-center justify-center border-r border-table-cell-border bg-table-header">
              <Checkbox
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                onCheckedChange={handleSelectAll}
                className="h-4 w-4"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            {/* Row number header */}
            <div className="w-12 min-w-12 h-10 flex items-center justify-center border-r border-table-cell-border bg-table-header">
              <span className="text-xs text-table-header-foreground font-medium">#</span>
            </div>

            {columns.map((column) => (
              <div
                key={column.id}
                className={cn(
                  "relative flex items-center h-10 border-r border-table-cell-border bg-table-header transition-colors",
                  hoveredColumn === column.id && "bg-table-row-hover",
                )}
                style={{ width: column.width, minWidth: column.width }}
                draggable={column.type !== "action"}
                onDragStart={column.type !== "action" ? (e) => handleColumnDragStart(e, column.id) : undefined}
                onDragOver={handleColumnDragOver}
                onDrop={(e) => handleColumnDrop(e, column.id)}
                onMouseEnter={() => setHoveredColumn(column.id)}
                onMouseLeave={() => setHoveredColumn(null)}
              >
                {/* Drag handle */}
                {column.type !== "action" && (
                  <div className="flex items-center justify-center w-6 cursor-move">
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}

                {/* Column type icon */}
                <div className="flex items-center justify-center w-6 text-muted-foreground">
                  {getColumnTypeIcon(column.type)}
                </div>

                {/* Column name */}
                <div className="flex-1 px-2">
                  <span className="text-sm font-medium text-table-header-foreground truncate block">
                    {column.name}
                  </span>
                </div>

                {/* Resize handle */}
                {column.type !== "action" && (
                  <div
                    className={cn(
                      "absolute right-0 top-0 w-1 h-full cursor-col-resize transition-colors",
                      "hover:bg-table-resize-handle-hover bg-table-resize-handle",
                      resizingColumn === column.id && "bg-table-resize-handle-hover",
                    )}
                    onMouseDown={(e) => handleResizeStart(e, column.id)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {prospects.map((prospect, rowIndex) => (
            <div
              key={prospect.id}
              className={cn(
                "flex transition-colors",
                rowIndex % 2 === 0 ? "bg-table-row-even" : "bg-table-row-odd",
                hoveredRow === prospect.id && "bg-table-row-hover",
                selectedProspects.has(prospect.id) && "bg-blue-50",
              )}
              onMouseEnter={() => setHoveredRow(prospect.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* Selection checkbox */}
              <div className="w-12 min-w-12 h-10 flex items-center justify-center border-r border-b border-table-cell-border bg-table-header group">
                <Checkbox
                  checked={selectedProspects.has(prospect.id)}
                  onCheckedChange={(checked) => handleSelectProspect(prospect.id, checked as boolean)}
                  className="h-4 w-4"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              
              {/* Row number */}
              <div className="w-12 min-w-12 h-10 flex items-center justify-center border-r border-b border-table-cell-border bg-table-header group">
                <span className="text-xs text-muted-foreground">{rowIndex + 1}</span>
              </div>

              {columns.map((column) => (
                <div
                  key={`${prospect.id}-${column.id}`}
                  className={cn(
                    "flex items-center px-3 h-10 border-r border-b border-table-cell-border transition-colors",
                    column.editable !== false && "cursor-pointer",
                    hoveredColumn === column.id && "bg-table-row-hover",
                  )}
                  style={{ width: column.width, minWidth: column.width }}
                  onClick={() => handleCellClick(prospect.id, column.id)}
                  onMouseEnter={() => setHoveredColumn(column.id)}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  {renderCell(prospect, column)}
                </div>
              ))}
            </div>
          ))}

          {/* Empty State */}
          {prospects.length === 0 && (
            <div className="flex items-center justify-center h-32 text-slate-500">
              <div className="text-center">
                <Building className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <p>Aucun prospect dans cette liste</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedProspects.size > 0 && (
        <div className="sticky bottom-0 bg-blue-50 border-t border-blue-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-900">
              {selectedProspects.size} prospect{selectedProspects.size > 1 ? 's' : ''} sélectionné{selectedProspects.size > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedProspects(new Set())}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteSelectedProspects}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
            <Button
              size="sm"
              onClick={() => setShowBulkCampaignModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="h-4 w-4 mr-2" />
              Ajouter à une campagne
            </Button>
          </div>
        </div>
      )}

      <AddInterlocuteurModal
        open={showAddInterlocuteurModal}
        onOpenChange={setShowAddInterlocuteurModal}
        prospectId={selectedProspectForInterlocuteur || ''}
        onSuccess={() => {
          // Refresh prospects to show updated data
          fetchProspects();
        }}
      />

      <ChangeStatusModal
        open={showChangeStatusModal}
        onOpenChange={setShowChangeStatusModal}
        prospectId={selectedProspectForStatus?.id || ''}
        currentStatus={selectedProspectForStatus?.status || ''}
        prospectName={selectedProspectForStatus?.name || ''}
        onSuccess={() => {
          // Refresh prospects to show updated data
          fetchProspects();
        }}
      />

      <AddNoteModal
        open={showAddNoteModal}
        onOpenChange={setShowAddNoteModal}
        prospectId={selectedProspectForNote?.id || ''}
        prospectName={selectedProspectForNote?.name || ''}
        onSuccess={() => {
          // Refresh prospects to show updated data
          fetchProspects();
        }}
      />

      <ProspectEmailDialog
        isOpen={showEmailDialog}
        onClose={() => {
          setShowEmailDialog(false);
          setSelectedProspectForEmail(null);
        }}
        prospect={selectedProspectForEmail}
        onEmailSent={() => {
          // Optionally refresh prospects or show success message
          toast.success('Email sent successfully');
        }}
      />

      <BulkCampaignModal
        isOpen={showBulkCampaignModal}
        onClose={() => {
          setShowBulkCampaignModal(false);
          setSelectedProspects(new Set());
        }}
        selectedProspectIds={Array.from(selectedProspects)}
        onSuccess={() => {
          // Optionally refresh prospects or show success message
          toast.success('Campaign created successfully');
        }}
      />

      <EmailHistoryModal
        isOpen={showEmailHistory}
        onClose={() => {
          setShowEmailHistory(false);
          setSelectedProspectForHistory(null);
        }}
        prospect={selectedProspectForHistory}
      />

      {/* Column Manager Modal */}
      {showColumnManager && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowColumnManager(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Gérer les colonnes</h3>

            <div className="space-y-4">
              {/* Add New Column */}
              <div>
                <label className="block text-sm font-medium mb-2">Ajouter une colonne</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nom de la colonne"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addColumn();
                      }
                    }}
                  />
                  <Select value={newColumnType} onValueChange={(type: ColumnType) => setNewColumnType(type)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texte</SelectItem>
                      <SelectItem value="number">Nombre</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="checkbox">Case</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addColumn} disabled={!newColumnName.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Existing Custom Columns */}
              <div>
                <label className="block text-sm font-medium mb-2">Colonnes personnalisées</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {columns
                    .filter(col => !baseProspectColumns.some(baseCol => baseCol.id === col.id))
                    .map(column => (
                      <div key={column.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          {getColumnTypeIcon(column.type)}
                          <span className="text-sm">{column.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeColumn(column.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  {columns.filter(col => !baseProspectColumns.some(baseCol => baseCol.id === col.id)).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">Aucune colonne personnalisée</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowColumnManager(false)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { ChevronDown, GripVertical, Plus, Trash2, Calendar, Hash, Type, Check, Phone, Mail, User, Building, Edit, MoreHorizontal, UserPlus, StickyNote, MoreVertical, ArrowUpDown, Grid3X3, List, Settings, Pin, Palette, Upload } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AddInterlocuteurModal } from "./AddInterlocuteurModal";
import { ChangeStatusModal } from "./ChangeStatusModal";
import { AddNoteModal } from "./AddNoteModal";
import { ProspectEmailDialog } from "./ProspectEmailDialog";
import { BulkCampaignModal } from "./BulkCampaignModal";
import { EmailHistoryModal } from "./EmailHistoryModal";
import { StatusManagementModal } from "./StatusManagementModal";
import { ImportCsvModal } from "./ImportCsvModal";

// Prospect Overview Card Component
function ProspectOverviewCard({
  prospect,
  onEdit,
  onCall,
  onEmail,
  onNote,
  onStatusChange,
  onDelete,
  statusOptions
}: {
  prospect: Prospect;
  onEdit: () => void;
  onCall: () => void;
  onEmail: () => void;
  onNote: () => void;
  onStatusChange: () => void;
  onDelete: () => void;
  statusOptions: StatusOption[];
}) {
  // Get status color from status options
  const getStatusColor = (statusName: string) => {
    const statusOption = statusOptions.find(option => option.name === statusName);
    if (statusOption) {
      // Convert hex color to Tailwind classes
      const color = statusOption.color;
      // For now, return a simple mapping. In a real implementation, you might want to
      // dynamically generate Tailwind classes or use inline styles
      const colorMap: Record<string, string> = {
        '#6B7280': 'bg-gray-100 text-gray-800',
        '#8B5CF6': 'bg-purple-100 text-purple-800',
        '#F59E0B': 'bg-orange-100 text-orange-800',
        '#3B82F6': 'bg-blue-100 text-blue-800',
        '#EF4444': 'bg-red-100 text-red-800',
        '#DC2626': 'bg-red-200 text-red-900',
        '#10B981': 'bg-green-100 text-green-800',
        '#059669': 'bg-emerald-100 text-emerald-800',
      };
      return colorMap[color] || 'bg-gray-100 text-gray-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="backdrop-blur-lg bg-white/20 border border-white/10 shadow-lg hover:shadow-xl transition-all rounded-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 p-6 border-b border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
              {prospect.data.name}
            </CardTitle>
            <CardDescription className="mt-1 text-white/70">
              {prospect.data.industry && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <Building className="h-3 w-3" />
                  {prospect.data.industry}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {prospect.status && (
              <Badge className={cn(
                "animate-pulse text-xs font-medium",
                getStatusColor(prospect.status)
              )}>
                {prospect.status === "none" || !prospect.status ? "Status" : prospect.status}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onEdit} className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  <span>Modifier</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCall} disabled={!prospect.data.phone} className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>Appeler</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEmail} disabled={!prospect.data.email} className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>Envoyer email</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onNote} className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  <span>Ajouter note</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onStatusChange} className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  <span>Changer statut</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="flex items-center gap-2 text-red-600 focus:text-red-600">
                  <Trash2 className="h-4 w-4" />
                  <span>Supprimer</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact Information */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact
            </h4>
            <div className="space-y-1 text-sm">
              {prospect.data.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate" title={prospect.data.email}>{prospect.data.email}</span>
                </div>
              )}
              {prospect.data.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span>{prospect.data.phone}</span>
                </div>
              )}
              {prospect.data.website && (
                <div className="flex items-center gap-2">
                  <Building className="h-3 w-3 text-muted-foreground" />
                  <a href={prospect.data.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate" title={prospect.data.website}>
                    Site web
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Business Information */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building className="h-4 w-4" />
              Business
            </h4>
            <div className="space-y-1 text-sm">
              {prospect.data.industry && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Secteur:</span>
                  <span>{prospect.data.industry}</span>
                </div>
              )}
              {prospect.rappel_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>Rappel: {new Date(prospect.rappel_date).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Créé: {new Date(prospect.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={onCall} disabled={!prospect.data.phone}>
            <Phone className="h-4 w-4 mr-1" />
            Appeler
          </Button>
          <Button variant="outline" size="sm" onClick={onEmail} disabled={!prospect.data.email}>
            <Mail className="h-4 w-4 mr-1" />
            Email
          </Button>
          <Button variant="outline" size="sm" onClick={onNote}>
            <StickyNote className="h-4 w-4 mr-1" />
            Note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


// Column types
type ColumnType = "text" | "number" | "select" | "checkbox" | "date" | "action";

interface Column {
  id: string;
  name: string;
  type: ColumnType;
  width: number;
  options?: string[]; // For select type
  editable?: boolean;
  visible?: boolean; // For showing/hiding columns
  isBase?: boolean; // To identify base columns
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

interface StatusOption {
  id: string;
  name: string;
  color: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ProspectsGridProps {
  listId: string;
}

// Define our base columns for prospects
const baseProspectColumns: Column[] = [
  { id: "name", name: "Nom de l'entreprise", type: "text", width: 200, editable: true, visible: true, isBase: true },
  { id: "email", name: "Email", type: "text", width: 180, editable: true, visible: true, isBase: true },
  { id: "phone", name: "Téléphone", type: "text", width: 150, editable: true, visible: true, isBase: true },
  { id: "industry", name: "Secteur", type: "text", width: 150, editable: true, visible: true, isBase: true },
  { id: "website", name: "Site web", type: "text", width: 150, editable: true, visible: true, isBase: true },
  { id: "rappel", name: "Rappel", type: "date", width: 150, editable: true, visible: true, isBase: true },
  { id: "status", name: "Statut", type: "select", width: 150, editable: true, visible: true, isBase: true, options: [] }, // Will be populated dynamically
  { id: "interlocuteurs", name: "Interlocuteurs", type: "text", width: 180, editable: false, visible: true, isBase: true },
  { id: "actions", name: "Actions", type: "action", width: 100, editable: false, visible: true, isBase: true },
];

export function ProspectsGrid({ listId }: ProspectsGridProps) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>(() => {
    const savedColumns = localStorage.getItem(`prospects-columns-${listId}`);
    const savedVisibility = localStorage.getItem(`prospects-column-visibility-${listId}`);
    
    let customColumns: Column[] = [];
    let columnVisibility: Record<string, boolean> = {};
    
    if (savedColumns) {
      try {
        customColumns = JSON.parse(savedColumns);
      } catch (error) {
        console.error('Error parsing saved columns:', error);
      }
    }
    
    if (savedVisibility) {
      try {
        columnVisibility = JSON.parse(savedVisibility);
      } catch (error) {
        console.error('Error parsing column visibility:', error);
      }
    }
    
    // Merge base columns with saved visibility and custom columns
    const mergedColumns = baseProspectColumns.map(col => ({
      ...col,
      visible: columnVisibility[col.id] !== undefined ? columnVisibility[col.id] : col.visible
    }));
    
    return [...mergedColumns, ...customColumns];
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
  const [interlocuteurPopoverOpen, setInterlocuteurPopoverOpen] = useState<string | null>(null);
  const [showStatusManagement, setShowStatusManagement] = useState(false);
  const [showImportCsv, setShowImportCsv] = useState(false);
  const [editingInterlocuteur, setEditingInterlocuteur] = useState<string | null>(null);
  const [editInterlocuteurData, setEditInterlocuteurData] = useState<Partial<Interlocuteur>>({});
  const [rowHeight, setRowHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`prospects-row-height-${listId}`);
      return saved ? parseInt(saved) : 40; // Default 40px height
    }
    return 40;
  });
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(`prospects-view-mode-${listId}`) as 'table' | 'cards') || 'table';
    }
    return 'table';
  });
  const [sortColumn, setSortColumn] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`prospects-sort-column-${listId}`) || 'created_at';
    }
    return 'created_at';
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(`prospects-sort-direction-${listId}`) as 'asc' | 'desc') || 'desc';
    }
    return 'desc';
  });
  const [headerFrozen, setHeaderFrozen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`prospects-header-frozen-${listId}`) !== 'false'; // Default to true
    }
    return true;
  });

  const tableRef = useRef<HTMLDivElement>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  // Fetch status options
  const fetchStatusOptions = async () => {
    try {
      const res = await fetch('/api/prospects/status-options');
      const data = await res.json();
      
      if (data.statusOptions) {
        setStatusOptions(data.statusOptions);
        
        // Update the status column options
        setColumns(prev => prev.map(col => {
          if (col.id === 'status') {
            return {
              ...col,
              options: ['none', ...data.statusOptions.map((option: StatusOption) => option.name)]
            };
          }
          return col;
        }));
      }
    } catch (error) {
      console.error("Error fetching status options:", error);
      toast.error("Erreur lors du chargement des options de statut");
    }
  };

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
      fetchStatusOptions();
      fetchProspects();
    }
  }, [listId]);

  // Selection functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProspects(new Set(sortedProspects.map(p => p.id)));
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

  // Sorting functionality
  const handleSort = (columnId: string) => {
    let newSortColumn = sortColumn;
    let newSortDirection = sortDirection;

    if (sortColumn === columnId) {
      // Toggle direction if same column
      newSortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newSortDirection);
    } else {
      // New column, default to ascending
      newSortColumn = columnId;
      newSortDirection = 'asc';
      setSortColumn(newSortColumn);
      setSortDirection(newSortDirection);
    }

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`prospects-sort-column-${listId}`, newSortColumn);
      localStorage.setItem(`prospects-sort-direction-${listId}`, newSortDirection);
    }
  };

  // Sort prospects based on current sort settings
  const sortedProspects = React.useMemo(() => {
    return [...prospects].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Get values based on column
      if (sortColumn === 'created_at' || sortColumn === 'updated_at') {
        aValue = new Date(a[sortColumn as keyof Prospect] as string).getTime();
        bValue = new Date(b[sortColumn as keyof Prospect] as string).getTime();
      } else if (sortColumn === 'rappel') {
        aValue = a.rappel_date ? new Date(a.rappel_date).getTime() : 0;
        bValue = b.rappel_date ? new Date(b.rappel_date).getTime() : 0;
      } else if (sortColumn === 'status') {
        aValue = a.status;
        bValue = b.status;
      } else if (sortColumn.startsWith('custom_')) {
        aValue = a.data[sortColumn as keyof typeof a.data] || '';
        bValue = b.data[sortColumn as keyof typeof b.data] || '';
      } else {
        aValue = a.data[sortColumn as keyof typeof a.data] || '';
        bValue = b.data[sortColumn as keyof typeof b.data] || '';
      }

      // Handle empty/null values
      if (!aValue && bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue && !bValue) return sortDirection === 'asc' ? 1 : -1;
      if (!aValue && !bValue) {
        // For stability, use ID as tiebreaker when values are equal
        return a.id.localeCompare(b.id);
      }

      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'fr', { sensitivity: 'base' });
        if (comparison !== 0) {
          return sortDirection === 'asc' ? comparison : -comparison;
        }
      } else if (aValue !== bValue) {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      }

      // For stability, use ID as tiebreaker
      return a.id.localeCompare(b.id);
    });
  }, [prospects, sortColumn, sortDirection]);

  const isAllSelected = sortedProspects.length > 0 && selectedProspects.size === sortedProspects.length;
  const isIndeterminate = selectedProspects.size > 0 && selectedProspects.size < sortedProspects.length;

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
      setSelectedRow(rowId);
    }
  };

  const handleCellChange = async (rowId: string, columnId: string, value: any) => {
    // Update local state immediately for better UX
    setProspects((prev) =>
      prev.map((prospect) => {
        if (prospect.id === rowId) {
          if (columnId === 'status') {
            // Convert "none" to null for status field
            const finalValue = value === 'none' ? null : value;
            return { ...prospect, [columnId]: finalValue };
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
        // Convert "none" to null for status field
        const finalValue = (columnId === 'status' && value === 'none') ? null : value;
        requestBody[columnId] = finalValue;
        // isDataField should be true for data fields (name, email, phone, etc.) and false for direct fields (status)
        requestBody.isDataField = columnId !== 'status';
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
    setSelectedRow(null);
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

  // Toggle column visibility
  const toggleColumnVisibility = (columnId: string) => {
    const newColumns = columns.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    setColumns(newColumns);

    // Save visibility to localStorage
    const visibility: Record<string, boolean> = {};
    newColumns.forEach(col => {
      if (col.isBase) {
        visibility[col.id] = col.visible || false;
      }
    });
    localStorage.setItem(`prospects-column-visibility-${listId}`, JSON.stringify(visibility));
  };

  // Handle row height change
  const handleRowHeightChange = (newHeight: number) => {
    setRowHeight(newHeight);
    localStorage.setItem(`prospects-row-height-${listId}`, newHeight.toString());
  };

  // Handle view mode change
  const handleViewModeChange = (mode: 'table' | 'cards') => {
    setViewMode(mode);
    localStorage.setItem(`prospects-view-mode-${listId}`, mode);
  };

  // Handle header freeze toggle
  const handleHeaderFreezeToggle = (frozen: boolean) => {
    setHeaderFrozen(frozen);
    localStorage.setItem(`prospects-header-frozen-${listId}`, frozen.toString());
  };

  // Handle interlocuteur edit
  const handleEditInterlocuteur = (interlocuteur: Interlocuteur) => {
    setEditingInterlocuteur(interlocuteur.id);
    setEditInterlocuteurData({
      name: interlocuteur.name,
      email: interlocuteur.email || '',
      phone: interlocuteur.phone || '',
      position: interlocuteur.position || '',
      notes: interlocuteur.notes || '',
    });
  };

  const handleSaveInterlocuteur = async (interlocuteurId: string) => {
    try {
      const res = await fetch(`/api/prospects/interlocuteurs/${interlocuteurId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editInterlocuteurData),
      });

      if (!res.ok) {
        throw new Error('Failed to update interlocuteur');
      }

      // Refresh prospects to show updated data
      await fetchProspects();
      setEditingInterlocuteur(null);
      setEditInterlocuteurData({});
      toast.success("Interlocuteur mis à jour");
    } catch (error) {
      console.error('Error updating interlocuteur:', error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleCancelEditInterlocuteur = () => {
    setEditingInterlocuteur(null);
    setEditInterlocuteurData({});
  };

  // Handle interlocuteur delete
  const handleDeleteInterlocuteur = async (interlocuteurId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet interlocuteur ?")) {
      return;
    }

    try {
      const res = await fetch(`/api/prospects/interlocuteurs/${interlocuteurId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete interlocuteur');
      }

      // Refresh prospects to show updated data
      await fetchProspects();
      setInterlocuteurPopoverOpen(null);
      toast.success("Interlocuteur supprimé");
    } catch (error) {
      console.error('Error deleting interlocuteur:', error);
      toast.error("Erreur lors de la suppression");
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
              value={value === null ? "none" : (value as string || "none")}
              onValueChange={(newValue) => handleCellChange(prospect.id, column.id, newValue)}
              onOpenChange={(open) => !open && handleCellBlur()}
            >
              <SelectTrigger className="h-8 border-0 shadow-none focus:ring-0 bg-transparent hover:bg-gray-50/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                {column.options?.map((option) => (
                  <SelectItem key={option} value={option} className="hover:bg-gray-50/50 focus:bg-gray-50/50">
                    {option === "none" ? "Status" : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        default:
          return (
            <Input
              value={value as string || ""}
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
        // Get status color from status options
        const getStatusColor = (statusName: string) => {
          const statusOption = statusOptions.find(option => option.name === statusName);
          if (statusOption) {
            // Convert hex color to Tailwind classes
            const color = statusOption.color;
            const colorMap: Record<string, string> = {
              '#6B7280': 'bg-gray-100 text-gray-800',
              '#8B5CF6': 'bg-purple-100 text-purple-800',
              '#F59E0B': 'bg-orange-100 text-orange-800',
              '#3B82F6': 'bg-blue-100 text-blue-800',
              '#EF4444': 'bg-red-100 text-red-800',
              '#DC2626': 'bg-red-200 text-red-900',
              '#10B981': 'bg-green-100 text-green-800',
              '#059669': 'bg-emerald-100 text-emerald-800',
            };
            return colorMap[color] || 'bg-gray-100 text-gray-800';
          }
          return 'bg-gray-100 text-gray-800';
        };
        return (
          <Badge className={cn("text-xs", getStatusColor(value as string))}>
            {value === "none" || !value ? "Status" : value as string}
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
              <Popover
                key={interlocuteur.id}
                open={interlocuteurPopoverOpen === interlocuteur.id}
                onOpenChange={(open) => setInterlocuteurPopoverOpen(open ? interlocuteur.id : null)}
              >
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 hover:bg-blue-50/50 px-1 py-0.5 rounded text-left w-full">
                    <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs truncate" title={`${interlocuteur.name}${interlocuteur.position ? ` (${interlocuteur.position})` : ''}`}>
                      {interlocuteur.name}
                      {interlocuteur.position && ` (${interlocuteur.position})`}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0" align="start">
                  <Card className="border-0 shadow-lg">
                    {editingInterlocuteur === interlocuteur.id ? (
                      // Edit Mode
                      <>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Edit className="h-5 w-5" />
                            Modifier l'interlocuteur
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Nom *</label>
                            <Input
                              value={editInterlocuteurData.name || ''}
                              onChange={(e) => setEditInterlocuteurData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Nom de l'interlocuteur"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Email</label>
                            <Input
                              type="email"
                              value={editInterlocuteurData.email || ''}
                              onChange={(e) => setEditInterlocuteurData(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="email@exemple.com"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Téléphone</label>
                            <Input
                              value={editInterlocuteurData.phone || ''}
                              onChange={(e) => setEditInterlocuteurData(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="+33 6 XX XX XX XX"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Poste</label>
                            <Input
                              value={editInterlocuteurData.position || ''}
                              onChange={(e) => setEditInterlocuteurData(prev => ({ ...prev, position: e.target.value }))}
                              placeholder="Directeur commercial, etc."
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Notes</label>
                            <textarea
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                              rows={3}
                              value={editInterlocuteurData.notes || ''}
                              onChange={(e) => setEditInterlocuteurData(prev => ({ ...prev, notes: e.target.value }))}
                              placeholder="Notes supplémentaires..."
                            />
                          </div>

                          <div className="flex gap-2 pt-4">
                            <Button
                              onClick={() => handleSaveInterlocuteur(interlocuteur.id)}
                              disabled={!editInterlocuteurData.name?.trim()}
                              className="flex-1"
                            >
                              Sauvegarder
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleCancelEditInterlocuteur}
                              className="flex-1"
                            >
                              Annuler
                            </Button>
                          </div>
                        </CardContent>
                      </>
                    ) : (
                      // View Mode
                      <>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="h-6 w-6 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <CardTitle className="text-lg">{interlocuteur.name}</CardTitle>
                                {interlocuteur.position && (
                                  <CardDescription className="text-sm text-gray-600">
                                    {interlocuteur.position}
                                  </CardDescription>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditInterlocuteur(interlocuteur)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteInterlocuteur(interlocuteur.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {interlocuteur.email ? (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <a
                                href={`mailto:${interlocuteur.email}`}
                                className="text-sm text-blue-600 hover:underline truncate"
                              >
                                {interlocuteur.email}
                              </a>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-300 flex-shrink-0" />
                              <span className="text-sm text-gray-400 italic">Aucun email</span>
                            </div>
                          )}

                          {interlocuteur.phone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <a
                                href={`tel:${interlocuteur.phone}`}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {interlocuteur.phone}
                              </a>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-300 flex-shrink-0" />
                              <span className="text-sm text-gray-400 italic">Aucun téléphone</span>
                            </div>
                          )}

                          {interlocuteur.notes ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <StickyNote className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-700">Notes</span>
                              </div>
                              <p className="text-sm text-gray-600 pl-6">{interlocuteur.notes}</p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <StickyNote className="h-4 w-4 text-gray-300 flex-shrink-0" />
                              <span className="text-sm text-gray-400 italic">Aucune note</span>
                            </div>
                          )}

                          <div className="text-xs text-gray-500 pt-2 border-t">
                            Créé le {new Date(interlocuteur.created_at).toLocaleDateString('fr-FR')}
                            {interlocuteur.updated_at !== interlocuteur.created_at && (
                              <span className="ml-2">
                                • Modifié le {new Date(interlocuteur.updated_at).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </>
                    )}
                  </Card>
                </PopoverContent>
              </Popover>
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
    <div className="w-full bg-white h-full flex flex-col">
      {/* Toolbar - Google Sheets style */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3" />
              Cliquez sur les en-têtes pour trier
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building className="h-4 w-4" />
            <span className="font-medium">{sortedProspects.length}</span>
            <span>prospect{sortedProspects.length > 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          <Button
            size="sm"
            onClick={() => {
              // TODO: Add create prospect functionality
              toast.info("Fonctionnalité d'ajout de prospect à venir");
            }}
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter prospect
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportCsv(true)}
            className="h-8"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importer CSV
          </Button>
          
          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('table')}
              className="h-8 px-3 rounded-none border-0"
            >
              <List className="h-4 w-4 mr-1" />
              Tableau
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('cards')}
              className="h-8 px-3 rounded-none border-0"
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              Cartes
            </Button>
          </div>
          
          <Button
            variant={headerFrozen ? "default" : "outline"}
            size="sm"
            onClick={() => handleHeaderFreezeToggle(!headerFrozen)}
            title={headerFrozen ? "Désactiver l'en-tête fixe" : "Activer l'en-tête fixe"}
            className="h-8"
          >
            <Pin className="h-4 w-4 mr-2" />
            En-tête fixe
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStatusManagement(true)}
            className="h-8"
          >
            <Palette className="h-4 w-4 mr-2" />
            Gérer les statuts
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowColumnManager(true)}
            className="h-8"
          >
            <Settings className="h-4 w-4 mr-2" />
            Personnaliser
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'table' ? (
        <div className="flex flex-col flex-1">
          {/* Frozen Header - outside scrollable area */}
          {headerFrozen && (
            <div className="bg-gray-50 border-b border-gray-300" style={{ height: rowHeight }}>
              <div className="flex">
                {/* Selection header */}
                <div className="w-12 min-w-12 flex items-center justify-center border-r border-gray-300 bg-gray-50" style={{ height: rowHeight }}>
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

                {/* Phone CTA header */}
                <div className="w-12 min-w-12 flex items-center justify-center border-r border-gray-300 bg-gray-50" style={{ height: rowHeight }}>
                  <Phone className="h-4 w-4 text-gray-600" />
                </div>

                {/* Row number header */}
                <div className="w-12 min-w-12 flex items-center justify-center border-r border-gray-300 bg-gray-50" style={{ height: rowHeight }}>
                  <span className="text-xs text-gray-600 font-medium">#</span>
                </div>

                {columns.filter(column => column.visible !== false).map((column) => (
                  <div
                    key={`frozen-${column.id}`}
                    className="relative flex items-center border-r border-gray-300 bg-gray-50 transition-colors hover:bg-gray-100"
                    style={{ width: column.width, minWidth: column.width, height: rowHeight }}
                  >
                    {/* Column type icon */}
                    <div className="flex items-center justify-center w-6 text-gray-500">
                      {getColumnTypeIcon(column.type)}
                    </div>

                    {/* Column name */}
                    <div
                      className={cn(
                        "flex-1 px-2 flex items-center gap-1 select-none group",
                        column.type !== "action" && "cursor-pointer hover:bg-gray-100"
                      )}
                      onClick={() => column.type !== "action" && handleSort(column.id)}
                    >
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {column.name}
                      </span>
                      {column.type !== "action" && (
                        <div className="flex items-center">
                          {sortColumn === column.id ? (
                            <ChevronDown
                              className={cn(
                                "h-3 w-3 text-gray-700 transition-transform",
                                sortDirection === 'desc' && "rotate-180"
                              )}
                            />
                          ) : (
                            <div className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity">
                              <ArrowUpDown className="h-3 w-3 text-gray-700" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto h-0" ref={tableRef}>
            <div className="min-w-full">
              {/* Header Row - only shown when not frozen */}
              {!headerFrozen && (
                <div className="flex bg-gray-50 border-b border-gray-300 sticky top-0 z-10" style={{ height: rowHeight }}>
                  {/* Selection header */}
                  <div className="w-12 min-w-12 flex items-center justify-center border-r border-gray-300 bg-gray-50 sticky top-0 z-10" style={{ height: rowHeight }}>
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

                  {/* Phone CTA header */}
                  <div className="w-12 min-w-12 flex items-center justify-center border-r border-gray-300 bg-gray-50 sticky top-0 z-10" style={{ height: rowHeight }}>
                    <Phone className="h-4 w-4 text-gray-600" />
                  </div>

                  {/* Row number header */}
                  <div className="w-12 min-w-12 flex items-center justify-center border-r border-gray-300 bg-gray-50 sticky top-0 z-10" style={{ height: rowHeight }}>
                    <span className="text-xs text-gray-600 font-medium">#</span>
                  </div>

                  {columns.filter(column => column.visible !== false).map((column) => (
                <div
                  key={column.id}
                  className={cn(
                    "relative flex items-center border-r border-gray-300 bg-gray-50 transition-colors sticky top-0 z-10",
                    hoveredColumn === column.id && "bg-gray-100",
                  )}
                  style={{ width: column.width, minWidth: column.width, height: rowHeight }}
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
                      <GripVertical className="h-3 w-3 text-gray-500" />
                    </div>
                  )}

                  {/* Column type icon */}
                  <div className="flex items-center justify-center w-6 text-gray-500">
                    {getColumnTypeIcon(column.type)}
                  </div>

                  {/* Column name */}
                  <div
                    className={cn(
                      "flex-1 px-2 flex items-center gap-1 cursor-pointer select-none group",
                      column.type !== "action" && "hover:bg-gray-100"
                    )}
                    onClick={() => column.type !== "action" && handleSort(column.id)}
                  >
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {column.name}
                    </span>
                    {column.type !== "action" && (
                      <div className="flex items-center">
                        {sortColumn === column.id ? (
                          <ChevronDown
                            className={cn(
                              "h-3 w-3 text-gray-700 transition-transform",
                              sortDirection === 'desc' && "rotate-180"
                            )}
                          />
                        ) : (
                          <div className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity">
                            <ArrowUpDown className="h-3 w-3 text-gray-700" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Resize handle */}
                  {column.type !== "action" && (
                    <div
                      className={cn(
                        "absolute right-0 top-0 w-1 h-full cursor-col-resize transition-colors",
                        "hover:bg-blue-400 bg-transparent",
                        resizingColumn === column.id && "bg-blue-400",
                      )}
                      onMouseDown={(e) => handleResizeStart(e, column.id)}
                    />
                  )}
                </div>
              ))}
              </div>
              )}

              {/* Data Rows */}
            {sortedProspects.map((prospect, rowIndex) => (
              <div
                key={prospect.id}
                className={cn(
                  "flex transition-colors",
                  rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/30",
                  hoveredRow === prospect.id && "bg-blue-50/50",
                  selectedProspects.has(prospect.id) && "bg-blue-50",
                  selectedRow === prospect.id && "bg-blue-100/70 ring-1 ring-blue-300",
                )}
                style={{ height: rowHeight }}
                onMouseEnter={() => setHoveredRow(prospect.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Selection checkbox */}
                <div className="w-12 min-w-12 flex items-center justify-center border-r border-b border-gray-300 bg-gray-50 group" style={{ height: rowHeight }}>
                  <Checkbox
                    checked={selectedProspects.has(prospect.id)}
                    onCheckedChange={(checked) => handleSelectProspect(prospect.id, checked as boolean)}
                    className="h-4 w-4"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Phone CTA Button */}
                <div className="w-12 min-w-12 flex items-center justify-center border-r border-b border-gray-300 bg-gray-50 group" style={{ height: rowHeight }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full bg-green-100 hover:bg-green-200 text-green-700 hover:text-green-800 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (prospect.data.phone) {
                        window.open(`tel:${prospect.data.phone}`, '_self');
                      } else {
                        toast.error("Aucun numéro de téléphone disponible");
                      }
                    }}
                    disabled={!prospect.data.phone}
                  >
                    <Phone className="h-3 w-3" />
                  </Button>
                </div>

                {/* Row number */}
                <div className="w-12 min-w-12 flex items-center justify-center border-r border-b border-gray-300 bg-gray-50 group" style={{ height: rowHeight }}>
                  <span className="text-xs text-gray-500">{rowIndex + 1}</span>
                </div>

                {columns.filter(column => column.visible !== false).map((column) => (
                  <div
                    key={`${prospect.id}-${column.id}`}
                    className={cn(
                      "flex items-center px-3 border-r border-b border-gray-300 transition-colors",
                      column.editable !== false && "cursor-pointer",
                      hoveredColumn === column.id && "bg-blue-50/50",
                    )}
                    style={{ width: column.width, minWidth: column.width, height: rowHeight }}
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
            {sortedProspects.length === 0 && (
              <div className="flex items-center justify-center h-32 text-slate-500">
                <div className="text-center">
                  <Building className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <p>Aucun prospect dans cette liste</p>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      ) : (
        /* Cards View */
        <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
          {sortedProspects.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <Building className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>Aucun prospect dans cette liste</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedProspects.map((prospect) => (
                <ProspectOverviewCard
                  key={prospect.id}
                  prospect={prospect}
                  statusOptions={statusOptions}
                  onEdit={() => {
                    // Handle edit - could open a modal or navigate to edit page
                    console.log('Edit prospect:', prospect.id);
                  }}
                  onCall={() => {
                    if (prospect.data.phone) {
                      window.open(`tel:${prospect.data.phone}`, '_self');
                    } else {
                      toast.error("Aucun numéro de téléphone disponible");
                    }
                  }}
                  onEmail={() => {
                    setSelectedProspectForEmail(prospect);
                    setShowEmailDialog(true);
                  }}
                  onNote={() => {
                    setSelectedProspectForNote({
                      id: prospect.id,
                      name: prospect.data.name
                    });
                    setShowAddNoteModal(true);
                  }}
                  onStatusChange={() => {
                    setSelectedProspectForStatus({
                      id: prospect.id,
                      name: prospect.data.name,
                      status: prospect.status
                    });
                    setShowChangeStatusModal(true);
                  }}
                  onDelete={() => deleteProspect(prospect.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedProspects.size > 0 && (
        <div className="sticky bottom-0 bg-blue-50 border-t border-gray-300 p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {selectedProspects.size} prospect{selectedProspects.size > 1 ? 's' : ''} sélectionné{selectedProspects.size > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedProspects(new Set())}
              className="border-gray-300"
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

      <StatusManagementModal
        isOpen={showStatusManagement}
        onClose={() => setShowStatusManagement(false)}
        onStatusOptionsChange={() => {
          fetchStatusOptions();
        }}
      />

      <ImportCsvModal
        open={showImportCsv}
        onOpenChange={setShowImportCsv}
        listId={listId}
        onSuccess={() => {
          fetchProspects();
        }}
      />

      {/* Column Manager Modal */}
      {showColumnManager && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowColumnManager(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-gray-200 p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Personnaliser l'affichage</h3>
            <p className="text-sm text-gray-600 mb-4">Organisez vos colonnes et ajustez la présentation</p>

            <div className="space-y-6">
              {/* Row Height Control */}
              <div>
                <label className="block text-sm font-medium mb-2">Hauteur des lignes</label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">Compact</span>
                  <input
                    type="range"
                    min="30"
                    max="80"
                    value={rowHeight}
                    onChange={(e) => handleRowHeightChange(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600">Large</span>
                  <span className="text-sm font-medium w-12 text-center">{rowHeight}px</span>
                </div>
              </div>

              {/* Add New Column */}
              <div>
                <label className="block text-sm font-medium mb-2">Ajouter une colonne personnalisée</label>
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

              {/* Column Visibility */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Visibilité des colonnes</label>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50/30">
                  {columns.map(column => (
                    <div key={column.id} className="flex items-center justify-between p-2 hover:bg-white rounded transition-colors">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={column.visible !== false}
                          onCheckedChange={() => toggleColumnVisibility(column.id)}
                          className="border-gray-300"
                        />
                        <div className="flex items-center gap-2">
                          {getColumnTypeIcon(column.type)}
                          <span className="text-sm text-gray-700">{column.name}</span>
                          {column.isBase && (
                            <Badge variant="default" className="text-xs bg-gray-100 text-gray-700 border-gray-200">Base</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!column.isBase && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeColumn(column.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {column.type !== "action" && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <GripVertical className="h-3 w-3" />
                            <span>{column.width}px</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Décochez une colonne pour la masquer. Les colonnes de base peuvent être masquées mais pas supprimées.
                </p>
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

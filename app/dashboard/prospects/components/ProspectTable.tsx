import { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, MoreHorizontal, ChevronLeft, ChevronRight, Search, MessageSquare, Trash2, Download, Mail, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResizableHeader } from "@/components/ui/resizable-header";
import { StatusDropdown } from "./StatusDropdown";
import { RappelDatePicker } from "./RappelDatePicker";
import { toast } from "sonner";

type SortDirection = 'asc' | 'desc' | null;

interface ProspectTableProps {
  columns: any[];
  prospects: any[];
  loading: boolean;
  onRefresh: () => void;
  visibleColumns?: string[]; // Optional array of visible column IDs
  searchTerm?: string;
  selectedProspects?: string[];
  onSelectionChange?: (selected: string[]) => void;
}

// Default column widths
const DEFAULT_COLUMN_WIDTHS = {
  select: 50,
  call: 60,
  status: 130,
  commentaire: 180,
  rappel: 150,
  actions: 80,
  // Dynamic columns will default to 120px
};

export function ProspectTable({ columns, prospects: initialProspects, loading, onRefresh, visibleColumns, searchTerm, selectedProspects, onSelectionChange }: ProspectTableProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [prospects, setProspects] = useState(initialProspects);
  const [editingCell, setEditingCell] = useState<{
    prospectId: string;
    column: string;
    value: string;
  } | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Column width state with localStorage persistence
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('prospect-table-column-widths');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Initialize dynamic columns with default width if not saved
          const dynamicDefaults: Record<string, number> = {};
          columns.forEach(col => {
            if (!parsed[col.id]) {
              dynamicDefaults[col.id] = 120;
            }
          });
          return { ...DEFAULT_COLUMN_WIDTHS, ...dynamicDefaults, ...parsed };
        } catch {
          // Initialize all dynamic columns with default width
          const dynamicDefaults: Record<string, number> = {};
          columns.forEach(col => {
            dynamicDefaults[col.id] = 120;
          });
          return { ...DEFAULT_COLUMN_WIDTHS, ...dynamicDefaults };
        }
      }
    }
    // Initialize all dynamic columns with default width
    const dynamicDefaults: Record<string, number> = {};
    columns.forEach(col => {
      dynamicDefaults[col.id] = 120;
    });
    return { ...DEFAULT_COLUMN_WIDTHS, ...dynamicDefaults };
  });

  // Save column widths to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prospect-table-column-widths', JSON.stringify(columnWidths));
    }
  }, [columnWidths]);

  // Update column widths when columns change
  useEffect(() => {
    setColumnWidths(prev => {
      const newWidths = { ...prev };
      let hasChanges = false;

      columns.forEach(col => {
        if (!(col.id in newWidths)) {
          newWidths[col.id] = 120;
          hasChanges = true;
        }
      });

      return hasChanges ? newWidths : prev;
    });
  }, [columns]);

  // Handle column width change
  const handleColumnWidthChange = (columnId: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnId]: width
    }));
  };

  // Update local state when props change
  useEffect(() => {
    setProspects(initialProspects);
  }, [initialProspects]);

  // Reset to page 1 when limit changes
  useEffect(() => {
    setPage(1);
  }, [limit]);

  // Framer Motion handles scroll progress for header animation via useScroll

  // Filter columns based on visibility
  const displayColumns = visibleColumns 
    ? columns.filter(col => visibleColumns.includes(col.id))
    : columns;

  // Optimistic update function
  const updateProspectOptimistically = (prospectId: string, updates: any) => {
    setProspects(prevProspects => 
      prevProspects.map(prospect => 
        prospect.id === prospectId 
          ? { ...prospect, ...updates }
          : prospect
      )
    );
  };

  // Handle phone call
  const handleCall = (phoneNumber: string) => {
    // Use tel: protocol to trigger system phone call
    window.location.href = `tel:${phoneNumber}`;
    
    // Log the call (optional)
    toast.success(`Calling ${phoneNumber}`);
  };

  // Handle cell edit
  const handleCellEdit = (prospectId: string, column: string, value: string) => {
    setEditingCell({ prospectId, column, value });
  };

  // Save cell edit
  const handleSaveEdit = async (prospectId: string) => {
    if (!editingCell) return;
    
    try {
      const prospect = prospects.find(p => p.id === prospectId);
      if (!prospect) return;
      
      // Optimistic update
      const updatedData = {
        ...prospect.data,
        [editingCell.column]: editingCell.value
      };
      updateProspectOptimistically(prospectId, { data: updatedData });
      
      // API call
      const response = await fetch(`/api/prospects/${prospectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          data: updatedData
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to update prospect");
        // Revert optimistic update on error
        setProspects(initialProspects);
      }
      
      toast.success("Prospect updated successfully");
    } catch (error) {
      console.error("Error updating prospect:", error);
      toast.error("Failed to update prospect");
      // Revert optimistic update on error
      setProspects(initialProspects);
    } finally {
      setEditingCell(null);
    }
  };

  // Handle system column updates (status, commentaire, rappel)
  const handleSystemColumnUpdate = async (prospectId: string, column: string, value: any) => {
    try {
      // Optimistic update
      const updates: any = {};
      updates[column] = value;
      updateProspectOptimistically(prospectId, updates);
      
      const updateData: any = {};
      updateData[column] = value;
      
      const response = await fetch(`/api/prospects/${prospectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error("Failed to update prospect");
      }
      
      toast.success("Prospect updated successfully");
    } catch (error) {
      console.error("Error updating prospect:", error);
      toast.error("Failed to update prospect");
      // Revert optimistic update on error
      setProspects(initialProspects);
    }
  };

  // Handle key press in edit mode
  const handleKeyPress = (e: React.KeyboardEvent, prospectId: string) => {
    if (e.key === "Enter") {
      handleSaveEdit(prospectId);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  // Filter prospects by search term
  const filteredProspects = searchTerm
    ? prospects.filter(prospect => {
        const data = prospect.data;
        const systemData = {
          status: prospect.status,
          commentaire: prospect.commentaire,
        };

        return Object.values({...data, ...systemData}).some(
          value =>
            value &&
            value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
    : prospects;

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null (no sort)
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setPage(1); // Reset to first page when sorting
  };

  // Sort prospects
  const sortedProspects = [...filteredProspects].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;

    let aValue: any;
    let bValue: any;

    // Handle system columns
    if (sortColumn === 'status') {
      aValue = a.status || '';
      bValue = b.status || '';
    } else if (sortColumn === 'commentaire') {
      aValue = a.commentaire || '';
      bValue = b.commentaire || '';
    } else if (sortColumn === 'rappel_date') {
      aValue = a.rappel_date ? new Date(a.rappel_date).getTime() : 0;
      bValue = b.rappel_date ? new Date(b.rappel_date).getTime() : 0;
    } else {
      // Handle dynamic columns
      aValue = a.data[sortColumn] || '';
      bValue = b.data[sortColumn] || '';
    }

    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      return sortDirection === 'asc' ? comparison : -comparison;
    }

    // Handle numeric comparison
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // Handle mixed types
    const aStr = String(aValue || '').toLowerCase();
    const bStr = String(bValue || '').toLowerCase();
    const comparison = aStr.localeCompare(bStr);
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Pagination
  const totalPages = Math.ceil(sortedProspects.length / limit);
  const paginatedProspects = sortedProspects.slice(
    (page - 1) * limit,
    page * limit
  );

  // Handle rows per page change
  const handleRowsPerPageChange = (value: string) => {
    setLimit(parseInt(value));
  };

  // Multi-select functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentPageIds = paginatedProspects.map(p => p.id);
      onSelectionChange?.(currentPageIds);
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectProspect = (prospectId: string, checked: boolean) => {
    if (checked) {
      const newSelection = [...(selectedProspects || []), prospectId];
      onSelectionChange?.(newSelection);
    } else {
      const newSelection = (selectedProspects || []).filter(id => id !== prospectId);
      onSelectionChange?.(newSelection);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedProspects || selectedProspects.length === 0) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedProspects.length} prospect${selectedProspects.length > 1 ? 's' : ''} ?`)) {
      return;
    }

    try {
      // Here you would implement the bulk delete API call
      // For now, we'll just show a toast
      toast.success(`${selectedProspects.length} prospect${selectedProspects.length > 1 ? 's' : ''} supprimé${selectedProspects.length > 1 ? 's' : ''} avec succès`);
      onSelectionChange?.([]);
      onRefresh();
    } catch (error) {
      toast.error("Échec de la suppression des prospects");
    }
  };

  const handleBulkExport = () => {
    if (!selectedProspects || selectedProspects.length === 0) return;

    // Here you would implement the bulk export functionality
    toast.success(`Exportation de ${selectedProspects.length} prospect${selectedProspects.length > 1 ? 's' : ''}...`);
  };

  return (
    <div className="space-y-6">
      {/* Bulk Actions Bar */}
      {selectedProspects && selectedProspects.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedProspects.length} prospect{selectedProspects.length > 1 ? 's' : ''} sélectionné{selectedProspects.length > 1 ? 's' : ''}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectionChange?.([])}
                className="h-8"
              >
                Effacer sélection
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExport}
                className="h-8"
              >
                <Download className="h-3 w-3 mr-1" />
                Exporter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-end px-1 mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          {sortedProspects.length} prospect{sortedProspects.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <Table style={{ tableLayout: 'fixed' }}>
          <TableHeader>
            <TableRow className="border-b bg-muted/30">
              {/* Select column */}
              <th className="py-4 px-4 font-semibold transition-all duration-200 hover:bg-muted/50" style={{ width: `${columnWidths.select}px` }}>
                <Checkbox
                  checked={paginatedProspects.length > 0 && selectedProspects && selectedProspects.length === paginatedProspects.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Sélectionner tous les prospects"
                />
              </th>
              {/* Call column */}
              <th className="py-4 px-4 font-semibold transition-all duration-200 hover:bg-muted/50" style={{ width: `${columnWidths.call}px` }}>
                Call
              </th>

              {/* Dynamic columns */}
              {displayColumns.map((column) => {
                const columnWidth = columnWidths[column.id] || 120;
                return (
                  <th key={column.id} style={{ width: `${columnWidth}px` }}>
                    <ResizableHeader
                      width={columnWidth}
                      minWidth={80}
                      maxWidth={400}
                      onWidthChange={(width) => handleColumnWidthChange(column.id, width)}
                      onSort={() => handleSort(column.column_name)}
                      sortDirection={sortDirection ?? undefined}
                      sortColumn={sortColumn ?? undefined}
                      columnId={column.column_name}
                      className="py-4 px-4 font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        {column.column_name}
                        {column.is_phone && <Phone className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </ResizableHeader>
                  </th>
                );
              })}

              {/* System columns */}
              <th style={{ width: `${columnWidths.status}px` }}>
                <ResizableHeader
                  width={columnWidths.status}
                  minWidth={100}
                  maxWidth={200}
                  onWidthChange={(width) => handleColumnWidthChange('status', width)}
                  onSort={() => handleSort('status')}
                  sortDirection={sortDirection}
                  sortColumn={sortColumn}
                  columnId="status"
                  className="py-4 px-4 font-semibold"
                >
                  Status
                </ResizableHeader>
              </th>
              <th style={{ width: `${columnWidths.commentaire}px` }}>
                <ResizableHeader
                  width={columnWidths.commentaire}
                  minWidth={120}
                  maxWidth={300}
                  onWidthChange={(width) => handleColumnWidthChange('commentaire', width)}
                  onSort={() => handleSort('commentaire')}
                  sortDirection={sortDirection}
                  sortColumn={sortColumn}
                  columnId="commentaire"
                  className="py-4 px-4 font-semibold"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3 w-3" />
                    Commentaire
                  </div>
                </ResizableHeader>
              </th>
              <th style={{ width: `${columnWidths.rappel}px` }}>
                <ResizableHeader
                  width={columnWidths.rappel}
                  minWidth={120}
                  maxWidth={250}
                  onWidthChange={(width) => handleColumnWidthChange('rappel', width)}
                  onSort={() => handleSort('rappel_date')}
                  sortDirection={sortDirection}
                  sortColumn={sortColumn}
                  columnId="rappel_date"
                  className="py-4 px-4 font-semibold"
                >
                  Rappel
                </ResizableHeader>
              </th>

              {/* Actions column */}
              <th className="py-4 px-4 font-semibold text-center transition-all duration-200 hover:bg-muted/50" style={{ width: `${columnWidths.actions}px` }}>
                Actions
              </th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <td className="py-4 px-4" style={{ width: `${columnWidths.select}px` }}>
                    <Skeleton className="h-4 w-4" />
                  </td>
                  <td className="py-4 px-4" style={{ width: `${columnWidths.call}px` }}>
                    <div className="flex justify-center">
                      <Skeleton className="h-9 w-9 rounded" />
                    </div>
                  </td>
                  {displayColumns.map((column) => {
                    const columnWidth = columnWidths[column.id] || 120;
                    return (
                      <td key={`skeleton-col-${column.id}`} className="py-4 px-4" style={{ width: `${columnWidth}px` }}>
                        <Skeleton className="h-5 w-full" />
                      </td>
                    );
                  })}
                  <td className="py-4 px-4" style={{ width: `${columnWidths.status}px` }}><Skeleton className="h-8 w-20" /></td>
                  <td className="py-4 px-4" style={{ width: `${columnWidths.commentaire}px` }}><Skeleton className="h-9 w-full" /></td>
                  <td className="py-4 px-4" style={{ width: `${columnWidths.rappel}px` }}><Skeleton className="h-8 w-24" /></td>
                  <td className="py-4 px-4" style={{ width: `${columnWidths.actions}px` }}>
                    <div className="flex justify-center">
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </td>
                </TableRow>
              ))
            ) : paginatedProspects.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={displayColumns.length + 6} 
                  className="h-32 text-center text-muted-foreground py-8 px-4"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-lg font-medium">
                      {searchTerm ? "No prospects match your search" : "No prospects found"}
                    </span>
                    <span className="text-sm">
                      {searchTerm ? "Try adjusting your search terms" : "Start by importing prospects or creating new ones"}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedProspects.map((prospect) => (
                <TableRow key={prospect.id} className="hover:bg-muted/30 transition-colors">
                  {/* Select checkbox */}
                  <td className="py-4 px-4" style={{ width: `${columnWidths.select}px` }}>
                    <Checkbox
                      checked={selectedProspects?.includes(prospect.id) || false}
                      onCheckedChange={(checked) => handleSelectProspect(prospect.id, checked as boolean)}
                      aria-label={`Sélectionner le prospect ${prospect.id}`}
                    />
                  </td>
                  {/* Call button */}
                  <td className="py-4 px-4" style={{ width: `${columnWidths.call}px` }}>
                    <div className="flex justify-center">
                      {prospect.has_phone ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 hover:bg-green-50 hover:text-green-700"
                          onClick={() => handleCall(prospect.phone_number)}
                        >
                          <Phone className="h-4 w-4 text-green-600" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </td>

                  {/* Dynamic data cells */}
                  {displayColumns.map((column) => {
                    const isEditing =
                      editingCell?.prospectId === prospect.id &&
                      editingCell?.column === column.column_name;

                    const cellValue = prospect.data[column.column_name] || "";
                    const columnWidth = columnWidths[column.id] || 120;

                    return (
                      <td
                        key={`${prospect.id}-${column.id}`}
                        className="cursor-pointer py-4 px-4 hover:bg-muted/20 transition-colors"
                        style={{ width: `${columnWidth}px` }}
                        onClick={() => handleCellEdit(prospect.id, column.column_name, cellValue)}
                      >
                        {isEditing ? (
                          <Input
                            value={editingCell?.value || ''}
                            onChange={(e) =>
                              setEditingCell({
                                prospectId: editingCell?.prospectId || '',
                                column: editingCell?.column || '',
                                value: e.target.value
                              })
                            }
                            onBlur={() => handleSaveEdit(prospect.id)}
                            onKeyDown={(e) => handleKeyPress(e, prospect.id)}
                            className="h-9 py-2 px-3 text-sm"
                            autoFocus
                          />
                        ) : (
                          <div className="py-1 text-sm">
                            {cellValue || <span className="text-muted-foreground">-</span>}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Status column */}
                  <td className="py-4 px-4" style={{ width: `${columnWidths.status}px` }}>
                    <StatusDropdown
                      value={prospect.status || 'nouveau'}
                      onChange={(value) => handleSystemColumnUpdate(prospect.id, 'status', value)}
                    />
                  </td>

                  {/* Commentaire column */}
                  <td className="py-4 px-4" style={{ width: `${columnWidths.commentaire}px` }}>
                    {editingCell?.prospectId === prospect.id && editingCell?.column === 'commentaire' ? (
                      <Textarea
                        value={editingCell.value}
                        onChange={(e) =>
                          setEditingCell(editingCell ? {
                            ...editingCell,
                            value: e.target.value
                          } : null)
                        }
                        onBlur={() => {
                          handleSystemColumnUpdate(prospect.id, 'commentaire', editingCell.value);
                          setEditingCell(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            handleSystemColumnUpdate(prospect.id, 'commentaire', editingCell.value);
                            setEditingCell(null);
                          } else if (e.key === 'Escape') {
                            setEditingCell(null);
                          }
                        }}
                        className="h-9 py-2 px-3 resize-none text-sm"
                        rows={1}
                        autoFocus
                      />
                    ) : (
                      <div
                        className="cursor-pointer min-h-[36px] flex items-center px-3 py-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-muted"
                        onClick={() => setEditingCell({
                          prospectId: prospect.id,
                          column: 'commentaire',
                          value: prospect.commentaire || ''
                        })}
                      >
                        {prospect.commentaire ? (
                          <span className="text-sm truncate">{prospect.commentaire}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Ajouter un commentaire...</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Rappel column */}
                  <td className="py-4 px-4" style={{ width: `${columnWidths.rappel}px` }}>
                    <RappelDatePicker
                      value={prospect.rappel_date ? new Date(prospect.rappel_date) : undefined}
                      onChange={(date) => handleSystemColumnUpdate(prospect.id, 'rappel_date', date?.toISOString())}
                    />
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4" style={{ width: `${columnWidths.actions}px` }}>
                    <div className="flex justify-center">
                      <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                                              </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination and rows per page */}
      {!loading && (
        <div className="flex items-center justify-between py-4 px-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Rows per page:</span>
              <Select
                value={limit.toString()}
                onValueChange={handleRowsPerPageChange}
              >
                <SelectTrigger className="w-[80px] h-9">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
              <span className="text-sm text-muted-foreground">
                Affichage de {((page - 1) * limit) + 1} à {Math.min(page * limit, sortedProspects.length)} sur {sortedProspects.length}
              </span>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
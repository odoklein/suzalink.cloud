"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { ChevronDown, GripVertical, Plus, Trash2, Calendar, Hash, Type, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

// Column types
type ColumnType = "text" | "number" | "select" | "checkbox" | "date"

interface Column {
  id: string
  name: string
  type: ColumnType
  width: number
  options?: string[] // For select type
}

interface Cell {
  value: any
  columnId: string
  rowId: string
}

interface Row {
  id: string
  cells: Record<string, any>
}

// Sample data
const initialColumns: Column[] = [
  { id: "col1", name: "Name", type: "text", width: 200 },
  { id: "col2", name: "Status", type: "select", width: 150, options: ["Todo", "In Progress", "Done"] },
  { id: "col3", name: "Priority", type: "number", width: 120 },
  { id: "col4", name: "Completed", type: "checkbox", width: 100 },
  { id: "col5", name: "Due Date", type: "date", width: 150 },
]

const initialRows: Row[] = [
  { id: "row1", cells: { col1: "Task 1", col2: "Todo", col3: 1, col4: false, col5: "2024-01-15" } },
  { id: "row2", cells: { col1: "Task 2", col2: "In Progress", col3: 2, col4: true, col5: "2024-01-20" } },
  { id: "row3", cells: { col1: "Task 3", col2: "Done", col3: 3, col4: false, col5: "2024-01-25" } },
]

export function AirtableGrid() {
  const [columns, setColumns] = useState<Column[]>(initialColumns)
  const [rows, setRows] = useState<Row[]>(initialRows)
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null)
  const [editingHeader, setEditingHeader] = useState<string | null>(null)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null)

  const tableRef = useRef<HTMLDivElement>(null)
  const resizeStartX = useRef<number>(0)
  const resizeStartWidth = useRef<number>(0)

  // Handle column resizing
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, columnId: string) => {
      e.preventDefault()
      setResizingColumn(columnId)
      resizeStartX.current = e.clientX
      const column = columns.find((col) => col.id === columnId)
      resizeStartWidth.current = column?.width || 150
    },
    [columns],
  )

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!resizingColumn) return

      const deltaX = e.clientX - resizeStartX.current
      const newWidth = Math.max(80, resizeStartWidth.current + deltaX)

      setColumns((prev) => prev.map((col) => (col.id === resizingColumn ? { ...col, width: newWidth } : col)))
    },
    [resizingColumn],
  )

  const handleResizeEnd = useCallback(() => {
    setResizingColumn(null)
  }, [])

  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener("mousemove", handleResizeMove)
      document.addEventListener("mouseup", handleResizeEnd)
      return () => {
        document.removeEventListener("mousemove", handleResizeMove)
        document.removeEventListener("mouseup", handleResizeEnd)
      }
    }
  }, [resizingColumn, handleResizeMove, handleResizeEnd])

  // Handle column reordering
  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleColumnDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    if (!draggedColumn || draggedColumn === targetColumnId) return

    const draggedIndex = columns.findIndex((col) => col.id === draggedColumn)
    const targetIndex = columns.findIndex((col) => col.id === targetColumnId)

    const newColumns = [...columns]
    const [draggedCol] = newColumns.splice(draggedIndex, 1)
    newColumns.splice(targetIndex, 0, draggedCol)

    setColumns(newColumns)
    setDraggedColumn(null)
  }

  // Cell editing
  const handleCellClick = (rowId: string, columnId: string) => {
    setEditingCell({ rowId, columnId })
  }

  const handleCellChange = (rowId: string, columnId: string, value: any) => {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, cells: { ...row.cells, [columnId]: value } } : row)),
    )
  }

  const handleCellBlur = () => {
    setEditingCell(null)
  }

  // Header editing
  const handleHeaderClick = (columnId: string) => {
    setEditingHeader(columnId)
  }

  const handleHeaderChange = (columnId: string, newName: string) => {
    setColumns((prev) => prev.map((col) => (col.id === columnId ? { ...col, name: newName } : col)))
  }

  const handleHeaderBlur = () => {
    setEditingHeader(null)
  }

  // Add new row
  const addRow = () => {
    const newRow: Row = {
      id: `row${Date.now()}`,
      cells: columns.reduce(
        (acc, col) => {
          acc[col.id] = col.type === "checkbox" ? false : ""
          return acc
        },
        {} as Record<string, any>,
      ),
    }
    setRows((prev) => [...prev, newRow])
  }

  // Delete row
  const deleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId))
  }

  // Render cell content based on type
  const renderCell = (row: Row, column: Column) => {
    const value = row.cells[column.id]
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id

    if (isEditing) {
      switch (column.type) {
        case "select":
          return (
            <Select
              value={value || ""}
              onValueChange={(newValue) => handleCellChange(row.id, column.id, newValue)}
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
          )
        case "checkbox":
          return (
            <Checkbox
              checked={value || false}
              onCheckedChange={(checked) => {
                handleCellChange(row.id, column.id, checked)
                handleCellBlur()
              }}
              className="mx-auto"
            />
          )
        default:
          return (
            <Input
              value={value || ""}
              onChange={(e) => handleCellChange(row.id, column.id, e.target.value)}
              onBlur={handleCellBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  handleCellBlur()
                }
              }}
              className="h-8 border-0 shadow-none focus:ring-2 focus:ring-primary"
              type={column.type === "number" ? "number" : column.type === "date" ? "date" : "text"}
              autoFocus
            />
          )
      }
    }

    // Display mode
    switch (column.type) {
      case "checkbox":
        return (
          <div className="flex justify-center">
            <Check className={cn("h-4 w-4", value ? "text-primary" : "text-transparent")} />
          </div>
        )
      case "select":
        return (
          <span
            className={cn(
              "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",
              value === "Todo" && "bg-gray-100 text-gray-800",
              value === "In Progress" && "bg-blue-100 text-blue-800",
              value === "Done" && "bg-green-100 text-green-800",
            )}
          >
            {value || ""}
          </span>
        )
      default:
        return <span className="truncate">{value || ""}</span>
    }
  }

  // Get column type icon
  const getColumnTypeIcon = (type: ColumnType) => {
    switch (type) {
      case "text":
        return <Type className="h-4 w-4" />
      case "number":
        return <Hash className="h-4 w-4" />
      case "date":
        return <Calendar className="h-4 w-4" />
      case "checkbox":
        return <Check className="h-4 w-4" />
      default:
        return <ChevronDown className="h-4 w-4" />
    }
  }

  return (
    <div className="w-full h-screen bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 border-b border-table-cell-border bg-table-header">
        <Button onClick={addRow} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Row
        </Button>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto" ref={tableRef}>
        <div className="min-w-full">
          {/* Header Row */}
          <div className="sticky top-0 z-10 flex bg-table-header border-b border-table-cell-border">
            {/* Row number header */}
            <div className="w-12 min-w-12 h-10 flex items-center justify-center border-r border-table-cell-border bg-table-header">
              <span className="text-xs text-table-header-foreground font-medium">#</span>
            </div>

            {columns.map((column, index) => (
              <div
                key={column.id}
                className={cn(
                  "relative flex items-center h-10 border-r border-table-cell-border bg-table-header transition-colors",
                  hoveredColumn === column.id && "bg-table-row-hover",
                )}
                style={{ width: column.width, minWidth: column.width }}
                draggable
                onDragStart={(e) => handleColumnDragStart(e, column.id)}
                onDragOver={handleColumnDragOver}
                onDrop={(e) => handleColumnDrop(e, column.id)}
                onMouseEnter={() => setHoveredColumn(column.id)}
                onMouseLeave={() => setHoveredColumn(null)}
              >
                {/* Drag handle */}
                <div className="flex items-center justify-center w-6 cursor-move">
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                </div>

                {/* Column type icon */}
                <div className="flex items-center justify-center w-6 text-muted-foreground">
                  {getColumnTypeIcon(column.type)}
                </div>

                {/* Column name */}
                <div className="flex-1 px-2">
                  {editingHeader === column.id ? (
                    <Input
                      value={column.name}
                      onChange={(e) => handleHeaderChange(column.id, e.target.value)}
                      onBlur={handleHeaderBlur}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Escape") {
                          handleHeaderBlur()
                        }
                      }}
                      className="h-6 text-sm font-medium border-0 shadow-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="text-sm font-medium text-table-header-foreground cursor-pointer truncate block"
                      onClick={() => handleHeaderClick(column.id)}
                    >
                      {column.name}
                    </span>
                  )}
                </div>

                {/* Resize handle */}
                <div
                  className={cn(
                    "absolute right-0 top-0 w-1 h-full cursor-col-resize transition-colors",
                    "hover:bg-table-resize-handle-hover bg-table-resize-handle",
                    resizingColumn === column.id && "bg-table-resize-handle-hover",
                  )}
                  onMouseDown={(e) => handleResizeStart(e, column.id)}
                />
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {rows.map((row, rowIndex) => (
            <div
              key={row.id}
              className={cn(
                "flex transition-colors",
                rowIndex % 2 === 0 ? "bg-table-row-even" : "bg-table-row-odd",
                hoveredRow === row.id && "bg-table-row-hover",
              )}
              onMouseEnter={() => setHoveredRow(row.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* Row number */}
              <div className="w-12 min-w-12 h-10 flex items-center justify-center border-r border-b border-table-cell-border bg-table-header group">
                <span className="text-xs text-muted-foreground">{rowIndex + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 absolute right-1 h-6 w-6 p-0"
                  onClick={() => deleteRow(row.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {columns.map((column) => (
                <div
                  key={`${row.id}-${column.id}`}
                  className={cn(
                    "flex items-center px-3 h-10 border-r border-b border-table-cell-border cursor-pointer transition-colors",
                    hoveredColumn === column.id && "bg-table-row-hover",
                  )}
                  style={{ width: column.width, minWidth: column.width }}
                  onClick={() => handleCellClick(row.id, column.id)}
                  onMouseEnter={() => setHoveredColumn(column.id)}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  {renderCell(row, column)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

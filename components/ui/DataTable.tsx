"use client";
import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  RowData,
  TableOptions,
} from "@tanstack/react-table";

interface DataTableProps<TData extends RowData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowEdit?: (rowIndex: number, newRow: TData) => void;
  onRowDelete?: (rowIndex: number) => void;
  isLoading?: boolean;
  editable?: boolean;
  selectedRows?: Set<number>;
  onSelectedRowsChange?: (selected: Set<number>) => void;
  onBulkDelete?: (rowIndices: number[]) => void;
  onColumnEdit?: (colIndex: number, newName: string) => void;
  onAddColumn?: () => void;
}

export function DataTable<TData extends RowData, TValue>({
  columns,
  data,
  onRowEdit,
  onRowDelete,
  isLoading,
  editable = false,
  selectedRows = new Set<number>(),
  onSelectedRowsChange,
  onBulkDelete,
  onColumnEdit,
  onAddColumn,
}: DataTableProps<TData, TValue>) {
  const [editingIdx, setEditingIdx] = React.useState<number | null>(null);
  const [editingCol, setEditingCol] = React.useState<string | null>(null);
  const [editRow, setEditRow] = React.useState<TData | null>(null);

  // Editable header state
  const [editingHeaderIdx, setEditingHeaderIdx] = React.useState<number | null>(null);
  const [editingHeaderValue, setEditingHeaderValue] = React.useState<string>("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleEdit = (rowIdx: number) => {
    setEditingIdx(rowIdx);
    setEditRow(typeof data[rowIdx] === 'object' && data[rowIdx] !== null ? { ...data[rowIdx] } : {} as TData);
  };

  const handleSave = (rowIdx: number) => {
    if (onRowEdit && editRow) {
      onRowEdit(rowIdx, editRow);
    }
    setEditingIdx(null);
    setEditRow(null);
  };

  const handleCancel = () => {
    setEditingIdx(null);
    setEditRow(null);
  };

  return (
    <div className="rounded-md border w-full overflow-x-auto">
      {selectedRows && selectedRows.size > 0 && onBulkDelete && (
        <div className="flex items-center gap-4 px-4 py-2 bg-gray-100 border-b">
          <span className="text-sm">{selectedRows.size} selected</span>
          <button
            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
            onClick={() => onBulkDelete(Array.from(selectedRows))}
          >
            Delete Selected
          </button>
        </div>
      )}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-2 py-2">
              <input
                type="checkbox"
                checked={data.length > 0 && selectedRows.size === data.length}
                onChange={e => {
                  if (!onSelectedRowsChange) return;
                  if (e.target.checked) {
                    onSelectedRowsChange(new Set(data.map((_, idx) => idx)));
                  } else {
                    onSelectedRowsChange(new Set());
                  }
                }}
              />
            </th>
            {table.getHeaderGroups()[0].headers.map((header, colIdx) => (
              <th
                key={header.id}
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => {
                  if (editable) {
                    setEditingHeaderIdx(colIdx);
                    setEditingHeaderValue(header.column.id);
                  }
                }}
              >
                {editingHeaderIdx === colIdx && editable ? (
                  <input
                    autoFocus
                    className="border px-2 py-1 rounded w-full text-xs uppercase focus:ring-2 focus:ring-blue-500"
                    value={editingHeaderValue}
                    onChange={e => setEditingHeaderValue(e.target.value)}
                    onBlur={() => {
                      if (onColumnEdit && editingHeaderValue.trim() && editingHeaderValue !== header.column.id) {
                        onColumnEdit(colIdx, editingHeaderValue.trim());
                      }
                      setEditingHeaderIdx(null);
                      setEditingHeaderValue("");
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (onColumnEdit && editingHeaderValue.trim() && editingHeaderValue !== header.column.id) {
                          onColumnEdit(colIdx, editingHeaderValue.trim());
                        }
                        setEditingHeaderIdx(null);
                        setEditingHeaderValue("");
                      } else if (e.key === 'Escape') {
                        setEditingHeaderIdx(null);
                        setEditingHeaderValue("");
                      }
                    }}
                  />
                ) : (
                  flexRender(header.column.columnDef.header, header.getContext())
                )}
              </th>
            ))}
            {(editable || onRowDelete) && <th className="px-4 py-2">Actions</th>}
            {/* Add Column Button */}
            {editable && (
              <th className="px-2 py-2">
                <button
                  className="inline-flex items-center px-2 py-1 rounded bg-green-500 text-white text-xs hover:bg-green-600"
                  onClick={onAddColumn}
                  title="Add column"
                >
                  + Add Column
                </button>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-2 text-center">
                Loading...
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row, idx) => (
              <tr
                key={row.id}
                className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                style={{ height: '48px' }}
              >
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(idx)}
                    onChange={e => {
                      if (!onSelectedRowsChange) return;
                      const next = new Set(selectedRows);
                      if (e.target.checked) next.add(idx);
                      else next.delete(idx);
                      onSelectedRowsChange(next);
                    }}
                  />
                </td>
                {row.getVisibleCells().map(cell => {
                  // Don't allow editing for Actions or selection checkbox columns
                  const isActionCol = cell.column.id === '__actions';
                  const isCheckboxCol = cell.column.id === '__checkbox';
                  const isEditing = editingIdx === idx && editingCol === cell.column.id && editable;
                  return (
                    <td
                      key={cell.id}
                      className="px-4 py-2 truncate overflow-hidden whitespace-nowrap align-middle cursor-pointer"
                      onClick={() => {
                        if (!isActionCol && !isCheckboxCol && editable) {
                          setEditingIdx(idx);
                          setEditingCol(cell.column.id);
                          setEditRow(typeof data[idx] === 'object' && data[idx] !== null ? { ...data[idx] } : {} as TData);
                        }
                      }}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          className="border px-2 py-1 rounded w-full h-8 text-sm align-middle focus:ring-2 focus:ring-blue-500"
                          style={{ minHeight: '32px', maxHeight: '32px' }}
                          value={editRow ? (editRow as any)[cell.column.id] : ""}
                          onChange={e =>
                            setEditRow(r => {
                              if (typeof r === 'object' && r !== null) {
                                return { ...r, [cell.column.id]: e.target.value };
                              } else {
                                // If r is not an object, return a new object with just this key
                                return { [cell.column.id]: e.target.value } as TData;
                              }
                            })
                          }
                          onBlur={() => {
                            if (onRowEdit && editRow) onRowEdit(idx, editRow);
                            setEditingIdx(null);
                            setEditingCol(null);
                            setEditRow(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              if (onRowEdit && editRow) onRowEdit(idx, editRow);
                              setEditingIdx(null);
                              setEditingCol(null);
                              setEditRow(null);
                            } else if (e.key === 'Escape') {
                              setEditingIdx(null);
                              setEditingCol(null);
                              setEditRow(null);
                            }
                          }}
                        />
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </td>
                  );
                })}
              {/* Actions column, if enabled */}
              {(editable || onRowDelete) && (
                <td className="px-4 py-2 space-x-2">
                  {onRowDelete && (
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => onRowDelete(idx)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          )))
          }
        </tbody>
      </table>
    </div>
  );
}


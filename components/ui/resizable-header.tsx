"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, GripVertical } from "lucide-react";

interface ResizableHeaderProps {
  children: React.ReactNode;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  onWidthChange: (width: number) => void;
  onSort?: () => void;
  sortDirection?: 'asc' | 'desc' | null | undefined;
  sortColumn?: string | null | undefined;
  columnId?: string;
  className?: string;
}

export function ResizableHeader({
  children,
  width,
  minWidth = 80,
  maxWidth = 400,
  onWidthChange,
  onSort,
  sortDirection,
  sortColumn,
  columnId,
  className = ""
}: ResizableHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, startX, startWidth, minWidth, maxWidth, onWidthChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
  };

  return (
    <div
      ref={headerRef}
      className={`relative group ${className}`}
      style={{ width: `${width}px`, minWidth: `${minWidth}px` }}
    >
      <div
        className={`flex items-center gap-2 h-full pr-2 cursor-pointer select-none ${
          onSort ? 'hover:bg-muted/50' : ''
        } transition-all duration-200`}
        onClick={onSort}
      >
        <div className="flex-1 truncate">
          {children}
        </div>

        {/* Sort indicators */}
        {onSort && (
          <div className="flex flex-col flex-shrink-0">
            {sortColumn === columnId ? (
              sortDirection === 'asc' ? (
                <ChevronUp className="h-3 w-3" />
              ) : sortDirection === 'desc' ? (
                <ChevronDown className="h-3 w-3" />
              ) : null
            ) : (
              <ChevronsUpDown className="h-3 w-3 opacity-50" />
            )}
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-primary/50 transition-opacity"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

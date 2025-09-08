"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Trash2, 
  Archive, 
  Star, 
  Mail, 
  MailOpen,
  Tag,
  ChevronDown,
  RefreshCw,
  MoreHorizontal,
  CheckSquare,
  Square,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { translations as t } from '../translations';

interface EmailBulkActionsProps {
  selectedEmails: string[];
  totalEmails: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onMarkAsRead: (ids: string[]) => void;
  onMarkAsUnread: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
  onArchive: (ids: string[]) => void;
  onStar: (ids: string[]) => void;
  onUnstar: (ids: string[]) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function EmailBulkActions({
  selectedEmails,
  totalEmails,
  onSelectAll,
  onDeselectAll,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  onArchive,
  onStar,
  onUnstar,
  onRefresh,
  loading
}: EmailBulkActionsProps) {
  const hasSelection = selectedEmails.length > 0;
  const allSelected = selectedEmails.length === totalEmails && totalEmails > 0;
  const someSelected = selectedEmails.length > 0 && selectedEmails.length < totalEmails;
  
  const handleSelectToggle = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };
  
  const handleAction = (action: string) => {
    if (selectedEmails.length === 0) {
      toast.error("Veuillez sélectionner au moins un email");
      return;
    }
    
    switch (action) {
      case 'mark-read':
        onMarkAsRead(selectedEmails);
        break;
      case 'mark-unread':
        onMarkAsUnread(selectedEmails);
        break;
      case 'delete':
        onDelete(selectedEmails);
        break;
      case 'archive':
        onArchive(selectedEmails);
        break;
      case 'star':
        onStar(selectedEmails);
        break;
      case 'unstar':
        onUnstar(selectedEmails);
        break;
      default:
        break;
    }
  };
  
  return (
    <div className="p-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onCheckedChange={handleSelectToggle}
            id="select-all"
            aria-label={allSelected ? "Désélectionner tout" : "Sélectionner tout"}
            className="data-[state=indeterminate]:bg-blue-500"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onSelectAll}>
                <CheckSquare className="mr-2 h-4 w-4" />
                <span>Tout sélectionner</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDeselectAll}>
                <Square className="mr-2 h-4 w-4" />
                <span>Tout désélectionner</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-1 ml-2">
          {hasSelection && (
            <span className="text-sm text-gray-600">
              {selectedEmails.length} sélectionné{selectedEmails.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="sr-only">Actualiser</span>
        </Button>
        
        {hasSelection && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction('mark-read')}
              className="flex items-center gap-1"
            >
              <MailOpen className="h-4 w-4" />
              <span className="sr-only md:not-sr-only md:ml-1">Lu</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction('mark-unread')}
              className="flex items-center gap-1"
            >
              <Mail className="h-4 w-4" />
              <span className="sr-only md:not-sr-only md:ml-1">Non lu</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction('archive')}
              className="flex items-center gap-1"
            >
              <Archive className="h-4 w-4" />
              <span className="sr-only md:not-sr-only md:ml-1">Archiver</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction('delete')}
              className="flex items-center gap-1 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only md:not-sr-only md:ml-1">Supprimer</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Plus d'actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleAction('star')}>
                  <Star className="mr-2 h-4 w-4" />
                  <span>Marquer comme important</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction('unstar')}>
                  <Star className="mr-2 h-4 w-4" />
                  <span>Retirer l'importance</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Tag className="mr-2 h-4 w-4" />
                  <span>Appliquer un libellé</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  <span>Marquer comme spam</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}

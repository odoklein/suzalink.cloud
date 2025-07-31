"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  PlusIcon, 
  InboxIcon, 
  PaperAirplaneIcon, 
  DocumentTextIcon, 
  TrashIcon,
  Cog6ToothIcon,
  FolderIcon
} from '@heroicons/react/24/outline';

interface EmailSidebarProps {
  selectedLabel: string;
  onLabelSelect: (label: string) => void;
  onCompose: () => void;
  unopenedCount?: number;
}

export function EmailSidebar({ selectedLabel, onLabelSelect, onCompose, unopenedCount = 0 }: EmailSidebarProps) {
  const folders = [
    { 
      id: 'Boîte de réception', 
      label: 'Boîte de réception', 
      icon: InboxIcon, 
      count: unopenedCount,
      color: 'text-blue-600'
    },
    { 
      id: 'Envoyés', 
      label: 'Envoyés', 
      icon: PaperAirplaneIcon,
      color: 'text-green-600'
    },
    { 
      id: 'Brouillons', 
      label: 'Brouillons', 
      icon: DocumentTextIcon,
      color: 'text-yellow-600'
    },
    { 
      id: 'Corbeille', 
      label: 'Corbeille', 
      icon: TrashIcon,
      color: 'text-red-600'
    },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Compose Button */}
      <div className="p-4 border-b border-gray-200">
        <Button 
          onClick={onCompose}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 shadow-sm"
        >
          <PlusIcon className="w-5 h-5" />
          Nouveau message
        </Button>
      </div>

      {/* Folders */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Dossiers
          </h3>
          <nav className="space-y-1">
            {folders.map((folder) => {
              const isSelected = selectedLabel === folder.id;
              const IconComponent = folder.icon;
              
              return (
                <button
                  key={folder.id}
                  onClick={() => onLabelSelect(folder.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-all duration-200 group ${
                    isSelected 
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className={`w-5 h-5 ${isSelected ? folder.color : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <span className="font-medium">{folder.label}</span>
                  </div>
                  
                  {(folder.count ?? 0) > 0 && (
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-0.5 rounded-full">
                  {folder.count}
                  </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Categories */}
        <div className="p-4 border-t border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Catégories
          </h3>
          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <FolderIcon className="w-5 h-5 text-gray-400" />
              <span>Personnel</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <FolderIcon className="w-5 h-5 text-gray-400" />
              <span>Professionnel</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-gray-200">
        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
          <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
          <span>Paramètres email</span>
        </button>
      </div>
    </div>
  );
}

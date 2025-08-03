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
    <div className="flex flex-col h-full">
      {/* Compose Button */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <Button 
          onClick={onCompose}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
        >
          <PlusIcon className="w-5 h-5" />
          Nouveau message
        </Button>
      </div>

      {/* Folders */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pl-1">
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-all duration-200 group font-medium ${
                      isSelected 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' 
                        : 'text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className={`w-5 h-5 ${isSelected ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      <span>{folder.label}</span>
                    </div>
                    
                    {(folder.count ?? 0) > 0 && (
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {folder.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pl-1">
              Catégories
            </h3>
            <nav className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-white hover:text-gray-900 rounded-lg transition-all duration-200 font-medium">
                <FolderIcon className="w-5 h-5 text-gray-400" />
                <span>Personnel</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-white hover:text-gray-900 rounded-lg transition-all duration-200 font-medium">
                <FolderIcon className="w-5 h-5 text-gray-400" />
                <span>Professionnel</span>
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-all duration-200 font-medium">
          <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
          <span>Paramètres email</span>
        </button>
      </div>
    </div>
  );
}

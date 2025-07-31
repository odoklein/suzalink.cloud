"use client";
import React from 'react';
import { MagnifyingGlassIcon, PaperClipIcon, StarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
}

interface Email {
  id: number;
  from: string;
  subject: string;
  date: string;
  text: string;
  html?: string;
  labels: string[];
  attachments: Attachment[];
  read?: boolean;
  starred?: boolean;
  important?: boolean;
}

interface EmailListProps {
  emails: Email[];
  selectedEmail: Email | null;
  onEmailSelect: (email: Email) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  loading?: boolean;
  error?: string | null;
  onSync?: () => void;
  lastSync?: Date | null;
}

export function EmailList({ 
  emails, 
  selectedEmail, 
  onEmailSelect, 
  searchTerm, 
  onSearchChange,
  loading = false,
  error = null,
  onSync,
  lastSync
}: EmailListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays <= 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
  };

  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="flex-1 flex flex-col bg-white border-r border-gray-200">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans les emails..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
          {onSync && (
            <button
              onClick={onSync}
              className="px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              title="Synchroniser"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Sync</span>
            </button>
          )}
        </div>
        {lastSync && (
          <div className="text-xs text-gray-500">
            Dernière synchronisation: {lastSync.toLocaleTimeString('fr-FR', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        )}
      </div>

      {/* Email List Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span className="text-gray-600 text-sm">Chargement des emails...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 max-w-md">
              <strong className="block mb-1">Erreur de chargement</strong>
              <span className="text-sm">{error}</span>
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              onClick={() => window.location.reload()}
            >
              Réessayer
            </button>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0H4m16 0l-2-2m0 0l-2 2m2-2v2M4 13l2-2m0 0l2 2m-2-2v2" />
              </svg>
              <p className="text-lg font-medium mb-1">Aucun email trouvé</p>
              <p className="text-sm">Essayez de modifier vos critères de recherche</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {emails.map((email) => {
              const isSelected = selectedEmail?.id === email.id;
              const hasAttachments = email.attachments && email.attachments.length > 0;
              
              return (
                <div
                  key={email.id}
                  onClick={() => onEmailSelect(email)}
                  className={`relative p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${
                    isSelected 
                      ? 'bg-blue-50 border-l-blue-500' 
                      : email.read 
                        ? 'border-l-transparent' 
                        : 'border-l-blue-300 bg-blue-25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Sender and Time */}
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium truncate ${
                          email.read ? 'text-gray-900' : 'text-gray-900 font-semibold'
                        }`}>
                          {email.from || 'Expéditeur inconnu'}
                        </span>
                        <div className="flex items-center gap-2 ml-2">
                          {hasAttachments && (
                            <PaperClipIcon className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(email.date)}
                          </span>
                        </div>
                      </div>

                      {/* Subject */}
                      <h3 className={`text-sm mb-1 truncate ${
                        email.read ? 'text-gray-900' : 'text-gray-900 font-semibold'
                      }`}>
                        {email.subject || '(Sans objet)'}
                      </h3>

                      {/* Preview */}
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {truncateText(email.text)}
                      </p>

                      {/* Labels */}
                      {email.labels && email.labels.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {email.labels.slice(0, 2).map((label) => (
                            <span 
                              key={label}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {label === 'Inbox' ? 'Boîte de réception' : 
                               label === 'Sent' ? 'Envoyés' : 
                               label === 'Draft' ? 'Brouillons' : 
                               label === 'Trash' ? 'Corbeille' : label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Star Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle star toggle here
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {email.starred ? (
                        <StarIconSolid className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <StarIcon className="w-4 h-4 text-gray-400 hover:text-yellow-400" />
                      )}
                    </button>
                  </div>

                  {/* Unread indicator */}
                  {!email.read && (
                    <div className="absolute left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with count */}
      {emails.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
          <span className="text-xs text-gray-500">
            {emails.length} email{emails.length > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

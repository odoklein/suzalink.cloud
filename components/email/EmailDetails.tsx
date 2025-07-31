"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon, 
  TrashIcon,
  ArchiveBoxIcon,
  StarIcon,
  PrinterIcon,
  DocumentIcon,
  EllipsisVerticalIcon,
  XMarkIcon,
  XMarkIcon as XMarkIconOutline
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { XMarkIcon as XMarkIconSolid } from '@heroicons/react/24/solid';

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
}

interface EmailDetailsProps {
  email: Email | null;
  onReply: () => void;
  onForward: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onStar?: () => void;
  onClose?: () => void;
  userId?: string;
}

export function EmailDetails({ 
  email, 
  onReply, 
  onForward, 
  onDelete, 
  onArchive,
  onStar,
  onClose = () => {},
  userId
}: EmailDetailsProps) {
  if (!email) {
    return (
      <div className="w-[60%] bg-white flex items-center justify-center border-l border-gray-200 h-full">
        <div className="text-center p-8">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 3.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sélectionnez un email</h3>
          <p className="text-sm text-gray-500">Choisissez un email dans la liste pour afficher son contenu ici.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEmailContent = () => {
    if (email.html) {
      return <div dangerouslySetInnerHTML={{ __html: email.html }} className="prose prose-sm max-w-none" />;
    }
    return <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">{email.text}</pre>;
  };

  const downloadAttachment = async (attachment: Attachment) => {
    if (!userId) {
      alert('Utilisateur non authentifié');
      return;
    }

    try {
      const response = await fetch('/api/email/attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          emailId: email.id,
          attachmentId: attachment.id,
          filename: attachment.filename
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Erreur lors du téléchargement du fichier');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.includes('image/')) return '🖼️';
    if (contentType.includes('pdf')) return '📄';
    if (contentType.includes('word')) return '📝';
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊';
    if (contentType.includes('zip') || contentType.includes('rar')) return '📦';
    return '📎';
  };

  return (
    <div className="w-[60%] bg-white flex flex-col border-l border-gray-200 h-full max-h-screen">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-xl font-semibold text-gray-900 leading-tight pr-4">
            {email.subject || '(Sans objet)'}
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onClose()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              title="Fermer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onStar}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={email.starred ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              {email.starred ? (
                <StarIconSolid className="w-5 h-5 text-yellow-400" />
              ) : (
                <StarIcon className="w-5 h-5 text-gray-400" />
              )}
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Plus d'options">
              <EllipsisVerticalIcon className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onReply}
            size="sm"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowUturnLeftIcon className="w-4 h-4" />
            Répondre
          </Button>
          <Button
            onClick={onForward}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowUturnRightIcon className="w-4 h-4" />
            Transférer
          </Button>
          <div className="flex items-center gap-1 ml-auto">
            {onArchive && (
              <button
                onClick={onArchive}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                title="Archiver"
              >
                <ArchiveBoxIcon className="w-5 h-5" />
              </button>
            )}
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              title="Imprimer"
            >
              <PrinterIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-600"
              title="Supprimer"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Email Meta Info */}
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-900">De :</span>
              <span className="text-sm text-gray-700 ml-2">{email.from}</span>
            </div>
            <span className="text-sm text-gray-500">{formatDate(email.date)}</span>
          </div>
          
          {email.labels && email.labels.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Dossiers :</span>
              <div className="flex gap-2">
                {email.labels.map((label) => (
                  <span 
                    key={label}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {label === 'Inbox' ? 'Boîte de réception' : 
                     label === 'Sent' ? 'Envoyés' : 
                     label === 'Draft' ? 'Brouillons' : 
                     label === 'Trash' ? 'Corbeille' : label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        <div className="max-w-none">
          {getEmailContent()}
        </div>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Pièces jointes ({email.attachments.length})
            </h3>
            <div className="space-y-2">
              {email.attachments.map((attachment, index) => (
                <div 
                  key={attachment.id || index}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg mr-3">
                    <span className="text-lg">{getFileIcon(attachment.contentType)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {attachment.filename}
                    </div>
                    <div className="text-xs text-gray-500">
                      {attachment.contentType.split('/')[1]?.toUpperCase() || 'FILE'} • {formatFileSize(attachment.size)}
                    </div>
                  </div>
                  <button 
                    onClick={() => downloadAttachment(attachment)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    Télécharger
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Footer */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onReply}>
              Répondre
            </Button>
            <Button size="sm" variant="outline" onClick={onForward}>
              Transférer
            </Button>
          </div>
          <span className="text-xs text-gray-500">
            {email.read ? 'Lu' : 'Non lu'}
          </span>
        </div>
      </div>
    </div>
  );
}

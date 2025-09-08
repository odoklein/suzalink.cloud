"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  Reply, 
  Forward, 
  Trash2, 
  Archive,
  CornerUpRight,
  CornerUpLeft,
  Printer,
  MoreHorizontal,
  Mail,
  Paperclip
} from 'lucide-react';
import { translations as t } from '../translations';

interface EmailMessage {
  id: string;
  messageId: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  recipientEmails: string[];
  ccEmails: string[];
  bccEmails: string[];
  emailText: string;
  emailHtml: string;
  sentAt: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
}

interface EmailPreviewPaneProps {
  message: EmailMessage;
  onReply: (message: EmailMessage) => void;
  onForward: () => void;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function EmailPreviewPane({ 
  message, 
  onReply, 
  onForward, 
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext
}: EmailPreviewPaneProps) {
  
  if (!message) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">{t.noMessagesFound}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            ← {t.backToMessages}
          </Button>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              disabled={!hasPrevious}
              onClick={onPrevious}
              className="text-gray-500"
            >
              <CornerUpLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              disabled={!hasNext}
              onClick={onNext}
              className="text-gray-500"
            >
              <CornerUpRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Archive className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Email Content */}
      <div className="flex-1 overflow-auto p-6 min-h-0">
        {/* Subject and Actions */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-2">{message.subject || t.noSubject}</h1>
            <div className="flex items-center gap-2">
              {message.hasAttachments && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  {t.attachments}
                </Badge>
              )}
              {message.isStarred && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  Important
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onReply(message)}
              className="flex items-center gap-1"
            >
              <Reply className="w-4 h-4" />
              {t.reply}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onForward}
              className="flex items-center gap-1"
            >
              <Forward className="w-4 h-4" />
              {t.forward}
            </Button>
          </div>
        </div>
        
        {/* Sender Info */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-lg">
              {message.senderName ? message.senderName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{message.senderName || message.senderEmail || 'Unknown'}</div>
                  <div className="text-sm text-gray-500">{message.senderEmail || ''}</div>
                </div>
                <div className="text-sm text-gray-500">
                  {message.sentAt ? new Date(message.sentAt).toLocaleString() : 'Unknown date'}
                </div>
              </div>
              
              <div className="mt-2 text-sm text-gray-600">
                <span className="text-gray-500">{t.to}:</span> {message.recipientEmails && Array.isArray(message.recipientEmails) ? message.recipientEmails.join(', ') : ''}

                {message.ccEmails && Array.isArray(message.ccEmails) && message.ccEmails.length > 0 && (
                  <div>
                    <span className="text-gray-500">CC:</span> {message.ccEmails.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Email Body */}
        <div className="prose max-w-none">
          {message.emailHtml && message.emailHtml.trim() ? (
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <iframe
                title="email-preview"
                className="w-full"
                style={{ height: '60vh' }}
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                srcDoc={`<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head><body>${message.emailHtml}</body></html>`}
              />
            </div>
          ) : message.emailText && message.emailText.trim() ? (
            <pre className="whitespace-pre-wrap font-sans border border-gray-200 rounded-lg p-4 bg-white">{message.emailText}</pre>
          ) : (
            <div className="text-gray-500 italic p-4 text-center bg-gray-50 rounded-lg">
              Aucun contenu disponible pour cet email
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

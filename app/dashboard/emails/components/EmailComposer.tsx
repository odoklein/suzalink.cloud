"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Save, 
  Paperclip, 
  X, 
  Plus,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileSignature,
  ListChecks
} from 'lucide-react';
import { EmailTemplateModal } from './EmailTemplateModal';
import { EmailSignatureEditor } from './EmailSignatureEditor';
import { toast } from 'sonner';
import { translations as t } from '../translations';

interface EmailConfig {
  id: string;
  emailAddress: string;
  displayName: string;
  isActive: boolean;
}

interface Attachment {
  id: string;
  file: File;
  name: string;
  size: number;
}

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailSent?: () => void;
  replyTo?: {
    subject: string;
    to: string;
    content: string;
  };
}

export function EmailComposer({ isOpen, onClose, onEmailSent, replyTo }: EmailComposerProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [defaultSignature, setDefaultSignature] = useState<{ content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    to: replyTo?.to || '',
    cc: '',
    bcc: '',
    subject: replyTo?.subject?.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo?.subject || ''}`,
    content: replyTo?.content ? `\n\n--- Original Message ---\n${replyTo.content}` : '',
    configId: '',
  });

  // Load email configurations and default signature
  useEffect(() => {
    if (isOpen) {
      loadEmailConfigs();
      loadDefaultSignature();
    }
  }, [isOpen]);
  
  // Load default signature
  const loadDefaultSignature = async () => {
    try {
      const response = await fetch('/api/emails/signatures?default=true');
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setDefaultSignature(data[0]);
          
          // If this is a new email (not a reply) and content is empty, add the signature
          if (!replyTo && !formData.content && data[0].content) {
            setFormData(prev => ({ 
              ...prev, 
              content: `\n\n${data[0].content}` 
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading default signature:', error);
    }
  };

  const loadEmailConfigs = async () => {
    try {
      const response = await fetch('/api/emails/config');
      if (response.ok) {
        const configs = await response.json();
        setEmailConfigs(configs);
        if (configs.length > 0 && !formData.configId) {
          setFormData(prev => ({ ...prev, configId: configs[0].id }));
        }
      }
    } catch (error) {
      console.error('Error loading email configs:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newAttachments: Attachment[] = Array.from(files).map((file, index) => ({
        id: `${Date.now()}-${index}`,
        file,
        name: file.name,
        size: file.size,
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const saveDraft = async () => {
    setSaving(true);
    
    try {
      const response = await fetch('/api/emails/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formData.to.split(',').map(email => email.trim()).filter(Boolean),
          cc: formData.cc.split(',').map(email => email.trim()).filter(Boolean),
          bcc: formData.bcc.split(',').map(email => email.trim()).filter(Boolean),
          subject: formData.subject,
          content: formData.content,
          attachments: attachments.map(att => ({ file: att.file })),
          configId: formData.configId,
        }),
      });

      if (response.ok) {
        toast.success('Draft saved successfully');
        onClose();
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Error saving draft');
    } finally {
      setSaving(false);
    }
  };

  const sendEmail = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formData.to.split(',').map(email => email.trim()).filter(Boolean),
          cc: formData.cc.split(',').map(email => email.trim()).filter(Boolean),
          bcc: formData.bcc.split(',').map(email => email.trim()).filter(Boolean),
          subject: formData.subject,
          content: formData.content,
          attachments: attachments.map(att => ({ file: att.file })),
          configId: formData.configId,
        }),
      });

      if (response.ok) {
        toast.success('Email sent successfully');
        onEmailSent?.();
        onClose();
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Error sending email');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      content: '',
      configId: '',
    });
    setAttachments([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  // Handle template selection
  const handleTemplateSelect = (template: { subject: string; content: string }) => {
    setFormData(prev => ({
      ...prev,
      subject: template.subject,
      content: template.content + (defaultSignature?.content ? `\n\n${defaultSignature.content}` : '')
    }));
  };
  
  // Handle signature selection
  const handleSignatureSelect = (signature: { content: string }) => {
    // Insert signature at cursor position or at the end
    const textarea = document.getElementById('content') as HTMLTextAreaElement;
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const textBefore = formData.content.substring(0, cursorPos);
      const textAfter = formData.content.substring(cursorPos);
      
      setFormData(prev => ({
        ...prev,
        content: textBefore + '\n' + signature.content + textAfter
      }));
    } else {
      // Fallback if textarea not found
      setFormData(prev => ({
        ...prev,
        content: prev.content + '\n\n' + signature.content
      }));
    }
  };

  const canSend = formData.to.trim() && formData.subject.trim() && formData.content.trim() && formData.configId;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            {replyTo ? t.replyToEmail : t.composeEmail}
          </DialogTitle>
          <DialogDescription>
            {replyTo ? t.replyToSelectedEmail : t.createAndSendNewEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email Configuration */}
          {emailConfigs.length > 0 && (
            <div>
              <Label htmlFor="configId">{t.sendFrom}</Label>
              <select
                id="configId"
                value={formData.configId}
                onChange={(e) => handleInputChange('configId', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {emailConfigs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.displayName} ({config.emailAddress})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Recipients */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="to">{t.to}</Label>
              <Input
                id="to"
                value={formData.to}
                onChange={(e) => handleInputChange('to', e.target.value)}
                placeholder="destinataire@example.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cc">{t.cc}</Label>
                <Input
                  id="cc"
                  value={formData.cc}
                  onChange={(e) => handleInputChange('cc', e.target.value)}
                  placeholder="cc@example.com"
                />
              </div>
              <div>
                <Label htmlFor="bcc">{t.bcc}</Label>
                <Input
                  id="bcc"
                  value={formData.bcc}
                  onChange={(e) => handleInputChange('bcc', e.target.value)}
                  placeholder="cci@example.com"
                />
              </div>
            </div>
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="subject">{t.subject}</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder={t.emailSubject}
              required
            />
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>{t.attachments}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Paperclip className="w-4 h-4" />
                {t.addFiles}
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">{attachment.name}</div>
                        <div className="text-xs text-gray-500">{formatFileSize(attachment.size)}</div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(attachment.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="content">{t.message}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplateModal(true)}
                  className="flex items-center gap-1"
                >
                  <ListChecks className="w-4 h-4" />
                  {t.templates}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSignatureModal(true)}
                  className="flex items-center gap-1"
                >
                  <FileSignature className="w-4 h-4" />
                  {t.signatures}
                </Button>
              </div>
            </div>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder={t.typeYourMessage}
              rows={12}
              required
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            {t.cancel}
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={saving || !formData.content.trim()}
              className="flex items-center gap-2"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? t.saving : t.saveDraft}
            </Button>

            <Button
              onClick={sendEmail}
              disabled={loading || !canSend}
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {loading ? t.sending : t.send}
            </Button>
          </div>
        </DialogFooter>
        
        {/* Template Modal */}
        <EmailTemplateModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onTemplateSelect={handleTemplateSelect}
        />
        
        {/* Signature Modal */}
        <EmailSignatureEditor
          isOpen={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSignatureSelect={handleSignatureSelect}
        />
      </DialogContent>
    </Dialog>
  );
}

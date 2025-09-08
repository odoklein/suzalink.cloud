"use client";

import React, { useState, useEffect } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, 
  Save, 
  Trash2,
  RefreshCw,
  Plus,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { translations as t } from '../translations';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface EmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelect?: (template: { subject: string; content: string }) => void;
}

export function EmailTemplateModal({ isOpen, onClose, onTemplateSelect }: EmailTemplateModalProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
  });

  // Load templates
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/emails/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data || []);
      } else {
        toast.error('Failed to load email templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Error loading email templates');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      content: '',
    });
    setSelectedTemplate(null);
  };

  const handleCreateNew = () => {
    resetForm();
    setMode('create');
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      content: template.content,
    });
    setMode('edit');
  };

  const handleSave = async () => {
    if (!formData.name || !formData.subject || !formData.content) {
      toast.error('Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const url = mode === 'edit' && selectedTemplate 
        ? `/api/emails/templates/${selectedTemplate.id}` 
        : '/api/emails/templates';
      
      const method = mode === 'edit' ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(`Template ${mode === 'edit' ? 'updated' : 'created'} successfully`);
        loadTemplates();
        setMode('list');
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${mode === 'edit' ? 'update' : 'create'} template`);
      }
    } catch (error) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} template:`, error);
      toast.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} template`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const response = await fetch(`/api/emails/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Template deleted successfully');
        loadTemplates();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Error deleting template');
    } finally {
      setDeleting(null);
    }
  };

  const handleSelect = (template: EmailTemplate) => {
    if (onTemplateSelect) {
      onTemplateSelect({
        subject: template.subject,
        content: template.content,
      });
      onClose();
    }
  };

  const handleClose = () => {
    resetForm();
    setMode('list');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {mode === 'list'
              ? t.emailTemplates
              : mode === 'create'
                ? t.createNewTemplate
                : t.editTemplate}
          </DialogTitle>
          <DialogDescription>
            {mode === 'list'
              ? t.selectTemplateOrCreateNew
              : mode === 'create'
                ? t.createNewReusableTemplate
                : t.editExistingTemplate}
          </DialogDescription>
        </DialogHeader>

        {mode === 'list' && (
          <>
            <div className="flex justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadTemplates}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {t.refresh}
              </Button>
              <Button
                onClick={handleCreateNew}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t.newTemplate}
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>{t.noTemplatesFound}</p>
                <Button
                  onClick={handleCreateNew}
                  variant="outline"
                  className="mt-4"
                >
                  {t.createYourFirstTemplate}
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-lg mb-1">{template.name}</h3>
                          <p className="text-sm text-gray-500 mb-1">Subject: {template.subject}</p>
                          <p className="text-sm text-gray-500 truncate">
                            {template.content.substring(0, 100)}
                            {template.content.length > 100 && '...'}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(template)}
                          >
                            {t.edit}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                            disabled={deleting === template.id}
                          >
                            {deleting === template.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-500" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSelect(template)}
                          >
                            <Check className="w-4 h-4" />
                            {t.use}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {(mode === 'create' || mode === 'edit') && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{t.templateName}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t.templateNamePlaceholder}
              />
            </div>

            <div>
              <Label htmlFor="subject">{t.subject}</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder={t.emailSubject}
              />
            </div>

            <div>
              <Label htmlFor="content">{t.emailContent}</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder={t.emailContentPlaceholder}
                rows={10}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            {t.cancel}
          </Button>

          {(mode === 'create' || mode === 'edit') && (
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name || !formData.subject || !formData.content}
              className="flex items-center gap-2"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? t.saving : t.saveTemplate}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

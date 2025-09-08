"use client";

import React, { useState, useEffect } from 'react';
import '../email-content-styles.css';
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
  FileSignature, 
  Save, 
  Trash2,
  RefreshCw,
  Plus,
  Check,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import { translations as t } from '../translations';

interface EmailSignature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmailSignatureEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSignatureSelect?: (signature: { content: string }) => void;
}

export function EmailSignatureEditor({ isOpen, onClose, onSignatureSelect }: EmailSignatureEditorProps) {
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedSignature, setSelectedSignature] = useState<EmailSignature | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    isDefault: false
  });

  // Load signatures
  useEffect(() => {
    if (isOpen) {
      loadSignatures();
    }
  }, [isOpen]);

  const loadSignatures = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/emails/signatures');
      if (response.ok) {
        const data = await response.json();
        setSignatures(data || []);
      } else {
        toast.error('Failed to load email signatures');
      }
    } catch (error) {
      console.error('Error loading signatures:', error);
      toast.error('Error loading email signatures');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      content: '',
      isDefault: false
    });
    setSelectedSignature(null);
  };

  const handleCreateNew = () => {
    resetForm();
    setMode('create');
  };

  const handleEdit = (signature: EmailSignature) => {
    setSelectedSignature(signature);
    setFormData({
      name: signature.name,
      content: signature.content,
      isDefault: signature.isDefault
    });
    setMode('edit');
  };

  const handleSave = async () => {
    if (!formData.name || !formData.content) {
      toast.error('Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const url = mode === 'edit' && selectedSignature 
        ? `/api/emails/signatures/${selectedSignature.id}` 
        : '/api/emails/signatures';
      
      const method = mode === 'edit' ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(`Signature ${mode === 'edit' ? 'updated' : 'created'} successfully`);
        loadSignatures();
        setMode('list');
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${mode === 'edit' ? 'update' : 'create'} signature`);
      }
    } catch (error) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} signature:`, error);
      toast.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} signature`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const response = await fetch(`/api/emails/signatures/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Signature deleted successfully');
        loadSignatures();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete signature');
      }
    } catch (error) {
      console.error('Error deleting signature:', error);
      toast.error('Error deleting signature');
    } finally {
      setDeleting(null);
    }
  };

  const handleSelect = (signature: EmailSignature) => {
    if (onSignatureSelect) {
      onSignatureSelect({
        content: signature.content,
      });
      onClose();
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/emails/signatures/${id}/default`, {
        method: 'PUT',
      });

      if (response.ok) {
        toast.success('Default signature updated');
        loadSignatures();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update default signature');
      }
    } catch (error) {
      console.error('Error updating default signature:', error);
      toast.error('Error updating default signature');
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
            <FileSignature className="w-5 h-5" />
            {mode === 'list'
              ? t.emailSignatures
              : mode === 'create'
                ? t.createNewSignature
                : t.editSignature}
          </DialogTitle>
          <DialogDescription>
            {mode === 'list'
              ? t.selectSignatureOrCreateNew
              : mode === 'create'
                ? t.createNewEmailSignature
                : t.editExistingSignature}
          </DialogDescription>
        </DialogHeader>

        {mode === 'list' && (
          <>
            <div className="flex justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSignatures}
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
                {t.newSignature}
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : signatures.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileSignature className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>{t.noSignaturesFound}</p>
                <Button
                  onClick={handleCreateNew}
                  variant="outline"
                  className="mt-4"
                >
                  {t.createYourFirstSignature}
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {signatures.map((signature) => (
                  <Card key={signature.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-lg">{signature.name}</h3>
                            {signature.isDefault && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Default</span>
                            )}
                          </div>
                          <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                            <div className="bg-white rounded">
                              <iframe
                                title={`signature-${signature.id}`}
                                className="w-full"
                                style={{ height: '120px' }}
                                sandbox="allow-same-origin"
                                srcDoc={`<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head><body>${signature.content}</body></html>`}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(signature)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(signature.id)}
                            disabled={deleting === signature.id}
                          >
                            {deleting === signature.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-500" />
                            )}
                          </Button>
                          {!signature.isDefault && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefault(signature.id)}
                            >
                              {t.setDefault}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleSelect(signature)}
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
              <Label htmlFor="name">{t.signatureName}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t.signatureNamePlaceholder}
              />
            </div>
            
            <div>
              <Label htmlFor="content">{t.signatureContent}</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder={t.signatureContentPlaceholder}
                rows={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t.htmlTagsNote}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isDefault">{t.setAsDefaultSignature}</Label>
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
              disabled={saving || !formData.name || !formData.content}
              className="flex items-center gap-2"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? t.saving : t.saveSignature}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

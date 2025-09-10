"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from './RichTextEditor';
import { TemplateVariables } from './TemplateVariables';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Eye,
  FileText,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface EmailTemplateCategory {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
}

interface TemplateFormProps {
  template?: EmailTemplate | null;
  categories: EmailTemplateCategory[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function TemplateForm({ template, categories, onSuccess, onCancel }: TemplateFormProps) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showVariables, setShowVariables] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    category_id: '',
  });

  // Initialize form with template data if editing
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        subject: template.subject,
        content: template.content,
        category_id: template.category_id || '',
      });
    } else {
      setFormData({
        name: '',
        subject: '',
        content: '',
        category_id: '',
      });
    }
  }, [template]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInsertVariable = (variable: string) => {
    // Insert variable at cursor position in the rich text editor
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editor) {
      editor.focus();
      document.execCommand('insertText', false, variable);
      // Trigger onChange to update formData
      if (editor) {
        handleInputChange('content', editor.innerHTML);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (!formData.subject.trim()) {
      toast.error('Email subject is required');
      return;
    }

    if (!formData.content.trim()) {
      toast.error('Email content is required');
      return;
    }

    setLoading(true);

    try {
      const url = template ? `/api/emails/templates/${template.id}` : '/api/emails/templates';
      const method = template ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          template
            ? 'Template updated successfully'
            : 'Template created successfully'
        );
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Error saving template');
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!template;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Templates
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Template' : 'Create New Template'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing
              ? 'Update your email template content and settings'
              : 'Create a reusable email template for your prospects'
            }
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Template Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Template Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Initial Contact, Follow-up, Meeting Request"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Choose a descriptive name for your template
                  </p>
                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={formData.category_id}
                    onChange={(e) => handleInputChange('category_id', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">No category (Uncategorized)</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    Organize your template into a category for better management
                  </p>
                </div>

                {/* Email Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder="e.g., Let's discuss your project"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    The subject line that recipients will see
                  </p>
                </div>

                {/* Email Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">Email Content *</Label>
                  <RichTextEditor
                    value={formData.content}
                    onChange={(value) => handleInputChange('content', value)}
                    placeholder="Write your email content here..."
                    className="min-h-[300px]"
                  />
                  <p className="text-xs text-gray-500">
                    Use the toolbar above for formatting. You can use variables like {`{{firstName}}`}, {`{{company}}`}, etc.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowVariables(!showVariables)}
                    className="flex items-center gap-2"
                  >
                    <Hash className="w-4 h-4" />
                    {showVariables ? 'Hide Variables' : 'Show Variables'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {loading
                      ? (isEditing ? 'Updating...' : 'Creating...')
                      : (isEditing ? 'Update Template' : 'Create Template')
                    }
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Preview and Variables */}
        <div className="lg:col-span-1 space-y-4">
          {showPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Subject:</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {(formData.subject || 'No subject')
                        .replace(/\{\{firstName\}\}/g, 'John')
                        .replace(/\{\{lastName\}\}/g, 'Doe')
                        .replace(/\{\{fullName\}\}/g, 'John Doe')
                        .replace(/\{\{company\}\}/g, 'Acme Corp')
                        .replace(/\{\{industry\}\}/g, 'Technology')
                        .replace(/\{\{website\}\}/g, 'www.acme.com')
                        .replace(/\{\{companySize\}\}/g, '50-100 employees')
                        .replace(/\{\{email\}\}/g, 'john.doe@acme.com')
                        .replace(/\{\{phone\}\}/g, '+1 (555) 123-4567')
                        .replace(/\{\{userName\}\}/g, 'Your Name')
                        .replace(/\{\{userEmail\}\}/g, 'your.email@company.com')
                        .replace(/\{\{userCompany\}\}/g, 'Your Company')
                      }
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Content:</Label>
                    <div className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-md max-h-64 overflow-y-auto prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ 
                        __html: (formData.content || 'No content')
                          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                          .replace(/\{\{firstName\}\}/g, 'John')
                          .replace(/\{\{lastName\}\}/g, 'Doe')
                          .replace(/\{\{fullName\}\}/g, 'John Doe')
                          .replace(/\{\{company\}\}/g, 'Acme Corp')
                          .replace(/\{\{industry\}\}/g, 'Technology')
                          .replace(/\{\{website\}\}/g, 'www.acme.com')
                          .replace(/\{\{companySize\}\}/g, '50-100 employees')
                          .replace(/\{\{email\}\}/g, 'john.doe@acme.com')
                          .replace(/\{\{phone\}\}/g, '+1 (555) 123-4567')
                          .replace(/\{\{userName\}\}/g, 'Your Name')
                          .replace(/\{\{userEmail\}\}/g, 'your.email@company.com')
                          .replace(/\{\{userCompany\}\}/g, 'Your Company')
                      }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!showPreview && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Template Preview
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Click "Show Preview" to see how your template will look
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                    className="w-full"
                  >
                    Show Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {showVariables && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Hash className="w-5 h-5" />
                  Template Variables
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                <TemplateVariables onInsertVariable={handleInsertVariable} />
              </CardContent>
            </Card>
          )}

          {!showVariables && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Hash className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Template Variables
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Insert dynamic content like prospect names, company info, etc.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowVariables(true)}
                    className="w-full"
                  >
                    Show Variables
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

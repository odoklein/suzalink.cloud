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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Mail, 
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  User,
  Building
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

interface EmailConfig {
  id: string;
  emailAddress: string;
  displayName: string;
  isActive: boolean;
}

interface Interlocuteur {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Prospect {
  id: string;
  data: {
    name: string;
    email?: string;
    phone?: string;
    industry?: string;
    website?: string;
  };
  prospect_interlocuteurs?: Interlocuteur[];
}

interface ProspectEmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: Prospect | null;
  onEmailSent?: () => void;
}

export function ProspectEmailDialog({ 
  isOpen, 
  onClose, 
  prospect, 
  onEmailSent 
}: ProspectEmailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [customSubject, setCustomSubject] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [useTemplate, setUseTemplate] = useState(true);
  const [selectedRecipient, setSelectedRecipient] = useState<'prospect' | 'interlocuteur'>('interlocuteur');

  // Load templates and email configs when dialog opens
  useEffect(() => {
    if (isOpen && prospect) {
      loadTemplates();
      loadEmailConfigs();
      // Pre-fill recipient email
      if (prospect.data.email) {
        // Email will be auto-filled in the form
      }
    }
  }, [isOpen, prospect]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplate('');
      setSelectedConfig('');
      setCustomSubject('');
      setCustomContent('');
      setUseTemplate(true);
      setSelectedRecipient('interlocuteur');
    }
  }, [isOpen]);

  const loadTemplates = async () => {
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
    }
  };

  const loadEmailConfigs = async () => {
    try {
      const response = await fetch('/api/emails/config');
      if (response.ok) {
        const configs = await response.json();
        setEmailConfigs(configs || []);
        // Auto-select first active config
        if (configs && configs.length > 0) {
          setSelectedConfig(configs[0].id);
        }
      } else {
        toast.error('Failed to load email configurations');
      }
    } catch (error) {
      console.error('Error loading email configs:', error);
      toast.error('Error loading email configurations');
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setCustomSubject(template.subject);
      setCustomContent(template.content);
    }
  };

  // Get the selected recipient email
  const getSelectedRecipientEmail = (): string | null => {
    if (selectedRecipient === 'interlocuteur') {
      return prospect?.prospect_interlocuteurs?.[0]?.email || null;
    } else {
      return prospect?.data.email || null;
    }
  };

  // Get the selected recipient name
  const getSelectedRecipientName = (): string => {
    if (selectedRecipient === 'interlocuteur') {
      return prospect?.prospect_interlocuteurs?.[0]?.name || prospect?.data.name || 'Unknown';
    } else {
      return prospect?.data.name || 'Unknown';
    }
  };

  const handleSendEmail = async () => {
    const recipientEmail = getSelectedRecipientEmail();
    
    if (!recipientEmail) {
      const recipientType = selectedRecipient === 'interlocuteur' ? 'interlocuteur' : 'prospect';
      toast.error(`${recipientType} email is required`);
      return;
    }

    if (!selectedConfig) {
      toast.error('Please select an email configuration');
      return;
    }

    if (!customSubject.trim() || !customContent.trim()) {
      toast.error('Subject and content are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: [recipientEmail],
          subject: customSubject,
          content: customContent,
          configId: selectedConfig,
          prospectId: prospect?.id,
          prospectEmail: recipientEmail,
        }),
      });

      if (response.ok) {
        toast.success('Email sent successfully');
        onEmailSent?.();
        onClose();
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

  // Function to strip HTML tags and get clean text
  const stripHtmlTags = (html: string): string => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  // Function to replace template variables with sample data
  const replaceTemplateVariables = (content: string): string => {
    // Get the first interlocuteur's name, or fall back to prospect name
    const interlocuteurName = prospect.prospect_interlocuteurs?.[0]?.name || prospect.data.name;
    const firstName = interlocuteurName?.split(' ')[0] || 'John';
    const lastName = interlocuteurName?.split(' ').slice(1).join(' ') || 'Doe';
    const fullName = interlocuteurName || 'John Doe';
    
    return content
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{lastName\}\}/g, lastName)
      .replace(/\{\{fullName\}\}/g, fullName)
      .replace(/\{\{company\}\}/g, prospect.data.name || 'Acme Corp')
      .replace(/\{\{industry\}\}/g, prospect.data.industry || 'Technology')
      .replace(/\{\{website\}\}/g, prospect.data.website || 'www.acme.com')
      .replace(/\{\{companySize\}\}/g, '50-100 employees')
      .replace(/\{\{email\}\}/g, prospect.data.email || 'john.doe@acme.com')
      .replace(/\{\{phone\}\}/g, prospect.data.phone || '+1 (555) 123-4567')
      .replace(/\{\{userName\}\}/g, 'Your Name')
      .replace(/\{\{userEmail\}\}/g, 'your.email@company.com')
      .replace(/\{\{userCompany\}\}/g, 'Your Company');
  };

  // Function to get clean preview content
  const getPreviewContent = (content: string): string => {
    const withVariables = replaceTemplateVariables(content);
    return stripHtmlTags(withVariables);
  };

  const canSend = getSelectedRecipientEmail() && selectedConfig && customSubject.trim() && customContent.trim();

  if (!prospect) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send Email to Prospect
          </DialogTitle>
          <DialogDescription>
            Send an email to {prospect.data.name} using a template or custom content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Prospect Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building className="w-4 h-4" />
                Prospect Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{prospect.data.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{prospect.data.email}</span>
              </div>
              {prospect.data.industry && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{prospect.data.industry}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recipient Selection */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Send To</Label>
            <Select value={selectedRecipient} onValueChange={(value: 'prospect' | 'interlocuteur') => setSelectedRecipient(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose recipient" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interlocuteur">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {prospect.prospect_interlocuteurs?.[0]?.name || 'Interlocuteur'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {prospect.prospect_interlocuteurs?.[0]?.email || 'No email available'}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="prospect">
                  <div className="flex flex-col">
                    <span className="font-medium">{prospect.data.name} (Company)</span>
                    <span className="text-xs text-muted-foreground">
                      {prospect.data.email || 'No email available'}
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose whether to send to the interlocuteur or the company email
            </p>
          </div>

          {/* Email Configuration */}
          <div className="space-y-2">
            <Label htmlFor="emailConfig">Send From</Label>
            <Select value={selectedConfig} onValueChange={setSelectedConfig}>
              <SelectTrigger>
                <SelectValue placeholder="Select email configuration" />
              </SelectTrigger>
              <SelectContent>
                {emailConfigs.map((config) => (
                  <SelectItem key={config.id} value={config.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{config.displayName}</span>
                      <span className="text-muted-foreground">({config.emailAddress})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="text-base font-medium">Email Content</Label>
              <div className="flex gap-2">
                <Button
                  variant={useTemplate ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseTemplate(true)}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Use Template
                </Button>
                <Button
                  variant={!useTemplate ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseTemplate(false)}
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Custom Email
                </Button>
              </div>
            </div>

            {useTemplate ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template">Select Template</Label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an email template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length === 0 ? (
                        <SelectItem value="no-templates" disabled>
                          No templates available
                        </SelectItem>
                      ) : (
                        templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{template.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {template.subject}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {templates.length === 0 && (
                  <div className="p-4 border border-dashed border-muted-foreground/25 rounded-lg text-center">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      No email templates found
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // You could open a template creation dialog here
                        toast.info('Create templates in the Email section');
                      }}
                    >
                      Create Template
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-muted-foreground/25 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  Write your custom email content below
                </p>
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="Email subject"
              required
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Message</Label>
            <Textarea
              id="content"
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              placeholder="Type your message here..."
              rows={8}
              required
            />
          </div>

          {/* Preview */}
          {(customSubject || customContent) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">To:</Label>
                  <p className="text-sm">{getSelectedRecipientEmail() || 'No email available'}</p>
                  <p className="text-xs text-muted-foreground">
                    {getSelectedRecipientName()} ({selectedRecipient === 'interlocuteur' ? 'Interlocuteur' : 'Company'})
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Subject:</Label>
                  <p className="text-sm font-medium">{replaceTemplateVariables(customSubject) || 'No subject'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Content:</Label>
                  <div className="text-sm whitespace-pre-wrap border rounded p-3 bg-muted/50 max-h-32 overflow-y-auto">
                    {getPreviewContent(customContent) || 'No content'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={loading || !canSend}
            className="flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {loading ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

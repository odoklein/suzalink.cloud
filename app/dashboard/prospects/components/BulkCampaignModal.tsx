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
  Mail, 
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
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


interface BulkCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProspectIds: string[];
  onSuccess?: () => void;
}

export function BulkCampaignModal({ 
  isOpen, 
  onClose, 
  selectedProspectIds,
  onSuccess 
}: BulkCampaignModalProps) {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplate('');
      setCampaignName('');
      setCampaignDescription('');
      setScheduledAt('');
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


  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error('Campaign name is required');
      return;
    }

    if (!selectedTemplate) {
      toast.error('Please select an email template');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/emails/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: campaignName,
          description: campaignDescription,
          template_id: selectedTemplate,
          prospect_ids: selectedProspectIds,
          scheduled_at: scheduledAt || null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Campaign "${campaignName}" created successfully with ${selectedProspectIds.length} prospects`);
        onSuccess?.();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Error creating campaign');
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Créer une campagne email
          </DialogTitle>
          <DialogDescription>
            Créez une campagne email pour {selectedProspectIds.length} prospect{selectedProspectIds.length > 1 ? 's' : ''} sélectionné{selectedProspectIds.length > 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations de la campagne</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaignName">Nom de la campagne *</Label>
                <Input
                  id="campaignName"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Ex: Campagne Q1 2024"
                />
              </div>
              
              <div>
                <Label htmlFor="campaignDescription">Description (optionnel)</Label>
                <Textarea
                  id="campaignDescription"
                  value={campaignDescription}
                  onChange={(e) => setCampaignDescription(e.target.value)}
                  placeholder="Description de la campagne..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="scheduledAt">Planifier l'envoi (optionnel)</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>


          {/* Email Template */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="template">Template *</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{template.name}</span>
                          <span className="text-sm text-muted-foreground">{template.subject}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplateData && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">Aperçu du template</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Sujet: </span>
                      <span className="text-sm">{selectedTemplateData.subject}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Contenu: </span>
                      <div 
                        className="text-sm text-muted-foreground max-h-32 overflow-y-auto"
                        dangerouslySetInnerHTML={{ 
                          __html: (selectedTemplateData.content || '').substring(0, 200) + ((selectedTemplateData.content || '').length > 200 ? '...' : '')
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Résumé
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{selectedProspectIds.length} prospect{selectedProspectIds.length > 1 ? 's' : ''} sera{selectedProspectIds.length > 1 ? 'nt' : ''} ajouté{selectedProspectIds.length > 1 ? 's' : ''} à la campagne</span>
              </div>
              {scheduledAt && (
                <div className="flex items-center gap-2 text-sm mt-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span>Envoi programmé pour le {new Date(scheduledAt).toLocaleString('fr-FR')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleCreateCampaign} disabled={loading}>
            {loading ? 'Création...' : 'Créer la campagne'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

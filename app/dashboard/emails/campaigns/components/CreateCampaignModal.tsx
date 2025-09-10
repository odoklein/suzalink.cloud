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
import { toast } from 'sonner';
import { Calendar, Users, Mail } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
}

interface Prospect {
  id: string;
  data: any;
  list_id: string;
}

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated: () => void;
}

export function CreateCampaignModal({ isOpen, onClose, onCampaignCreated }: CreateCampaignModalProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_id: '',
    prospect_ids: [] as string[],
    scheduled_at: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadProspects();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/emails/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadProspects = async () => {
    try {
      const response = await fetch('/api/prospects');
      if (response.ok) {
        const data = await response.json();
        setProspects(data.prospects || []);
      }
    } catch (error) {
      console.error('Error loading prospects:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.template_id || formData.prospect_ids.length === 0) {
      toast.error('Please fill in all required fields');
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
          name: formData.name,
          description: formData.description,
          template_id: formData.template_id,
          prospect_ids: formData.prospect_ids,
          scheduled_at: formData.scheduled_at || null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Campaign created successfully with ${result.recipients_added} recipients`);
        onCampaignCreated();
        onClose();
        setFormData({
          name: '',
          description: '',
          template_id: '',
          prospect_ids: [],
          scheduled_at: ''
        });
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

  const handleProspectToggle = (prospectId: string) => {
    setFormData(prev => ({
      ...prev,
      prospect_ids: prev.prospect_ids.includes(prospectId)
        ? prev.prospect_ids.filter(id => id !== prospectId)
        : [...prev.prospect_ids, prospectId]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Create Email Campaign
          </DialogTitle>
          <DialogDescription>
            Create a new email campaign to send to your prospects
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter campaign name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter campaign description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Email Template *</Label>
            <Select
              value={formData.template_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, template_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an email template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-gray-500">{template.subject}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Recipients *</Label>
            <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
              {prospects.length === 0 ? (
                <p className="text-gray-500 text-sm">No prospects available</p>
              ) : (
                <div className="space-y-2">
                  {prospects.map((prospect) => (
                    <div key={prospect.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={prospect.id}
                        checked={formData.prospect_ids.includes(prospect.id)}
                        onChange={() => handleProspectToggle(prospect.id)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={prospect.id} className="text-sm">
                        {prospect.data?.name || prospect.data?.email || 'Unknown Prospect'}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {formData.prospect_ids.length} prospect(s) selected
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled_at">Schedule (Optional)</Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              value={formData.scheduled_at}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: e.target.value }))}
            />
            <p className="text-sm text-gray-500">
              Leave empty to send immediately
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


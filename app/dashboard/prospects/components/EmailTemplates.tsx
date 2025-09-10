"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mail, Plus, Edit, Trash2, Send } from "lucide-react";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'introduction' | 'followup' | 'closing' | 'custom';
  created_at: string;
}

interface EmailTemplatesProps {
  onSendEmail?: (templateId: string, prospectId: string) => void;
  prospectId?: string;
}

const templateTypes = [
  { value: 'introduction', label: 'Introduction', description: 'Premier contact avec un prospect' },
  { value: 'followup', label: 'Suivi', description: 'Relance après un premier contact' },
  { value: 'closing', label: 'Clôture', description: 'Finalisation d\'une vente' },
  { value: 'custom', label: 'Personnalisé', description: 'Template personnalisé' }
];

export function EmailTemplates({ onSendEmail, prospectId }: EmailTemplatesProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    type: 'introduction' as EmailTemplate['type']
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/email-templates');
      const data = await res.json();

      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error("Erreur lors du chargement des templates");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const res = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to create template');

      toast.success("Template créé avec succès");
      setShowCreateModal(false);
      setFormData({ name: '', subject: '', content: '', type: 'introduction' });
      fetchTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error("Erreur lors de la création");
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const res = await fetch(`/api/email-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to update template');

      toast.success("Template mis à jour avec succès");
      setEditingTemplate(null);
      setFormData({ name: '', subject: '', content: '', type: 'introduction' });
      fetchTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) return;

    try {
      const res = await fetch(`/api/email-templates/${templateId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete template');

      toast.success("Template supprimé avec succès");
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSendEmail = (templateId: string) => {
    if (onSendEmail && prospectId) {
      onSendEmail(templateId, prospectId);
    }
  };

  const openEditModal = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      content: template.content,
      type: template.type
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Templates d'Email</h3>
          <p className="text-sm text-muted-foreground">Gérez vos templates d'emails pour les prospects</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Template
        </Button>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {template.name}
                    <Badge variant="outline">
                      {templateTypes.find(t => t.value === template.type)?.label}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    <strong>Sujet:</strong> {template.subject}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  {prospectId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendEmail(template.id)}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Envoyer
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(template)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <div className="whitespace-pre-wrap line-clamp-3">
                  {template.content}
                </div>
                <div className="mt-2 text-xs">
                  Créé le {new Date(template.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun template</h3>
            <p className="text-muted-foreground text-center mb-4">
              Créez votre premier template d'email pour commencer à communiquer avec vos prospects.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal || !!editingTemplate} onOpenChange={(open) => {
        if (!open) {
          setShowCreateModal(false);
          setEditingTemplate(null);
          setFormData({ name: '', subject: '', content: '', type: 'introduction' });
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Modifier le template' : 'Créer un template d\'email'}
            </DialogTitle>
            <DialogDescription>
              Configurez votre template d'email pour les prospects.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du template</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Introduction PME"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as EmailTemplate['type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Sujet de l'email</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Ex: Découvrez nos services pour votre entreprise"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Contenu de l'email</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Cher {{nom}},

Nous sommes spécialisés dans..."
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Utilisez {'{{nom}}'} pour insérer le nom du prospect automatiquement.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setEditingTemplate(null);
                setFormData({ name: '', subject: '', content: '', type: 'introduction' });
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
              disabled={!formData.name.trim() || !formData.subject.trim() || !formData.content.trim()}
            >
              {editingTemplate ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Conversation } from '@/app/types/messagerie';
import { MessagerieAPI } from '../lib/messagerie-api';

interface EditConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  onConversationUpdated: (conversation: Conversation) => void;
}

export function EditConversationModal({
  isOpen,
  onClose,
  conversation,
  onConversationUpdated
}: EditConversationModalProps) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (conversation) {
      setTitle(conversation.title || '');
    }
  }, [conversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation) return;

    try {
      setLoading(true);
      const response = await MessagerieAPI.updateConversation(conversation.id, {
        title: title.trim() || null
      });
      onConversationUpdated(response.conversation);
      toast.success('Conversation mise à jour avec succès');
      onClose();
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast.error('Erreur lors de la mise à jour de la conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier la conversation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre de la conversation</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entrez un titre pour la conversation"
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mettre à jour
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

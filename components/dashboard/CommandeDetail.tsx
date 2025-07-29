'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type CommandeDetailProps = {
  commande: {
    id: string;
    created_at: string;
    data: Record<string, any>;
    status?: string;
    notes?: string;
  };
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onNotesChange: (notes: string) => void;
};

export function CommandeDetail({
  commande,
  onClose,
  onStatusChange,
  onNotesChange,
}: CommandeDetailProps) {
  const status = (['nouvelle', 'en cours', 'terminée'].includes(commande.status || '') 
    ? commande.status 
    : 'nouvelle') as 'nouvelle' | 'en cours' | 'terminée';

  const statusColors: Record<'nouvelle' | 'en cours' | 'terminée', string> = {
    nouvelle: 'bg-red-100 text-red-800',
    'en cours': 'bg-yellow-100 text-yellow-800',
    terminée: 'bg-green-100 text-green-800',
  };

  return (
    <Dialog open={!!commande} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-4">
            Commande #{commande.id}
            <Badge className={statusColors[status]}>{status}</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(commande.data?.fields || {}).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <h4 className="text-sm font-medium text-gray-500">
                  {key.replace('fields[', '').replace('][value]', '').replace('_', ' ')}
                </h4>
                <p className="text-sm">{String(value)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Status</h3>
            <select
              className="w-full border rounded-md p-2"
              value={commande.status || 'nouvelle'}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="nouvelle">Nouvelle</option>
              <option value="en cours">En cours</option>
              <option value="terminée">Terminée</option>
            </select>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Notes</h3>
            <textarea
              className="w-full border rounded-md p-2 min-h-[100px]"
              value={commande.notes || ''}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Ajoutez des notes internes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={onClose}>Enregistrer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

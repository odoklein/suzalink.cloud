'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

type Commande = {
  id: string;
  nom: string;
  entreprise: string;
  date: string;
  status: 'nouvelle' | 'en cours' | 'terminée';
  avatar?: string;
};

type CommandeTableProps = {
  commandes: Commande[];
  isLoading: boolean;
  onSearch?: (query: string) => void;
  onStatusFilter?: (status: string) => void;
  onBulkStatusChange?: (ids: string[], status: string) => void;
};

export function CommandesTable({ 
  commandes, 
  isLoading,
  onSearch,
  onStatusFilter,
  onBulkStatusChange
}: CommandeTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    onStatusFilter?.(value);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? commandes.map(c => c.id) : []);
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => 
      checked ? [...prev, id] : prev.filter(i => i !== id)
    );
  };

  const handleBulkStatusChange = (status: string) => {
    onBulkStatusChange?.(selectedIds, status);
    setSelectedIds([]);
  };

  const statusColors = {
    nouvelle: 'bg-red-100 text-red-800',
    'en cours': 'bg-yellow-100 text-yellow-800',
    terminée: 'bg-green-100 text-green-800',
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={handleSearch}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="nouvelle">Nouvelle</SelectItem>
            <SelectItem value="en cours">En cours</SelectItem>
            <SelectItem value="terminée">Terminée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 p-2 bg-gray-50 rounded-md">
          <span className="text-sm">{selectedIds.length} sélectionné(s)</span>
          <Select onValueChange={handleBulkStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Modifier statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nouvelle">Nouvelle</SelectItem>
              <SelectItem value="en cours">En cours</SelectItem>
              <SelectItem value="terminée">Terminée</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedIds([])}
          >
            Annuler
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox 
                checked={selectedIds.length === commandes.length && commandes.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>Nom & Prénom</TableHead>
            <TableHead>Entreprise</TableHead>
            <TableHead>Date Rendez-vous</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commandes.map((commande) => (
            <TableRow key={commande.id} className="hover:bg-gray-50 cursor-pointer">
              <TableCell>
                <Checkbox 
                  checked={selectedIds.includes(commande.id)}
                  onCheckedChange={(checked) => handleSelect(commande.id, !!checked)}
                />
              </TableCell>
              <TableCell className="font-medium flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{commande.nom.slice(0, 2)}</AvatarFallback>
                </Avatar>
                {commande.nom}
              </TableCell>
              <TableCell>{commande.entreprise}</TableCell>
              <TableCell>{commande.date}</TableCell>
              <TableCell className="text-right">
                <Badge className={statusColors[commande.status]}>{commande.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface CreateProspectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string | null;
  onSuccess: () => void;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export function CreateProspectModal({ open, onOpenChange, listId, onSuccess }: CreateProspectModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState("none");
  const [assignedTo, setAssignedTo] = useState("unassigned");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (data.users) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    if (open) {
      fetchUsers();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Le nom de l'entreprise est requis");
      return;
    }

    if (!listId) {
      toast.error("Aucune liste sélectionnée");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listId,
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          industry: industry.trim() || null,
          website: website.trim() || null,
          status: status === "none" ? null : status,
          assignedTo: assignedTo === "unassigned" ? null : assignedTo || null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      toast.success("Prospect créé avec succès");
      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setIndustry("");
      setWebsite("");
      setStatus("none");
      setAssignedTo("unassigned");
      setNotes("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating prospect:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau prospect</DialogTitle>
          <DialogDescription>
            Ajoutez une nouvelle entreprise à votre liste de prospects.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nom de l'entreprise *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Acme Corp"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@acme.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="industry">Secteur d'activité</Label>
                <Input
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Ex: Informatique, Restauration..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="website">Site web</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.acme.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Statut</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-white/50 border-gray-200/50 hover:bg-white/70 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                    <SelectItem value="none" className="hover:bg-gray-50/50 focus:bg-gray-50/50">Status</SelectItem>
                    <SelectItem value="NRP" className="hover:bg-gray-50/50 focus:bg-gray-50/50">NRP</SelectItem>
                    <SelectItem value="Rappel" className="hover:bg-gray-50/50 focus:bg-gray-50/50">Rappel</SelectItem>
                    <SelectItem value="Relance" className="hover:bg-gray-50/50 focus:bg-gray-50/50">Relance</SelectItem>
                    <SelectItem value="Mail" className="hover:bg-gray-50/50 focus:bg-gray-50/50">Mail</SelectItem>
                    <SelectItem value="pas interessé" className="hover:bg-gray-50/50 focus:bg-gray-50/50">Pas intéressé</SelectItem>
                    <SelectItem value="barrage" className="hover:bg-gray-50/50 focus:bg-gray-50/50">Barrage</SelectItem>
                    <SelectItem value="devis" className="hover:bg-gray-50/50 focus:bg-gray-50/50">Devis</SelectItem>
                    <SelectItem value="rdv" className="hover:bg-gray-50/50 focus:bg-gray-50/50">RDV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assignedTo">Assigné à</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Non assigné</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes sur ce prospect..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer le prospect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

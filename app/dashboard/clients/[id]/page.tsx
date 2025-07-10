"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { User, Mail, Building2, MapPin, Phone, Edit2, Plus, FileText, Calendar, Users as UsersIcon, MessageCircle, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Client {
  id: string;
  name: string;
  contact_email: string;
  company: string;
  status: 'active' | 'pending' | 'inactive';
  region?: string;
  address?: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'primary' | 'secondary' | 'decision_maker';
  title?: string;
}

interface HistoryEntry {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note';
  date: string;
  description: string;
  outcome?: string;
}

interface Facture {
  id: string;
  invoice_number: string;
  date: string;
  total: number;
}

const CONTACT_STATUS_COLORS = {
  primary: 'bg-blue-500',
  secondary: 'bg-gray-500',
  decision_maker: 'bg-green-500',
};

const CONTACT_STATUS_LABELS = {
  primary: 'Primary Contact',
  secondary: 'Secondary Contact',
  decision_maker: 'Decision Maker',
};

const HISTORY_TYPE_LABELS = {
  email: 'Email',
  call: 'Call',
  meeting: 'Meeting',
  note: 'Note',
};

export default function ClientDetailPage() {
  const { id } = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'contacts'>('details');

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyForm, setHistoryForm] = useState({
    type: 'note' as HistoryEntry['type'],
    description: '',
    outcome: '',
  });

  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'secondary' as Contact['status'],
    title: '',
  });

  // Action modals state
  const [scheduleCallDialogOpen, setScheduleCallDialogOpen] = useState(false);
  const [sendProposalDialogOpen, setSendProposalDialogOpen] = useState(false);
  const [requestDocumentsDialogOpen, setRequestDocumentsDialogOpen] = useState(false);

  // Factures state
  const [factures, setFactures] = useState<Facture[]>([]);
  const [facturesLoading, setFacturesLoading] = useState(true);
  const [facturesError, setFacturesError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClient() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/clients/${id}`);
        if (!res.ok) throw new Error("Failed to fetch client");
        const data = await res.json();
        setClient(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchClient();
  }, [id]);

  useEffect(() => {
    async function fetchFactures() {
      setFacturesLoading(true);
      setFacturesError(null);
      try {
        const res = await fetch(`/api/factures?client_id=${id}`);
        if (!res.ok) throw new Error("Failed to fetch factures");
        const data = await res.json();
        setFactures(data);
      } catch (e: any) {
        setFacturesError(e.message);
      } finally {
        setFacturesLoading(false);
      }
    }
    if (id) fetchFactures();
  }, [id]);

  // Mock data for history and contacts
  useEffect(() => {
    // Mock history data
    setHistory([
      {
        id: '1',
        type: 'call',
        date: '2024-01-15',
        description: 'Initial contact call',
        outcome: 'Client interested in proposal',
      },
      {
        id: '2',
        type: 'email',
        date: '2024-01-10',
        description: 'Sent proposal document',
        outcome: 'Proposal sent successfully',
      },
      {
        id: '3',
        type: 'meeting',
        date: '2024-01-05',
        description: 'Discovery meeting',
        outcome: 'Requirements gathered',
      },
    ]);

    // Mock contacts data
    setContacts([
      {
        id: '1',
        name: 'Bruno Lespinée',
        email: 'bruno@example.com',
        phone: '1234567890',
        status: 'primary',
        title: 'CEO',
      },
      {
        id: '2',
        name: 'Julien Hernandez',
        email: 'julien@example.com',
        phone: '0987654321',
        status: 'decision_maker',
        title: 'CTO',
      },
      {
        id: '3',
        name: 'Fabien Loco',
        email: 'fabien@example.com',
        phone: '1122334455',
        status: 'secondary',
        title: 'Project Manager',
      },
    ]);
  }, [id]);

  function handleAddHistory(e: React.FormEvent) {
    e.preventDefault();
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      type: historyForm.type,
      date: new Date().toISOString().split('T')[0],
      description: historyForm.description,
      outcome: historyForm.outcome,
    };
    setHistory(prev => [newEntry, ...prev]);
    setHistoryForm({ type: 'note', description: '', outcome: '' });
    setHistoryDialogOpen(false);
  }

  function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    const newContact: Contact = {
      id: Date.now().toString(),
      name: contactForm.name,
      email: contactForm.email,
      phone: contactForm.phone,
      status: contactForm.status,
      title: contactForm.title,
    };
    setContacts(prev => [...prev, newContact]);
    setContactForm({ name: '', email: '', phone: '', status: 'secondary', title: '' });
    setContactDialogOpen(false);
  }

  function handleDeleteContact(contactId: string) {
    setContacts(prev => prev.filter(c => c.id !== contactId));
  }

  function handleDeleteHistory(historyId: string) {
    setHistory(prev => prev.filter(h => h.id !== historyId));
  }

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!client) return <div className="p-8">Client not found.</div>;

  // Responsive: stack columns on mobile
  return (
    <div className="min-h-screen bg-[#f6f8ff] p-4 md:p-8 rounded-2xl flex flex-col md:flex-row gap-6">
      {/* Left Column: Client Summary */}
      <aside className="w-full md:w-80 flex-shrink-0 flex flex-col gap-6">
        <Card className="p-0">
          <CardHeader className="flex flex-col items-center gap-2 pt-8 pb-4">
            <Avatar className="w-20 h-20 mb-2">
              <AvatarFallback className="text-3xl bg-purple-100 text-purple-700">{client.name?.[0]}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl text-center">{client.name}</CardTitle>
            <Badge variant={client.status === 'active' ? 'default' : client.status === 'pending' ? 'medium' : 'high'} className="capitalize mt-1">{client.status}</Badge>
            <div className="text-gray-500 text-sm mt-1">{client.company}</div>
            {client.region && <div className="text-xs text-gray-400">{client.region}</div>}
          </CardHeader>
          <CardContent className="flex flex-col gap-2 items-center pb-4">
            <div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4" />{client.contact_email}</div>
            {client.address && <div className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4" />{client.address}</div>}
          </CardContent>
          <div className="flex justify-center gap-2 pb-4">
            <Button size="icon" variant="outline" asChild><a href={`mailto:${client.contact_email}`} title="Email"><Mail className="w-5 h-5" /></a></Button>
            <Button size="icon" variant="outline" asChild><a href={`tel:${contacts[0]?.phone || ''}`} title="Call"><Phone className="w-5 h-5" /></a></Button>
            <Button size="icon" variant="outline" title="Edit"><Edit2 className="w-5 h-5" /></Button>
          </div>
        </Card>
        {/* Quick Actions */}
        <Card className="p-0">
          <CardHeader className="pb-2"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start gap-2" onClick={() => setScheduleCallDialogOpen(true)}><Phone className="w-4 h-4" />Schedule Call</Button>
            <Button variant="outline" className="justify-start gap-2" onClick={() => setSendProposalDialogOpen(true)}><FileText className="w-4 h-4" />Send Proposal</Button>
            <Button variant="outline" className="justify-start gap-2" onClick={() => setRequestDocumentsDialogOpen(true)}><FileText className="w-4 h-4" />Request Documents</Button>
          </CardContent>
        </Card>
      </aside>

      {/* Right Column: Tabbed Content */}
      <main className="flex-1 flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-2 border-b border-gray-200">
          <button className={`px-4 py-2 font-semibold rounded-t-md transition-colors ${activeTab === 'details' ? 'bg-white text-purple-700 border-x border-t border-gray-200 -mb-px' : 'text-gray-500 hover:text-purple-700'}`} onClick={() => setActiveTab('details')}>Details</button>
          <button className={`px-4 py-2 font-semibold rounded-t-md transition-colors ${activeTab === 'history' ? 'bg-white text-purple-700 border-x border-t border-gray-200 -mb-px' : 'text-gray-500 hover:text-purple-700'}`} onClick={() => setActiveTab('history')}>History</button>
          <button className={`px-4 py-2 font-semibold rounded-t-md transition-colors ${activeTab === 'contacts' ? 'bg-white text-purple-700 border-x border-t border-gray-200 -mb-px' : 'text-gray-500 hover:text-purple-700'}`} onClick={() => setActiveTab('contacts')}>Contacts</button>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <section className="bg-white rounded-xl shadow p-6 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-purple-500" /><span className="font-semibold">Email:</span> {client.contact_email}</div>
              <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-500" /><span className="font-semibold">Company:</span> {client.company}</div>
              {client.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-500" /><span className="font-semibold">Address:</span> {client.address}</div>}
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500" /><span className="font-semibold">Status:</span> <Badge variant={client.status === 'active' ? 'default' : client.status === 'pending' ? 'medium' : 'high'} className="capitalize">{client.status}</Badge></div>
              {client.region && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-500" /><span className="font-semibold">Region:</span> {client.region}</div>}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Link href={`/dashboard/clients/${id}/prospection`}><Button variant="secondary" className="gap-2"><UsersIcon className="w-4 h-4" />Prospection</Button></Link>
              <Link href={`/dashboard/clients/${id}/factures`}><Button variant="secondary" className="gap-2"><FileText className="w-4 h-4" />Factures</Button></Link>
              <Link href={`/dashboard/clients/${id}/email`}><Button variant="secondary" className="gap-2"><Mail className="w-4 h-4" />Email</Button></Link>
              <Link href={`/dashboard/clients/${id}/agenda`}><Button variant="secondary" className="gap-2"><Calendar className="w-4 h-4" />Agenda</Button></Link>
            </div>
          </section>
        )}

        {activeTab === 'history' && (
          <section className="bg-white rounded-xl shadow p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold flex items-center gap-2"><MessageCircle className="w-5 h-5 text-purple-500" />Communication History</h2>
              <Button onClick={() => setHistoryDialogOpen(true)} variant="secondary" className="gap-2"><Plus className="w-4 h-4" />Add Entry</Button>
            </div>
            <div className="space-y-4">
              {history.map((entry) => (
                <Card key={entry.id} className="border-l-4 shadow-sm border-purple-200">
                  <CardContent className="pt-6 flex gap-4 items-start">
                    <div className="flex flex-col items-center gap-2 min-w-[40px]">
                      {entry.type === 'call' && <Phone className="w-5 h-5 text-blue-500" />}
                      {entry.type === 'email' && <Mail className="w-5 h-5 text-green-500" />}
                      {entry.type === 'meeting' && <Calendar className="w-5 h-5 text-orange-500" />}
                      {entry.type === 'note' && <FileText className="w-5 h-5 text-gray-400" />}
                      <span className="text-xs text-gray-400">{entry.date}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="default">{HISTORY_TYPE_LABELS[entry.type as keyof typeof HISTORY_TYPE_LABELS]}</Badge>
                        <span className="text-sm text-gray-500">{entry.date}</span>
                      </div>
                      <p className="font-medium mb-1">{entry.description}</p>
                      {entry.outcome && <p className="text-sm text-gray-600">{entry.outcome}</p>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteHistory(entry.id)}>Delete</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'contacts' && (
          <section className="bg-white rounded-xl shadow p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold flex items-center gap-2"><UsersIcon className="w-5 h-5 text-purple-500" />Linked Contacts</h2>
              <Button onClick={() => setContactDialogOpen(true)} variant="secondary" className="gap-2"><Plus className="w-4 h-4" />Add Contact</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {contacts.map((contact) => (
                <Card key={contact.id} className="flex flex-col">
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gray-200 text-gray-700">{contact.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-0">{contact.name}</CardTitle>
                      {contact.title && <div className="text-xs text-gray-500">{contact.title}</div>}
                    </div>
                    <Badge className={CONTACT_STATUS_COLORS[contact.status]}>{CONTACT_STATUS_LABELS[contact.status]}</Badge>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 pt-0">
                    <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-purple-400" /><a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a></div>
                    <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-purple-400" /><a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">{contact.phone}</a></div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" asChild><a href={`mailto:${contact.email}`}>Email</a></Button>
                      <Button size="sm" variant="outline" asChild><a href={`tel:${contact.phone}`}>Call</a></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteContact(contact.id)}>Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Dialogs (unchanged, but styled by shadcn/ui) */}
        {/* History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add History Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddHistory} className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Type</label>
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={historyForm.type}
                  onChange={(e) => setHistoryForm({ ...historyForm, type: e.target.value as HistoryEntry['type'] })}
                  required
                >
                  <option value="note">Note</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Description</label>
                <Input
                  value={historyForm.description}
                  onChange={(e) => setHistoryForm({ ...historyForm, description: e.target.value })}
                  required
                  placeholder="Describe the interaction..."
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Outcome (Optional)</label>
                <Input
                  value={historyForm.outcome}
                  onChange={(e) => setHistoryForm({ ...historyForm, outcome: e.target.value })}
                  placeholder="What was the result?"
                />
              </div>
              <DialogFooter>
                <Button type="submit">Add Entry</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Contact Dialog */}
        <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Name</label>
                <Input
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                  placeholder="Contact name"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Title (Optional)</label>
                <Input
                  value={contactForm.title}
                  onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                  placeholder="Job title"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Email</label>
                <Input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  required
                  placeholder="Email address"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Phone</label>
                <Input
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  required
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Status</label>
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={contactForm.status}
                  onChange={(e) => setContactForm({ ...contactForm, status: e.target.value as Contact['status'] })}
                  required
                >
                  <option value="primary">Primary Contact</option>
                  <option value="secondary">Secondary Contact</option>
                  <option value="decision_maker">Decision Maker</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="submit">Add Contact</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Action Modals */}
        <Dialog open={scheduleCallDialogOpen} onOpenChange={setScheduleCallDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Call</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Schedule a call with {client.name}</p>
              <div className="flex gap-2">
                <Button onClick={() => setScheduleCallDialogOpen(false)}>Schedule</Button>
                <Button variant="outline" onClick={() => setScheduleCallDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={sendProposalDialogOpen} onOpenChange={setSendProposalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Proposal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Send a proposal to {client.name}</p>
              <div className="flex gap-2">
                <Button onClick={() => setSendProposalDialogOpen(false)}>Send</Button>
                <Button variant="outline" onClick={() => setSendProposalDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={requestDocumentsDialogOpen} onOpenChange={setRequestDocumentsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Documents</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Request documents from {client.name}</p>
              <div className="flex gap-2">
                <Button onClick={() => setRequestDocumentsDialogOpen(false)}>Request</Button>
                <Button variant="outline" onClick={() => setRequestDocumentsDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
} 
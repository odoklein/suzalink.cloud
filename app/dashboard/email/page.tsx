"use client";
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { EmailSidebar } from '@/components/email/EmailSidebar';
import { EmailList } from '@/components/email/EmailList';
import { EmailDetails } from '@/components/email/EmailDetails';
import { EmailCompose } from '@/components/email/EmailCompose';
import { useAuth } from '@/lib/auth-context';

interface Attachment {
    id: string;
    filename: string;
    contentType: string;
    size: number;
}

interface Email {
    id: number;
    from: string;
    subject: string;
    date: string;
    text: string;
    html?: string;
    labels: string[];
    attachments: Attachment[];
    read?: boolean;
    starred?: boolean;
}

const EmailPage = () => {
    const { userProfile } = useAuth();
    const [emails, setEmails] = useState<Email[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [selectedLabel, setSelectedLabel] = useState<string>('Boîte de réception');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isComposing, setIsComposing] = useState(false);
    const [loadingEmails, setLoadingEmails] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [unopenedCount, setUnopenedCount] = useState(0);
    const [deletedEmail, setDeletedEmail] = useState<Email | null>(null);
    const [showUndo, setShowUndo] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // New email composition state
    const [newEmail, setNewEmail] = useState({
        to: '',
        subject: '',
        text: '',
        html: ''
    });

    // localStorage helper functions
    const getStorageKey = (userId: string, label: string) => `emails_${userId}_${label}`;

    const saveEmailsToStorage = (emailsData: Email[], userId: string, label: string) => {
        try {
            const storageData = {
                emails: emailsData,
                timestamp: new Date().toISOString(),
                label: label
            };
            localStorage.setItem(getStorageKey(userId, label), JSON.stringify(storageData));
        } catch (error) {
            console.error('Error saving emails to localStorage:', error);
        }
    };

    const loadEmailsFromStorage = (userId: string, label: string) => {
        try {
            const stored = localStorage.getItem(getStorageKey(userId, label));
            if (stored) {
                const data = JSON.parse(stored);
                const timestamp = new Date(data.timestamp);
                const now = new Date();
                const diffMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);

                // Return cached data if less than 30 minutes old
                if (diffMinutes < 30) {
                    return data.emails;
                }
            }
        } catch (error) {
            console.error('Error loading emails from localStorage:', error);
        }
        return null;
    };

    // Fetch emails function (can be called manually or automatically)
    const fetchEmails = async (useCache: boolean = true, forceRefresh: boolean = false) => {
        if (!userProfile?.id) return;

        // Try to load from cache first if useCache is true
        if (useCache && !forceRefresh) {
            const cachedEmails = loadEmailsFromStorage(userProfile.id, selectedLabel);
            if (cachedEmails) {
                setEmails(cachedEmails);
                setLoadingEmails(false);
                return;
            }
        }

        setLoadingEmails(true);
        setEmailError(null);
        try {
            // Fetch directly from IMAP
            // Map French folder names to IMAP folder names
            const folderMap: Record<string, string> = {
                'Boîte de réception': 'INBOX',
                'Envoyés': 'Sent',
                'Brouillons': 'Drafts',
                'Corbeille': 'Trash'
            };

            const imapFolder = folderMap[selectedLabel] || 'INBOX';

            const response = await fetch('/api/email/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userProfile.id,
                    mailbox: imapFolder,
                    limit: 10
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.error || `Erreur HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('IMAP fetch response:', data);

            const emailsData = (data.emails || []).map((e: any, i: number) => {
                console.log('Processing email:', { from: e.from, subject: e.subject, rawEmail: e });
                
                // Ensure we have valid strings for from and subject
                let fromValue = 'Expéditeur inconnu';
                let subjectValue = '(Sans objet)';
                
                if (e.from && typeof e.from === 'string' && e.from.trim() !== '') {
                    fromValue = e.from.replace(/^"|"$/g, '').trim();
                }
                
                if (e.subject && typeof e.subject === 'string' && e.subject.trim() !== '') {
                    subjectValue = e.subject.trim();
                }
                
                return {
                    id: i + 1,
                    from: fromValue,
                    subject: subjectValue,
                    date: e.date || new Date().toISOString(),
                    text: e.text || e.subject || '(Aucun contenu textuel)',
                    html: e.html || `<p>${e.text || e.subject || '(Aucun contenu)'}</p>`,
                    labels: [selectedLabel === 'Boîte de réception' ? 'Inbox' : selectedLabel],
                    attachments: e.attachments || [],
                    read: e.read || false,
                    starred: e.starred || false,
                };
            });

            // Sort emails by date (newest first) based on local system time
            emailsData.sort((a: Email, b: Email) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA; // Newest first
            });

            setEmails(emailsData);

            // Save to localStorage
            saveEmailsToStorage(emailsData, userProfile.id, selectedLabel);
            setLastSync(new Date());
        } catch (error: any) {
            setEmailError(error.message);
            console.error('Email fetch error:', error);
            toast.error(`Erreur lors du chargement des emails: ${error.message}`);
        } finally {
            setLoadingEmails(false);
        }
    };

    // Fetch emails on component mount and when userProfile changes
    
    useEffect(() => {
        fetchEmails(true);
    }, [userProfile?.id, selectedLabel]);

    // Auto-sync every 5 minutes
    useEffect(() => {
        if (!userProfile?.id) return;

        const interval = setInterval(() => {
            console.log('Auto-syncing emails...');
            fetchEmails(false, true); // Don't use cache, force refresh for auto-sync
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(interval);
    }, [userProfile?.id, selectedLabel]);

    // Manual sync function
    const handleManualSync = () => {
        fetchEmails(false, true); // Force refresh from IMAP
        toast.success('Synchronisation en cours...');
    };

    // Filter emails based on search and selected label
    const filteredEmails = emails.filter((email: Email) => {
        const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.text.toLowerCase().includes(searchTerm.toLowerCase());

        const labelMap: Record<string, string> = {
            'Boîte de réception': 'Inbox',
            'Envoyés': 'Sent',
            'Brouillons': 'Draft',
            'Corbeille': 'Trash',
        };

        const effectiveLabel = labelMap[selectedLabel] || selectedLabel;
        const matchesLabel = effectiveLabel === 'All' || email.labels.includes(effectiveLabel);

        return matchesSearch && matchesLabel;
    });

    // Handle email selection
    const handleEmailSelect = (email: Email) => {
        setSelectedEmail(email);
        // Mark as read
        if (!email.read) {
            const updatedEmails = emails.map(e =>
                e.id === email.id ? { ...e, read: true } : e
            );
            setEmails(updatedEmails);
            
            // Update cache with read status
            if (userProfile?.id) {
                saveEmailsToStorage(updatedEmails, userProfile.id, selectedLabel);
            }
        }
    };

    // Handle compose
    const handleCompose = () => {
        setNewEmail({ to: '', subject: '', text: '', html: '' });
        setIsComposing(true);
    };

    // Handle reply
    const handleReply = () => {
        if (!selectedEmail) return;
        setNewEmail({
            to: selectedEmail.from,
            subject: `Re: ${selectedEmail.subject}`,
            text: `\n\n----- Message original -----\nDe: ${selectedEmail.from}\nDate: ${selectedEmail.date}\n\n${selectedEmail.html || selectedEmail.text}`,
            html: '',
        });
        setIsComposing(true);
    };

    // Handle forward
    const handleForward = () => {
        if (!selectedEmail) return;
        setNewEmail({
            to: '',
            subject: `Tr: ${selectedEmail.subject}`,
            text: `\n\n----- Message transféré -----\nDe: ${selectedEmail.from}\nDate: ${selectedEmail.date}\n\n${selectedEmail.html || selectedEmail.text}`,
            html: '',
        });
        setIsComposing(true);
    };

    // Handle delete
    const handleDelete = () => {
        if (!selectedEmail) return;
        setDeletedEmail(selectedEmail);
        setEmails(emails.filter(e => e.id !== selectedEmail.id));
        setSelectedEmail(null);
        setShowUndo(true);
        setTimeout(() => setShowUndo(false), 5000);
        toast.success('Email supprimé');
    };

    // Handle undo delete
    const handleUndoDelete = () => {
        if (deletedEmail) {
            setEmails([...emails, deletedEmail]);
            setDeletedEmail(null);
            setShowUndo(false);
            toast.success('Email restauré');
        }
    };

    // Handle send
    const handleSend = async (emailData: any) => {
        if (!userProfile?.id) return;

        setSending(true);
        try {
            const response = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userProfile.id,
                    to: emailData.to,
                    subject: emailData.subject,
                    text: emailData.text,
                    html: emailData.html,
                    attachments: emailData.attachments || []
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de l\'envoi');
            }

            setIsComposing(false);
            setNewEmail({ to: '', subject: '', html: '', text: '' });
            toast.success('Email envoyé avec succès');

            // Optionally refresh emails
            // You might want to refetch emails or add the sent email to the list
        } catch (error: any) {
            console.error('Send error:', error);
            toast.error(`Erreur lors de l'envoi: ${error.message}`);
        } finally {
            setSending(false);
        }
    };

    // Handle star toggle
    const handleStar = () => {
        if (!selectedEmail) return;
        const updatedEmails = emails.map(e =>
            e.id === selectedEmail.id ? { ...e, starred: !e.starred } : e
        );
        setEmails(updatedEmails);
        setSelectedEmail(prev => prev ? { ...prev, starred: !prev.starred } : null);
        
        // Update cache with star status
        if (userProfile?.id) {
            saveEmailsToStorage(updatedEmails, userProfile.id, selectedLabel);
        }
    };

    // Handle close email details
    const handleCloseEmail = () => {
        setSelectedEmail(null);
    };

    return (
        <div className="h-screen flex bg-gray-50 overflow-hidden">
            {/* Left Sidebar */}
            <EmailSidebar
                selectedLabel={selectedLabel}
                onLabelSelect={setSelectedLabel}
                onCompose={handleCompose}
                unopenedCount={unopenedCount}
            />

            {/* Email List */}
            <EmailList
                emails={filteredEmails}
                selectedEmail={selectedEmail}
                onEmailSelect={handleEmailSelect}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                loading={loadingEmails}
                error={emailError}
                onSync={handleManualSync}
                lastSync={lastSync}
            />

            {/* Email Details */}
            <EmailDetails
                email={selectedEmail}
                onReply={handleReply}
                onForward={handleForward}
                onDelete={handleDelete}
                onStar={handleStar}
                onClose={handleCloseEmail}
                userId={userProfile?.id}
            />

            {/* Compose Modal */}
            <EmailCompose
                isOpen={isComposing}
                onClose={() => setIsComposing(false)}
                onSend={handleSend}
                sending={sending}
                initialData={newEmail}
            />

            {/* Undo Delete Notification */}
            {showUndo && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg flex items-center gap-4 z-50 shadow-lg">
                    <span className="text-sm">Email supprimé</span>
                    <button
                        onClick={handleUndoDelete}
                        className="text-blue-300 hover:text-blue-100 font-medium text-sm transition-colors"
                    >
                        Annuler
                    </button>
                </div>
            )}
        </div>
    );
};

export default EmailPage;

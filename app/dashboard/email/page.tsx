"use client";
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { EmailSidebar } from '@/components/email/EmailSidebar';
import { EmailList } from '@/components/email/EmailList';
import { EmailDetails } from '@/components/email/EmailDetails';
import { EmailCompose } from '@/components/email/EmailCompose';
import { useNextAuth } from '@/lib/nextauth-context';

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
    const { userProfile } = useNextAuth();
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
    const [isSyncing, setIsSyncing] = useState(false);

    // Request tracking to prevent race conditions
    const currentRequestId = useRef<number>(0);
    const abortControllerRef = useRef<AbortController | null>(null);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Clear cache for debugging
    const clearCacheForFolder = (userId: string, label: string) => {
        try {
            localStorage.removeItem(getStorageKey(userId, label));
            console.log(`🗑️ Cache cleared for folder: ${label}`);
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    };

    // Fetch emails from database
    const fetchEmails = async (useCache: boolean = true, forceRefresh: boolean = false) => {
        if (!userProfile?.id) {
            console.log('❌ No userProfile.id available');
            return;
        }

        console.log('🔄 Fetching emails for user:', userProfile.id, 'folder:', selectedLabel);

        // Cancel any ongoing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();
        const requestId = ++currentRequestId.current;

        // Try to load from cache first if useCache is true and not forcing refresh
        if (useCache && !forceRefresh) {
            const cachedEmails = loadEmailsFromStorage(userProfile.id, selectedLabel);
            if (cachedEmails && cachedEmails.length > 0) {
                console.log('📦 Using cached emails:', cachedEmails.length);
                // Only update if this is still the latest request
                if (requestId === currentRequestId.current) {
                    setEmails(cachedEmails);
                    setLoadingEmails(false);
                }
                return;
            } else {
                console.log('📦 No cached emails found, fetching from API');
            }
        }

        // Show loading state
        setLoadingEmails(true);
        setEmailError(null);
        
        try {
            // Map French folder names to database folder names
            const folderMap: Record<string, string> = {
                'Boîte de réception': 'INBOX',
                'Envoyés': 'Sent',
                'Brouillons': 'Drafts',
                'Corbeille': 'Trash'
            };

            const dbFolder = folderMap[selectedLabel] || 'INBOX';
            console.log('🗂️ Using database folder:', dbFolder);
            
            // Fetch emails from database
            const apiUrl = `/api/emails?userId=${userProfile.id}&folder=${dbFolder}&limit=50&search=${encodeURIComponent(searchTerm)}`;
            console.log('🌐 Fetching from API:', apiUrl);
            
            const response = await fetch(apiUrl, {
                signal: abortControllerRef.current.signal
            });

            // Check if this request was cancelled
            if (requestId !== currentRequestId.current) {
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.error || `Erreur HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('📨 Database fetch response:', data);
            console.log('📧 Number of emails returned:', data.emails?.length || 0);

            // Check again if this request was cancelled
            if (requestId !== currentRequestId.current) {
                return;
            }

            const emailsData = data.emails || [];
            console.log('✅ Processed emails data:', emailsData);

            // Only update UI if this is still the latest request
            if (requestId === currentRequestId.current) {
                setEmails(emailsData);
                console.log('🎯 Updated emails state with:', emailsData.length, 'emails');
                // Save to localStorage
                saveEmailsToStorage(emailsData, userProfile.id, selectedLabel);
                setLastSync(new Date());
                setIsSyncing(false);
            }
        } catch (error: any) {
            // Only handle errors for the latest request
            if (requestId === currentRequestId.current) {
                if (error.name === 'AbortError') {
                    console.log('Request was cancelled');
                    return;
                }
                setEmailError(error.message);
                console.error('❌ Email fetch error:', error);
                toast.error(`Erreur lors du chargement des emails: ${error.message}`);
                setIsSyncing(false);
            }
        } finally {
            // Only update loading state if this is still the latest request
            if (requestId === currentRequestId.current) {
                setLoadingEmails(false);
                setIsSyncing(false);
            }
        }
    };

    // Debounced fetch function to prevent rapid API calls
    const debouncedFetchEmails = (useCache: boolean = true, forceRefresh: boolean = false) => {
        // Clear any existing timeout
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Set a new timeout
        debounceTimeoutRef.current = setTimeout(() => {
            fetchEmails(useCache, forceRefresh);
        }, 300); // 300ms debounce
    };

    // Fetch emails on component mount and when userProfile changes
    useEffect(() => {
        // Force refresh on mount to ensure we get fresh data
        debouncedFetchEmails(false, true);
        
        // Cleanup function to cancel any ongoing request when component unmounts
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [userProfile?.id, selectedLabel]);

    // Auto-sync every 1 minute
    useEffect(() => {
        if (!userProfile?.id) return;

        const interval = setInterval(async () => {
            console.log('🔄 Auto-syncing emails from IMAP...');
            
            try {
                // Map French folder names to IMAP folder names
                const folderMap: Record<string, string> = {
                    'Boîte de réception': 'INBOX',
                    'Envoyés': 'Sent',
                    'Brouillons': 'Drafts',
                    'Corbeille': 'Trash'
                };

                const imapFolder = folderMap[selectedLabel] || 'INBOX';
                
                // Sync from IMAP to database
                const syncResponse = await fetch('/api/emails/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userProfile.id,
                        folderName: imapFolder
                    })
                });

                if (syncResponse.ok) {
                    const syncResult = await syncResponse.json();
                    console.log('✅ Auto-sync result:', syncResult);
                    
                    // Refresh emails from database after sync
                    await fetchEmails(false, true);
                } else {
                    console.error('❌ Auto-sync failed:', syncResponse.status);
                }
            } catch (error: any) {
                console.error('❌ Auto-sync error:', error);
            }
        }, 1 * 60 * 1000); // 1 minute

        return () => clearInterval(interval);
    }, [userProfile?.id, selectedLabel]);

    // Manual sync function - sync from IMAP to database
    const handleManualSync = async () => {
        console.log('🔄 Manual sync triggered for folder:', selectedLabel);
        
        if (!userProfile?.id) return;
        
        // Set syncing state immediately for manual sync
        setIsSyncing(true);
        
        try {
            // Map French folder names to IMAP folder names
            const folderMap: Record<string, string> = {
                'Boîte de réception': 'INBOX',
                'Envoyés': 'Sent',
                'Brouillons': 'Drafts',
                'Corbeille': 'Trash'
            };

            const imapFolder = folderMap[selectedLabel] || 'INBOX';
            
            // Sync from IMAP to database
            const syncResponse = await fetch('/api/emails/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userProfile.id,
                    folderName: imapFolder
                })
            });

            if (!syncResponse.ok) {
                throw new Error(`Sync failed: ${syncResponse.status}`);
            }

            const syncResult = await syncResponse.json();
            console.log('Sync result:', syncResult);
            
            // Refresh emails from database after sync
            await fetchEmails(false, true);
            
            toast.success(syncResult.message || 'Synchronisation terminée');
        } catch (error: any) {
            console.error('Sync error:', error);
            toast.error(`Erreur de synchronisation: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    // Filter emails based on search and selected label
    const filteredEmails = emails.filter((email: Email) => {
        // Temporarily disable filtering to see all emails
        console.log('📧 Processing email:', {
            emailId: email.id,
            subject: email.subject,
            from: email.from,
            labels: email.labels
        });
        
        // For now, just filter by search term and show all emails
        const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.text.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch; // Show all emails that match search
    });

    console.log('🔍 Filtered emails:', {
        totalEmails: emails.length,
        filteredCount: filteredEmails.length,
        selectedLabel,
        searchTerm,
        emails: emails.slice(0, 3) // Show first 3 emails for debugging
    });

    // Handle email selection
    const handleEmailSelect = async (email: Email) => {
        setSelectedEmail(email);
        
        // Mark email as read if it's not already read
        if (!email.read && userProfile?.id) {
            try {
                const response = await fetch(`/api/emails/${email.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userProfile.id,
                        isRead: true
                    })
                });

                if (response.ok) {
                    // Update local state
                    const updatedEmails = emails.map(e =>
                        e.id === email.id ? { ...e, read: true } : e
                    );
                    setEmails(updatedEmails);
                }
            } catch (error) {
                console.error('Error marking email as read:', error);
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
    const handleDelete = async () => {
        if (!selectedEmail || !userProfile?.id) return;

        try {
            const response = await fetch(`/api/emails/${selectedEmail.id}?userId=${userProfile.id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete email');
            }

            setDeletedEmail(selectedEmail);
            setEmails(emails.filter(e => e.id !== selectedEmail.id));
            setSelectedEmail(null);
            setShowUndo(true);
            setTimeout(() => setShowUndo(false), 5000);
            toast.success('Email supprimé');
        } catch (error) {
            console.error('Error deleting email:', error);
            toast.error('Erreur lors de la suppression de l\'email');
        }
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
    const handleStar = async () => {
        if (!selectedEmail || !userProfile?.id) return;

        try {
            const response = await fetch(`/api/emails/${selectedEmail.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userProfile.id,
                    isStarred: !selectedEmail.starred
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update email');
            }

            const updatedEmails = emails.map(e =>
                e.id === selectedEmail.id ? { ...e, starred: !e.starred } : e
            );
            setEmails(updatedEmails);
            setSelectedEmail(prev => prev ? { ...prev, starred: !prev.starred } : null);
        } catch (error) {
            console.error('Error updating email:', error);
            toast.error('Erreur lors de la mise à jour de l\'email');
        }
    };

    // Handle close email details
    const handleCloseEmail = () => {
        setSelectedEmail(null);
    };

    // Debug function to check database
    const handleDebug = async () => {
        if (!userProfile?.id) return;
        
        try {
            console.log('🔍 Debug: Checking database for user:', userProfile.id);
            const response = await fetch(`/api/emails?userId=${userProfile.id}&debug=true`);
            const data = await response.json();
            console.log('🔍 Debug response:', data);
            
            if (data.debug) {
                toast.success(`Found ${data.totalEmails} emails in database`);
            }
        } catch (error) {
            console.error('Debug error:', error);
            toast.error('Debug failed');
        }
    };

    return (
        <div className="h-screen flex bg-gray-50 overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col shadow-sm">
                <EmailSidebar
                    selectedLabel={selectedLabel}
                    onLabelSelect={setSelectedLabel}
                    onCompose={handleCompose}
                    unopenedCount={unopenedCount}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-gray-50">
                {/* Email List */}
                <div className="flex-1 flex">
                    <div className="w-1/2 bg-white border-r border-gray-200 shadow-sm">
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
                            currentFolder={selectedLabel}
                            isSyncing={isSyncing}
                        />
                        {/* Debug button */}
                        <div className="p-4 border-t border-gray-200">
                            <button
                                onClick={handleDebug}
                                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                            >
                                Debug Database
                            </button>
                        </div>
                    </div>

                    {/* Email Details */}
                    <div className="w-1/2 bg-white shadow-sm">
                        <EmailDetails
                            email={selectedEmail}
                            onReply={handleReply}
                            onForward={handleForward}
                            onDelete={handleDelete}
                            onStar={handleStar}
                            onClose={handleCloseEmail}
                            userId={userProfile?.id}
                        />
                    </div>
                </div>
            </div>

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

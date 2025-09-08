"use client";

import React, { useState, useEffect } from 'react';
import './email-content-styles.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Mail,
  Inbox,
  Send,
  FileText,
  Trash2,
  Star,
  Search,
  Plus,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  TestTube
} from 'lucide-react';
import { toast } from 'sonner';
import { EmailConfigModal } from './components/EmailConfigModal';
import { EmailComposer } from './components/EmailComposer';
import { EmailSetupGuide } from './components/EmailSetupGuide';
import { EmailErrorBoundary } from './components/ErrorBoundary';
import { EmailPreviewPane } from './components/EmailPreviewPane';
import { EmailBulkActions } from './components/EmailBulkActions';
import { SyncDiagnosticModal } from './components/SyncDiagnosticModal';
import { translations as t } from './translations';

// Types
interface EmailConfig {
  id: string;
  emailAddress: string;
  displayName: string;
  isActive: boolean;
  lastSyncAt: string | null;
  syncFrequencyMinutes: number;
  createdAt: string;
}

interface EmailFolder {
  id: string;
  folderName: string;
  folderPath: string;
  folderType: string;
  messageCount: number;
  unreadCount: number;
  emailConfigId: string;
}

interface EmailMessage {
  id: string;
  messageId: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  recipientEmails: string[];
  ccEmails: string[];
  bccEmails: string[];
  emailText: string;
  emailHtml: string;
  sentAt: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
}

function EmailsPageContent() {
  const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([]);
  const [folders, setFolders] = useState<EmailFolder[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [lastDiagnostic, setLastDiagnostic] = useState<any>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<{
    subject: string;
    to: string;
    content: string;
  } | null>(null);

  // Ensure arrays are always defined
  const safeEmailConfigs = emailConfigs || [];
  const safeFolders = folders || [];
  const safeMessages = messages || [];

  // Load email configurations
  const loadEmailConfigs = async () => {
    try {
      const response = await fetch('/api/emails/config');
      if (response.ok) {
        const configs = await response.json();
        setEmailConfigs(configs || []);
      } else {
      toast.error(t.failedToLoadEmailConfigurations);
      setEmailConfigs([]);
    }
  } catch (error) {
    console.error('Error loading email configs:', error);
    toast.error(t.errorLoadingEmailConfigurations);
    setEmailConfigs([]);
  }
  };

  // Load email folders
  const loadFolders = async () => {
    try {
      const response = await fetch('/api/emails/folders');
      if (response.ok) {
        const foldersData = await response.json();
        setFolders(foldersData || []);
      } else {
      toast.error(t.failedToLoadEmailFolders);
      setFolders([]);
    }
  } catch (error) {
    console.error('Error loading folders:', error);
    toast.error(t.errorLoadingEmailFolders);
    setFolders([]);
  }
  };

  // Load messages for selected folder
  const loadMessages = async (folderId: string) => {
    try {
      const response = await fetch(`/api/emails/messages?folder=${folderId}&limit=50`);
      if (response.ok) {
        const messagesData = await response.json();
        setMessages(messagesData || []);
      } else {
        toast.error(t.failedToLoadMessages);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error(t.errorLoadingMessages);
      setMessages([]);
    }
  };

  // Load full email content for selected message
  const loadFullMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/emails/messages/${messageId}`);
      if (response.ok) {
        const fullMessage = await response.json();
        return fullMessage;
      } else {
        toast.error('Échec du chargement du contenu de l\'email');
        return null;
      }
    } catch (error) {
      console.error('Error loading full message:', error);
      toast.error('Erreur lors du chargement du contenu de l\'email');
      return null;
    }
  };

  // Handle message selection with full content loading
  const handleMessageSelect = async (message: EmailMessage) => {
    const fullMessage = await loadFullMessage(message.id);
    if (fullMessage) {
      setSelectedMessage(fullMessage);
    } else {
      // Fallback to basic message if full content fails to load
      setSelectedMessage(message);
    }
  };

  // Sync emails for a specific config
  const syncEmails = async (configId: string) => {
    setSyncing(true);
    try {
      const response = await fetch(`/api/emails/sync/${configId}`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();

        // Store diagnostic information
        if (result.diagnostic) {
          setLastDiagnostic(result.diagnostic);
        }

        // Show success message with detailed info
        if (result.success) {
          toast.success(result.message);
        } else if (result.errors > 0) {
          toast.warning(result.message);
          // Show diagnostic modal for partial failures
          setTimeout(() => setShowDiagnosticModal(true), 3000);
        } else {
          toast.info(result.message);
        }

        // Show recommendations if available
        if (result.recommendations && result.recommendations.length > 0) {
          setTimeout(() => {
            result.recommendations.forEach((recommendation: string) => {
              toast.info(recommendation, { duration: 8000 });
            });
          }, 2000);
        }

        // Reload folders and messages
        await loadFolders();
        await loadMessages(selectedFolder);
      } else {
        const error = await response.json();
        toast.error(error.error || t.failedToSyncEmails);

        // Show additional help for common errors
        if (error.error?.includes('authentication') || error.error?.includes('login')) {
          setTimeout(() => {
            toast.info('Pour Gmail, vérifiez que vous utilisez un mot de passe d\'application.', { duration: 6000 });
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error syncing emails:', error);
      toast.error(t.errorSyncingEmails);
    } finally {
      setSyncing(false);
    }
  };

  // Test stored email configuration
  const testStoredConfig = async (configId: string) => {
    try {
      toast.info('Test de connexion en cours...', { duration: 2000 });

      const response = await fetch(`/api/emails/config/${configId}/test`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        if (result.details) {
          toast.info(result.details, { duration: 4000 });
        }
      } else {
        toast.error(`Test échoué: ${result.error}`);
        if (result.troubleshooting) {
          setTimeout(() => {
            toast.info(result.troubleshooting, { duration: 6000 });
          }, 2000);
        }
        if (result.details) {
          setTimeout(() => {
            toast.warning(result.details, { duration: 8000 });
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error testing config:', error);
      toast.error('Erreur lors du test de connexion');
    }
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadEmailConfigs(),
        loadFolders(),
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Load messages when folder changes
  useEffect(() => {
    if (selectedFolder && safeFolders.length > 0) {
      loadMessages(selectedFolder);
    }
  }, [selectedFolder, safeFolders]);

  // Get folder icon
  const getFolderIcon = (folderType: string) => {
    switch (folderType) {
      case 'inbox': return <Inbox className="w-4 h-4" />;
      case 'sent': return <Send className="w-4 h-4" />;
      case 'drafts': return <FileText className="w-4 h-4" />;
      case 'trash': return <Trash2 className="w-4 h-4" />;
      case 'spam': return <AlertCircle className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Filter messages based on search
  const filteredMessages = safeMessages.filter(message =>
    message.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.senderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.senderEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Bulk action handlers
  const handleSelectAll = () => {
    setSelectedEmails(filteredMessages.map(message => message.id));
  };
  
  const handleDeselectAll = () => {
    setSelectedEmails([]);
  };
  
  const handleToggleSelect = (id: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedEmails(prev => [...prev, id]);
    } else {
      setSelectedEmails(prev => prev.filter(emailId => emailId !== id));
    }
  };
  
  const handleMarkAsRead = async (ids: string[]) => {
    try {
      const response = await fetch('/api/emails/messages/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });
      
      if (response.ok) {
        // Update local state
        setMessages(prev => 
          prev.map(message => 
            ids.includes(message.id) 
              ? { ...message, isRead: true } 
              : message
          )
        );
        toast.success(`${ids.length} email(s) marqué(s) comme lu(s)`);
        setSelectedEmails([]);
      } else {
        toast.error('Échec de la mise à jour des emails');
      }
    } catch (error) {
      console.error('Error marking emails as read:', error);
      toast.error('Erreur lors de la mise à jour des emails');
    }
  };
  
  const handleMarkAsUnread = async (ids: string[]) => {
    try {
      const response = await fetch('/api/emails/messages/mark-unread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });
      
      if (response.ok) {
        // Update local state
        setMessages(prev => 
          prev.map(message => 
            ids.includes(message.id) 
              ? { ...message, isRead: false } 
              : message
          )
        );
        toast.success(`${ids.length} email(s) marqué(s) comme non lu(s)`);
        setSelectedEmails([]);
      } else {
        toast.error('Échec de la mise à jour des emails');
      }
    } catch (error) {
      console.error('Error marking emails as unread:', error);
      toast.error('Erreur lors de la mise à jour des emails');
    }
  };
  
  const handleDelete = async (ids: string[]) => {
    try {
      const response = await fetch('/api/emails/messages/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });
      
      if (response.ok) {
        // Update local state
        setMessages(prev => prev.filter(message => !ids.includes(message.id)));
        toast.success(`${ids.length} email(s) supprimé(s)`);
        setSelectedEmails([]);
        if (selectedMessage && ids.includes(selectedMessage.id)) {
          setSelectedMessage(null);
        }
      } else {
        toast.error('Échec de la suppression des emails');
      }
    } catch (error) {
      console.error('Error deleting emails:', error);
      toast.error('Erreur lors de la suppression des emails');
    }
  };
  
  const handleArchive = async (ids: string[]) => {
    try {
      const response = await fetch('/api/emails/messages/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });
      
      if (response.ok) {
        // Update local state
        setMessages(prev => prev.filter(message => !ids.includes(message.id)));
        toast.success(`${ids.length} email(s) archivé(s)`);
        setSelectedEmails([]);
        if (selectedMessage && ids.includes(selectedMessage.id)) {
          setSelectedMessage(null);
        }
      } else {
        toast.error('Échec de l\'archivage des emails');
      }
    } catch (error) {
      console.error('Error archiving emails:', error);
      toast.error('Erreur lors de l\'archivage des emails');
    }
  };
  
  const handleStar = async (ids: string[]) => {
    try {
      const response = await fetch('/api/emails/messages/star', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });
      
      if (response.ok) {
        // Update local state
        setMessages(prev => 
          prev.map(message => 
            ids.includes(message.id) 
              ? { ...message, isStarred: true } 
              : message
          )
        );
        toast.success(`${ids.length} email(s) marqué(s) comme important(s)`);
        setSelectedEmails([]);
      } else {
        toast.error('Échec de la mise à jour des emails');
      }
    } catch (error) {
      console.error('Error starring emails:', error);
      toast.error('Erreur lors de la mise à jour des emails');
    }
  };
  
  const handleUnstar = async (ids: string[]) => {
    try {
      const response = await fetch('/api/emails/messages/unstar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });
      
      if (response.ok) {
        // Update local state
        setMessages(prev => 
          prev.map(message => 
            ids.includes(message.id) 
              ? { ...message, isStarred: false } 
              : message
          )
        );
        toast.success(`${ids.length} email(s) non marqué(s) comme important(s)`);
        setSelectedEmails([]);
      } else {
        toast.error('Échec de la mise à jour des emails');
      }
    } catch (error) {
      console.error('Error unstarring emails:', error);
      toast.error('Erreur lors de la mise à jour des emails');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>{t.loadingEmails}</span>
        </div>
      </div>
    );
  }

  // Show setup guide if no email configurations exist
  if (safeEmailConfigs.length === 0) {
    return (
      <div className="h-full">
        <EmailSetupGuide onSetupClick={() => setShowConfigModal(true)} />
        
        <EmailConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onConfigAdded={() => {
            loadEmailConfigs();
            loadFolders();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">{t.email}</h1>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConfigModal(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => setShowComposer(true)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={t.searchEmails}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Email Configs */}
        {safeEmailConfigs.length > 0 && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">{t.accounts}</h3>
            <div className="space-y-2">
              {safeEmailConfigs.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium">{config.displayName}</div>
                      <div className="text-xs text-gray-500">{config.emailAddress}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => testStoredConfig(config.id)}
                      title="Tester la connexion"
                    >
                      <TestTube className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => syncEmails(config.id)}
                      disabled={syncing}
                      title="Synchroniser les emails"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                    </Button>
                    {lastDiagnostic && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowDiagnosticModal(true)}
                        title="Voir le rapport de diagnostic"
                      >
                        <Info className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Folders */}
        <div className="flex-1 p-4 overflow-hidden">
          <h3 className="text-sm font-medium text-gray-700 mb-2">{t.folders}</h3>
          <div className="space-y-1">
            {safeFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                  selectedFolder === folder.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  {getFolderIcon(folder.folderType)}
                  <span className="text-sm font-medium">{folder.folderName}</span>
                </div>
                <div className="flex items-center gap-1">
                  {folder.unreadCount > 0 && (
                    <Badge className="text-xs bg-gray-100 text-gray-800">
                      {folder.unreadCount}
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500">{folder.messageCount}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Message List */}
        <div className={`bg-white border-r border-gray-200 flex flex-col min-h-0 ${selectedMessage ? 'w-1/3' : 'w-full'}`}>
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">
              {safeFolders.find(f => f.id === selectedFolder)?.folderName || 'Messages'}
            </h2>
          </div>
          
          {/* Bulk Actions */}
          <EmailBulkActions 
            selectedEmails={selectedEmails}
            totalEmails={filteredMessages.length}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onMarkAsRead={handleMarkAsRead}
            onMarkAsUnread={handleMarkAsUnread}
            onDelete={handleDelete}
            onArchive={handleArchive}
            onStar={handleStar}
            onUnstar={handleUnstar}
            onRefresh={() => loadMessages(selectedFolder)}
            loading={loading || syncing}
          />
          
          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredMessages.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>{t.noMessagesFound}</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      selectedMessage?.id === message.id ? 'bg-blue-100' : 
                      !message.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="mr-3 mt-1">
                        <input
                          type="checkbox"
                          checked={selectedEmails.includes(message.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleSelect(message.id, e.target.checked);
                          }}
                          className="rounded border-gray-300"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleMessageSelect(message)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium ${!message.isRead ? 'font-semibold' : ''}`}>
                                {message.senderName || message.senderEmail}
                              </span>
                              {message.isStarred && (
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              )}
                              {message.hasAttachments && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <div className={`text-sm ${!message.isRead ? 'font-medium' : ''}`}>
                              {message.subject || t.noSubject}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {message.emailText?.substring(0, 100)}...
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-4">
                            <span className="text-xs text-gray-500">
                              {formatDate(message.sentAt)}
                            </span>
                            {!message.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Email Preview Pane */}
        {selectedMessage && (
          <div className="w-2/3 flex flex-col min-h-0">
            <EmailPreviewPane 
              message={selectedMessage}
              onReply={(message) => {
                setReplyTo({
                  subject: message.subject,
                  to: message.senderEmail,
                  content: message.emailText || message.emailHtml?.replace(/<[^>]*>/g, '') || ''
                });
                setShowComposer(true);
              }}
              onForward={() => {
                // Handle forward action
              }}
              onClose={() => setSelectedMessage(null)}
              onPrevious={async () => {
                const currentIndex = filteredMessages.findIndex(m => m.id === selectedMessage.id);
                if (currentIndex > 0) {
                  const prevMessage = filteredMessages[currentIndex - 1];
                  const fullMessage = await loadFullMessage(prevMessage.id);
                  setSelectedMessage(fullMessage || prevMessage);
                }
              }}
              onNext={async () => {
                const currentIndex = filteredMessages.findIndex(m => m.id === selectedMessage.id);
                if (currentIndex < filteredMessages.length - 1) {
                  const nextMessage = filteredMessages[currentIndex + 1];
                  const fullMessage = await loadFullMessage(nextMessage.id);
                  setSelectedMessage(fullMessage || nextMessage);
                }
              }}
              hasPrevious={filteredMessages.findIndex(m => m.id === selectedMessage.id) > 0}
              hasNext={filteredMessages.findIndex(m => m.id === selectedMessage.id) < filteredMessages.length - 1}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <EmailConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConfigAdded={() => {
          loadEmailConfigs();
          loadFolders();
        }}
      />

      <EmailComposer
        isOpen={showComposer}
        onClose={() => {
          setShowComposer(false);
          setReplyTo(null);
        }}
        replyTo={replyTo || undefined}
        onEmailSent={() => {
          loadFolders();
          loadMessages(selectedFolder);
        }}
      />

      <SyncDiagnosticModal
        isOpen={showDiagnosticModal}
        onClose={() => setShowDiagnosticModal(false)}
        diagnostic={lastDiagnostic}
      />
    </div>
  );
}

// Error boundary wrapper
export default function EmailsPage() {
  return (
    <EmailErrorBoundary>
      <EmailsPageContent />
    </EmailErrorBoundary>
  );
}

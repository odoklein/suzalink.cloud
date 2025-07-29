"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PaperAirplaneIcon, ArrowUturnRightIcon, TrashIcon, DocumentIcon, PlusIcon, XMarkIcon, PaperClipIcon, Cog6ToothIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import SimpleTextEditor from '@/components/SimpleTextEditor';
import DOMPurify from 'dompurify';

interface Email {
  id: number;
  from: string;
  subject: string;
  date: string;
  text: string;
  html?: string;
  labels: string[];
  attachments: string[];
  read?: boolean;
}

import { useAuth } from '@/lib/auth-context';

const EmailPage = () => {
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const { userProfile } = useAuth();
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  // Optionally: show toast on error
  useEffect(() => {
    if (emailError) {
      toast.error(`Erreur lors du chargement des emails: ${emailError}`);
    }
  }, [emailError]);

  useEffect(() => {
    if (!userProfile?.id) return;
    setLoadingEmails(true);
    setEmailError(null);
    fetch('/api/email/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userProfile.id, mailbox: 'INBOX', limit: 20 })
    })
      .then(async (res) => {
        if (!res.ok) {
          const errPayload = await res.json().catch(() => ({}));
          const errMsg = errPayload?.error || `Erreur lors du chargement des emails (HTTP ${res.status})`;
          throw new Error(errMsg);
        }
        return res.json();
      })
      .then(data => {
        setEmails((data.emails || []).map((e: any, i: number) => ({
          id: i + 1,
          from: e.from || 'Expéditeur inconnu',
          subject: e.subject || '(Sans objet)',
          date: e.date || '',
          text: e.text || '',
          html: e.html || '',
          labels: ['Inbox'],
          attachments: [],
          read: false,
        })));
      })
      .catch(err => {
        setEmailError(err.message);
        console.error('Email fetch error:', err);
      })
      .finally(() => setLoadingEmails(false));
  }, [userProfile?.id]);

  const [emails, setEmails] = useState<Email[]>([]);
  
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLabel, setSelectedLabel] = useState<string>('All');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [newEmail, setNewEmail] = useState({
    to: '',
    subject: '',
    text: '',
    html: ''
  });
  const [deletedEmail, setDeletedEmail] = useState<Email | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const [signatures, setSignatures] = useState([
    {
      id: 1, 
      name: "Professional",
      content: `
      <table cellpadding="0" cellspacing="0" style="background-color: #0d6efd; padding: 20px; border-radius: 8px; max-width: 400px; font-family: Arial, sans-serif;">
        <tr>
          <td style="text-align: center;">
            <div style="font-family: 'Pacifico', cursive; font-size: 24px; color: white;">
              Hichem Hammouche
            </div>
            <div style="font-size: 14px; color: white; margin-top: 4px;">
              CEO · Suzali Conseil
            </div>
          </td>
        </tr>
      </table>
      `
    },
    {
      id: 2,
      name: "Simple",
      content: "Cordialement,\nHichem Hammouche\nCEO, Suzali Conseil"
    }
  ]);
  const [showSignatureSettings, setShowSignatureSettings] = useState(false);
  const [newSignature, setNewSignature] = useState({ name: "", content: "" });

  const uniqueLabels = ['Tous', 'Boîte de réception', 'Envoyés', 'Brouillons', 'Corbeille'];

  const filteredEmails = emails.filter((email: Email) => {
    const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         email.from.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         email.text.toLowerCase().includes(searchTerm.toLowerCase());
    const labelMap: Record<string, string> = {
      'Tous': 'All',
      'Boîte de réception': 'Inbox',
      'Envoyés': 'Sent',
      'Brouillons': 'Draft',
      'Corbeille': 'Trash',
    };
    const effectiveLabel = labelMap[selectedLabel] || selectedLabel;
    const matchesLabel = effectiveLabel === 'All' || email.labels.includes(effectiveLabel);
    const matchesReadStatus = !showUnreadOnly || !email.read;
    return matchesSearch && matchesLabel && matchesReadStatus;
  });

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    // Mark as read
    if (!email.read) {
      setEmails(emails.map(e => 
        e.id === email.id ? {...e, read: true} : e
      ));
    }
  };

  const handleReply = () => {
    if (!selectedEmail) return;
    setIsComposing(true);
    setNewEmail({
      to: selectedEmail.from,
      subject: `Re: ${selectedEmail.subject}`,
      text: `\n\n----- Message original -----\nDe: ${selectedEmail.from}\nDate: ${selectedEmail.date}\n\n${selectedEmail.html || selectedEmail.text}`,
      html: '',
    });
  };

  const handleForward = () => {
    if (!selectedEmail) return;
    setIsComposing(true);
    setNewEmail({
      to: '',
      subject: `Tr: ${selectedEmail.subject}`,
      text: `\n\n----- Message transféré -----\nDe: ${selectedEmail.from}\nDate: ${selectedEmail.date}\n\n${selectedEmail.html || selectedEmail.text}`,
      html: '',
    });
  };

  const handleDelete = () => {
    if (!selectedEmail) return;
    setDeletedEmail(selectedEmail);
    setEmails(emails.filter(e => e.id !== selectedEmail.id));
    setSelectedEmail(null);
    setShowUndo(true);
    setTimeout(() => setShowUndo(false), 5000);
  };

  const handleUndoDelete = () => {
    if (deletedEmail) {
      setEmails([...emails, deletedEmail]);
      setDeletedEmail(null);
      setShowUndo(false);
    }
  };

  const handleSend = async () => {
    if (!newEmail.to || !newEmail.subject || !newEmail.html && !newEmail.text || !userProfile?.id) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          to: newEmail.to,
          subject: newEmail.subject,
          text: newEmail.text,
          html: newEmail.html,
          // Optionally add attachments, etc.
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur lors de l\'envoi');
      // Optionally, refetch emails after send
      setIsComposing(false);
      setNewEmail({ to: '', subject: '', html: '', text: '' });
      // Optionally trigger fetch
    } catch (err: any) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const [panelWidth, setPanelWidth] = useState('50%');
  const [isResizing, setIsResizing] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const startResize = (e: React.MouseEvent) => {
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = panelRef.current ? panelRef.current.offsetWidth : 0;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing || !panelRef.current) return;
    const newWidth = startWidthRef.current + (startXRef.current - e.clientX);
    const minWidth = 350; // Minimum width in pixels
    const maxWidth = window.innerWidth * 0.8; // Maximum width as 80% of viewport
    
    if (newWidth > minWidth && newWidth < maxWidth) {
      setPanelWidth(`${newWidth}px`);
    }
  };

  const stopResize = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
    };
  }, []);

  // Smooth panel mount/unmount
  useEffect(() => {
    if (isComposing && !isPanelVisible) {
      setIsPanelVisible(true);
    } else if (!isComposing && isPanelVisible) {
      // Wait for exit animation
      const timeout = setTimeout(() => setIsPanelVisible(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [isComposing, isPanelVisible]);

  // Sidebar mount/unmount for smooth animation (mobile only)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarVisible(true);
        setSidebarOpen(false);
      } else {
        setIsSidebarVisible(sidebarOpen);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  return (
    <div className="flex h-full bg-gray-50 relative overflow-x-hidden">
      {/* Sidebar Toggle Button (visible on mobile) */}
      {/* Sidebar with smooth animation */}
      {(sidebarOpen || isSidebarVisible) && (
        <div
          className={`fixed md:static inset-y-0 left-0 w-48 p-4 border-r border-gray-200 bg-white z-40 transition-transform duration-500 ease-in-out ${sidebarOpen && isSidebarVisible ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
          style={{ minWidth: '12rem', maxWidth: '12rem' }}
        >
          {/* Close button for mobile */}
          <button
            className="absolute top-4 right-4 md:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fermer le menu"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>

          {/* Compose Button */}
          <button 
            onClick={() => setIsComposing(true)}
            className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nouveau message</span>
          </button>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Dossiers</h2>
            </div>
            <div className="space-y-2">
              {uniqueLabels.map((label) => (
                <button
                  key={label}
                  onClick={() => setSelectedLabel(label)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${selectedLabel === label ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Email List */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher dans les emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingEmails ? (
            <div className="flex items-center justify-center h-full">
              <svg className="animate-spin h-8 w-8 text-blue-500 mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span className="text-gray-500">Chargement des emails…</span>
            </div>
          ) : emailError ? (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4">
                <strong className="block mb-1">Erreur lors du chargement des emails</strong>
                <span className="block break-all">{emailError}</span>
              </div>
              <button
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                onClick={() => window.location.reload()}
              >
                Réessayer
              </button>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Aucun email trouvé</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredEmails.map((email) => (
                <div className="w-full overflow-hidden" key={email.id}>
                  <div
                    onClick={() => handleEmailClick(email)}
                    className={`p-4 border-l-4 w-full max-w-[60vw] truncate ${selectedEmail?.id === email.id ? 'border-blue-500' : 'border-transparent'} 
                      hover:border-blue-300 transition-all duration-200 cursor-pointer
                      bg-gradient-to-br from-white to-gray-50 hover:to-white ml-0`}
                  >
                  <div className="flex justify-between items-start">
                    <h3 className="text-base font-medium text-gray-900 group-hover:text-black transition-colors">
                      {email.subject}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {new Date(email.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 truncate max-w-full">
                    {email.text.length > 100 ? `${email.text.substring(0, 100)}...` : email.text}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {email.labels.map(label => (
                      <span 
                        key={label} 
                        className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800"
                      >
                        {label === 'Inbox' ? 'Boîte de réception' : label === 'Sent' ? 'Envoyés' : label === 'Draft' ? 'Brouillons' : label === 'Trash' ? 'Corbeille' : label}
                      </span>
                    ))}
                  </div>
                </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Content */}
      {selectedEmail && (
        <div className="w-1/2 border-l border-gray-200 bg-white overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">{selectedEmail.subject}</h2>
            <div className="flex space-x-2">
              <button
                onClick={handleReply}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                title="Répondre"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleForward}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                title="Transférer"
              >
                <ArrowUturnRightIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                title="Supprimer"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-gray-900 font-medium">{selectedEmail.from}</h3>
              <span className="text-sm text-gray-500">{selectedEmail.date}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedEmail.labels.map((label) => (
                <span key={label} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                  {label === 'Inbox' ? 'Boîte de réception' : label === 'Sent' ? 'Envoyés' : label === 'Draft' ? 'Brouillons' : label === 'Trash' ? 'Corbeille' : label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <p className="text-gray-800 whitespace-pre-line">{selectedEmail.html || selectedEmail.text}</p>

            {selectedEmail.attachments.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Pièces jointes</h4>
                <div className="space-y-2">
                  {selectedEmail.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <DocumentIcon className="w-5 h-5 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-700">{attachment}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Email Side Panel */}
      {/* Compose Email Side Panel with Smooth Animation */}
      {(isComposing || isPanelVisible) && (
        <>
          {/* Overlay with fade in/out */}
          <div 
            className={`fixed inset-0 z-40 transition-opacity duration-500 ease-in-out ${isComposing && isPanelVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ background: 'rgba(0,0,0,0.10)' }} 
            aria-hidden="true" 
          />
          <div 
            ref={panelRef}
            className={`fixed inset-y-0 right-0 bg-white shadow-xl z-50 flex flex-col transition-transform duration-500 ease-in-out ${isResizing ? 'cursor-col-resize' : ''} ${isComposing && isPanelVisible ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ width: panelWidth }}
          >
            {/* Resize Handle */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
              onMouseDown={startResize}
            />
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800">Nouveau message</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => document.getElementById('file-input')?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  title="Joindre un fichier"
                >
                  <PaperClipIcon className="w-5 h-5" />
                </button>
                <input 
                  id="file-input" 
                  type="file" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files) {
                      const newFiles = Array.from(e.target.files);
                      setFiles([...files, ...newFiles]);
                      
                      // Simulate upload progress
                      newFiles.forEach(file => {
                        let progress = 0;
                        const interval = setInterval(() => {
                          progress += Math.random() * 10;
                          if (progress >= 100) {
                            progress = 100;
                            clearInterval(interval);
                          }
                          setUploadProgress(prev => ({
                            ...prev,
                            [file.name]: progress
                          }));
                        }, 300);
                      });
                    }
                  }}
                  multiple
                />
                <button 
                  onClick={() => setIsComposing(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* Panel Content */}
            <div className="flex-1 flex flex-col overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">À :</label>
                  <input
                    type="text"
                    value={newEmail.to}
                    onChange={(e) => setNewEmail({ ...newEmail, to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="destinataire@exemple.com"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objet :</label>
                  <input
                    type="text"
                    value={newEmail.subject}
                    onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Objet"
                  />
                </div>
              </div>
              
              {/* Message Editor */}
              <div className="flex-1 flex flex-col p-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Message :</label>
                <SimpleTextEditor
                  value={newEmail.html || newEmail.text}
                  onChange={val => setNewEmail({ ...newEmail, text: val })}
                  placeholder="Écrivez votre message..."
                  className="flex-1 min-h-[200px] h-full"
                />
              </div>
              
              {/* File Previews */}
              {files.length > 0 && (
                <div className="border-t border-gray-200 p-4 space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Pièces jointes</h3>
                  {files.map((file, index) => (
                    <div key={file.name + index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center min-w-0">
                        <DocumentIcon className="flex-shrink-0 w-4 h-4 mr-2 text-gray-500" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <div className="flex items-center">
                        {uploadProgress[file.name] && uploadProgress[file.name] < 100 ? (
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden mr-2">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-300" 
                              style={{ width: `${uploadProgress[file.name]}%` }}
                            />
                          </div>
                        ) : null}
                        <button 
                          onClick={() => {
                            setFiles(files.filter((_, i) => i !== index));
                            setUploadProgress(prev => {
                              const newProgress = {...prev};
                              delete newProgress[file.name];
                              return newProgress;
                            });
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Panel Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button 
                    onClick={() => {
                      const sanitizedContent = DOMPurify.sanitize(signatures[0].content);
                      setNewEmail({...newEmail, text: newEmail.text + "\n\n" + sanitizedContent});
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1"
                  >
                    Insérer une signature
                    <ChevronDownIcon className="w-4 h-4" />
                  </button>
                  
                  {/* Signature Dropdown */}
                  <div className="absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
                    <div className="py-1">
                      {signatures.map(sig => (
                        <button
                          key={sig.id}
                          onClick={() => {
                            const sanitizedContent = DOMPurify.sanitize(sig.content);
                            setNewEmail({...newEmail, text: newEmail.text + "\n\n" + sanitizedContent});
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {sig.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowSignatureSettings(true)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                  title="Gérer les signatures"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsComposing(false)}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Annuler
                </button>
                <Button onClick={handleSend}
                 className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                >
                  Envoyer
                </Button>
              </div>
            </div>
          </div>
          
        </> 
        

      )}
      
      {/* Signature Settings Modal */}
      {showSignatureSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Gérer les signatures</h3>
              <button onClick={() => setShowSignatureSettings(false)}>
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {signatures.map(sig => (
                <div key={sig.id} className="p-3 border rounded-lg">
                  <h4 className="font-medium">{sig.name}</h4>
                  <div 
                    className="text-sm text-gray-600 mt-2"
                    dangerouslySetInnerHTML={{ __html: sig.content }}
                  />
                </div>
              ))}
              
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Ajouter une signature</h4>
                <input
                  type="text"
                  placeholder="Nom de la signature"
                  className="w-full mb-2 p-2 border rounded"
                  value={newSignature.name}
                  onChange={(e) => setNewSignature({...newSignature, name: e.target.value})}
                />
                <textarea
                  placeholder="Contenu de la signature"
                  className="w-full p-2 border rounded h-24"
                  value={newSignature.content}
                  onChange={(e) => setNewSignature({...newSignature, content: e.target.value})}
                />
                <button 
                  onClick={() => {
                    if (newSignature.name && newSignature.content) {
                      setSignatures([...signatures, {
                        id: Date.now(),
                        ...newSignature
                      }]);
                      setNewSignature({ name: "", content: "" });
                    }
                  }}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Undo Delete Notification */}
      {showUndo && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-md flex items-center gap-4 z-50">
          <span>Email supprimé</span>
          <button 
            onClick={handleUndoDelete}
            className="text-blue-300 hover:text-blue-100 font-medium"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}

export default EmailPage;

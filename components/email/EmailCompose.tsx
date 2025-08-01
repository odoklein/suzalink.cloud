"use client";
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  XMarkIcon, 
  PaperClipIcon, 
  DocumentIcon,
  ChevronDownIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import SimpleTextEditor from '@/components/SimpleTextEditor';
import DOMPurify from 'dompurify';

interface EmailComposeProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (emailData: any) => void;
  sending?: boolean;
  initialData?: {
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
  };
}

export function EmailCompose({ 
  isOpen, 
  onClose, 
  onSend, 
  sending = false,
  initialData = {}
}: EmailComposeProps) {
  const [emailData, setEmailData] = useState({
    to: initialData.to || '',
    subject: initialData.subject || '',
    text: initialData.text || '',
    html: initialData.html || ''
  });
  
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [showSignatureDropdown, setShowSignatureDropdown] = useState(false);
  const [panelWidth, setPanelWidth] = useState('600px');
  const [isResizing, setIsResizing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState('');
  
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const emailSuggestions = ['suzaliconseil.com', 'gmail.com'];

  const signatures = [
    {
      id: 1,
      name: "Professional",
      content: `
      <div style="background-color: #0d6efd; padding: 20px; border-radius: 8px; max-width: 400px; font-family: Arial, sans-serif; color: white;">
        <div style="font-family: 'Pacifico', cursive; font-size: 24px;">
          Hichem Hammouche
        </div>
        <div style="font-size: 14px; margin-top: 4px;">
          CEO · Suzali Conseil
        </div>
      </div>
      `
    },
    {
      id: 2,
      name: "Simple",
      content: "Cordialement,\nHichem Hammouche\nCEO, Suzali Conseil"
    }
  ];

  const handleToChange = (value: string) => {
    setEmailData({ ...emailData, to: value });
    
    // Check if the user just typed @
    if (value.includes('@') && !value.includes('.')) {
      const lastAtIndex = value.lastIndexOf('@');
      const textAfterAt = value.substring(lastAtIndex + 1);
      
      if (textAfterAt === '' || emailSuggestions.some(domain => domain.startsWith(textAfterAt))) {
        setCurrentSuggestion(textAfterAt);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (domain: string) => {
    const lastAtIndex = emailData.to.lastIndexOf('@');
    const beforeAt = emailData.to.substring(0, lastAtIndex + 1);
    setEmailData({ ...emailData, to: beforeAt + domain });
    setShowSuggestions(false);
  };

  const handleSend = () => {
    if (!emailData.to || !emailData.subject || (!emailData.html && !emailData.text)) return;
    onSend({
      ...emailData,
      attachments: files
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const removeFile = (index: number) => {
    const file = files[index];
    setFiles(files.filter((_, i) => i !== index));
    setUploadProgress(prev => {
      const newProgress = {...prev};
      delete newProgress[file.name];
      return newProgress;
    });
  };

  const insertSignature = (signature: any) => {
    const sanitizedContent = DOMPurify.sanitize(signature.content);
    setEmailData({
      ...emailData, 
      html: (emailData.html || emailData.text) + "<br><br>" + sanitizedContent
    });
    setShowSignatureDropdown(false);
  };

  // Resizing logic
  const startResize = (e: React.MouseEvent) => {
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = panelRef.current ? panelRef.current.offsetWidth : 600;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing || !panelRef.current) return;
    const newWidth = startWidthRef.current + (startXRef.current - e.clientX);
    const minWidth = 400;
    const maxWidth = window.innerWidth * 0.8;
    
    if (newWidth > minWidth && newWidth < maxWidth) {
      setPanelWidth(`${newWidth}px`);
    }
  };

  const stopResize = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }} onClick={onClose} />
      
      {/* Compose Panel */}
      <div 
        ref={panelRef}
        className="fixed inset-y-0 right-0 bg-white shadow-xl z-50 flex flex-col"
        style={{ width: panelWidth }}
      >
        {/* Resize Handle */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
          onMouseDown={startResize}
        />

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Nouveau message</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => document.getElementById('compose-file-input')?.click()}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Joindre un fichier"
            >
              <PaperClipIcon className="w-5 h-5" />
            </button>
            <input 
              id="compose-file-input" 
              type="file" 
              className="hidden" 
              onChange={handleFileSelect}
              multiple
            />
            <button 
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4 border-b border-gray-200">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">À :</label>
              <input
                type="email"
                value={emailData.to}
                onChange={(e) => handleToChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="destinataire@exemple.com"
                multiple
              />
              
              {/* Email suggestions dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-10">
                  {emailSuggestions
                    .filter(domain => domain.startsWith(currentSuggestion))
                    .map((domain) => (
                      <button
                        key={domain}
                        onClick={() => selectSuggestion(domain)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg text-sm"
                      >
                        {emailData.to.substring(0, emailData.to.lastIndexOf('@') + 1)}<span className="font-medium">{domain}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Objet :</label>
              <input
                type="text"
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Objet du message"
              />
            </div>
          </div>

          {/* Message Editor */}
          <div className="flex-1 flex flex-col p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Message :</label>
            <SimpleTextEditor
              value={emailData.html || emailData.text}
              onChange={(value) => setEmailData({ ...emailData, html: value })}
              placeholder="Écrivez votre message..."
              className="flex-1 min-h-[300px]"
            />
          </div>

          {/* Attachments */}
          {files.length > 0 && (
            <div className="border-t border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Pièces jointes ({files.length})
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={file.name + index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center min-w-0 flex-1">
                      <DocumentIcon className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="flex items-center ml-2">
                      {uploadProgress[file.name] && uploadProgress[file.name] < 100 ? (
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden mr-2">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-300" 
                            style={{ width: `${uploadProgress[file.name]}%` }}
                          />
                        </div>
                      ) : null}
                      <button 
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="relative">
                <button 
                  onClick={() => setShowSignatureDropdown(!showSignatureDropdown)}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1"
                >
                  Signature
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                
                {showSignatureDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      {signatures.map(sig => (
                        <button
                          key={sig.id}
                          onClick={() => insertSignature(sig)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {sig.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <Button 
                onClick={handleSend}
                disabled={sending || !emailData.to || !emailData.subject}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Envoi...' : 'Envoyer'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

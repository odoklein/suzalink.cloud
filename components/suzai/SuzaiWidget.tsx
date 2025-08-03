"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Mic, 
  MicOff, 
  Send, 
  X, 
  Minimize2, 
  Maximize2,
  Bot,
  Sparkles,
  Loader2,
  GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { useSuzai } from '@/lib/suzai/SuzaiContext';
import { SuzaiActionEngine } from '@/lib/suzai/actionEngine';
import { useNextAuth } from '@/lib/nextauth-context';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface SuzaiWidgetProps {
  className?: string;
}

interface Position {
  x: number;
  y: number;
}

export default function SuzaiWidget({ className }: SuzaiWidgetProps) {
  const { user } = useNextAuth();
  const { currentPage, availableActions, executeAction } = useSuzai();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Bonjour ! Je suis SUZai, votre assistant CRM. Je peux vous aider avec les emails, rendez-vous, factures, et gestion des clients. Que souhaitez-vous faire ? 🤖✨",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [position, setPosition] = useState<Position>({ x: window.innerWidth - 550, y: window.innerHeight - 650 });
  const [size, setSize] = useState({ width: 500, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === headerRef.current || headerRef.current?.contains(e.target as Node)) {
      setIsDragging(true);
      const rect = modalRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  };

  // Handle mouse down for resizing
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    const rect = modalRef.current?.getBoundingClientRect();
    if (rect) {
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height
      });
    }
  };

  // Handle mouse move for dragging and resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Keep modal within viewport bounds
        const maxX = window.innerWidth - size.width;
        const maxY = window.innerHeight - size.height;
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
      
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        const newWidth = Math.max(300, Math.min(800, resizeStart.width + deltaX));
        const newHeight = Math.max(400, Math.min(window.innerHeight - 100, resizeStart.height + deltaY));
        
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, resizeStart, size.width, size.height]);

  // Function to handle navigation
  const handleNavigation = (pageName: string) => {
    const pageRoutes: Record<string, string> = {
      'dashboard': '/dashboard',
      'email': '/dashboard/email',
      'bookings': '/dashboard/bookings',
      'clients': '/dashboard/clients',
      'prospects': '/dashboard/prospects',
      'finance': '/dashboard/finance',
      'users': '/dashboard/utilisateurs',
      'chat': '/dashboard/chat'
    };

    const route = pageRoutes[pageName];
    if (route) {
      router.push(route);
      toast.success(`Navigation vers ${pageName}...`);
    }
  };

  // Function to render message content with clickable navigation links and markdown
  const renderMessageContent = (content: string) => {
    // Regular expression to find [NAVIGATE:page_name] patterns
    const navigationRegex = /\[NAVIGATE:([^\]]+)\]/g;
    
    if (!navigationRegex.test(content)) {
      // No navigation links, render as markdown
      return (
        <div className="prose prose-sm max-w-none text-sm leading-relaxed">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              // Custom styling for markdown elements
              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
              h1: ({ children }) => <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-medium mb-2 mt-2 first:mt-0">{children}</h3>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-sm">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-emerald-200 pl-4 py-2 my-3 bg-emerald-50 rounded-r">
                  {children}
                </blockquote>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ) : (
                  <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto my-3">
                    <code className="text-xs font-mono">{children}</code>
                  </pre>
                );
              },
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              hr: () => <hr className="my-4 border-gray-200" />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
    }

    // Split content by navigation patterns and render with clickable links
    const parts = content.split(navigationRegex);
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Regular text - render as markdown
        if (parts[i]) {
          elements.push(
            <div key={i} className="prose prose-sm max-w-none text-sm leading-relaxed">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                  h1: ({ children }) => <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-medium mb-2 mt-2 first:mt-0">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-emerald-200 pl-4 py-2 my-3 bg-emerald-50 rounded-r">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto my-3">
                        <code className="text-xs font-mono">{children}</code>
                      </pre>
                    );
                  },
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  hr: () => <hr className="my-4 border-gray-200" />,
                }}
              >
                {parts[i]}
              </ReactMarkdown>
            </div>
          );
        }
      } else {
        // Navigation link (page name)
        const pageName = parts[i];
        elements.push(
          <button
            key={i}
            onClick={() => handleNavigation(pageName)}
            className="inline-flex items-center px-2 py-1 mx-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors duration-200 cursor-pointer"
          >
            {pageName}
          </button>
        );
      }
    }

    return <div className="text-sm">{elements}</div>;
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };

    setMessages(prev => [...prev, typingMessage]);

    try {
      // Create action engine with current context and user ID
      const actionEngine = new SuzaiActionEngine({
        currentPage,
        availableActions,
        userData: { userId: user?.id || 'current-user' },
        currentData: null
      });

      // Process the message with AI
      const result = await actionEngine.processMessage(content);

      // Remove typing indicator and add response
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => msg.id !== 'typing');
        return [...withoutTyping, {
          id: Date.now().toString(),
          type: 'assistant',
          content: result.message,
          timestamp: new Date()
        }];
      });

      // If there are suggested actions, add them as quick actions
      if (result.nextActions && result.nextActions.length > 0) {
        console.log('Available actions:', result.nextActions);
      }

      // Show success toast if action was executed
      if (result.data && result.success) {
        toast.success('Action exécutée avec succès !');
      }

    } catch (error) {
      console.error('Error processing message:', error);
      toast.error('Erreur lors du traitement du message');
      
      // Remove typing indicator and add error message
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => msg.id !== 'typing');
        return [...withoutTyping, {
          id: Date.now().toString(),
          type: 'assistant',
          content: "Désolé, j'ai rencontré une erreur. Pouvez-vous reformuler votre demande ?",
          timestamp: new Date()
        }];
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      toast.success('Enregistrement terminé');
    } else {
      // Start recording
      setIsRecording(true);
      toast.info('Enregistrement en cours... Parlez maintenant');
      
      // Simulate recording for 5 seconds
      setTimeout(() => {
        setIsRecording(false);
        handleSendMessage('Message vocal transcrit (simulation)');
      }, 5000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getQuickActions = () => {
    const actions = [
      { label: '👋 Salut', action: 'Salut ! Comment ça va ?' },
      { label: '❓ Aide', action: 'J\'ai besoin d\'aide avec Suzali CRM' },
      { label: '🔧 Problème', action: 'J\'ai un problème technique' },
      { label: '📚 Guide', action: 'Peux-tu m\'expliquer comment utiliser une fonctionnalité ?' },
      { label: '🧭 Navigation', action: 'Guide-moi vers les différentes pages du CRM' }
    ];

    // Add page-specific help actions
    if (currentPage === 'email') {
      actions.push(
        { label: '📧 Config Email', action: 'Comment configurer mon compte email ?' },
        { label: '📨 Envoyer Email', action: 'Comment envoyer un email ?' },
        { label: '🔄 Sync', action: 'Mes emails ne se synchronisent pas' }
      );
    } else if (currentPage === 'bookings') {
      actions.push(
        { label: '📅 Config Cal', action: 'Comment configurer mon calendrier ?' },
        { label: '⏰ Types RDV', action: 'Comment créer des types de rendez-vous ?' },
        { label: '🔗 Réservation', action: 'Comment créer un lien de réservation ?' }
      );
    } else if (currentPage === 'clients') {
      actions.push(
        { label: '👥 Ajouter Client', action: 'Comment ajouter un nouveau client ?' },
        { label: '📊 Dashboard', action: 'Comment utiliser le tableau de bord clients ?' },
        { label: '🔍 Recherche', action: 'Comment rechercher et filtrer mes clients ?' }
      );
    } else if (currentPage === 'prospects') {
      actions.push(
        { label: '📁 Organisation', action: 'Comment organiser mes prospects en dossiers ?' },
        { label: '📥 Import CSV', action: 'Comment importer des prospects via CSV ?' },
        { label: '🔄 Workflow', action: 'Comment gérer le workflow de conversion ?' }
      );
    } else if (currentPage === 'finance') {
      actions.push(
        { label: '💰 Facture', action: 'Comment créer une facture ?' },
        { label: '📊 Rapports', action: 'Comment générer des rapports financiers ?' },
        { label: '💳 Paiements', action: 'Comment configurer les paiements en ligne ?' }
      );
    } else if (currentPage === 'dashboard') {
      actions.push(
        { label: '📈 Statistiques', action: 'Comment lire les statistiques du tableau de bord ?' },
        { label: '⚙️ Personnalisation', action: 'Comment personnaliser mon tableau de bord ?' },
        { label: '🚀 Fonctionnalités', action: 'Quelles sont les principales fonctionnalités de Suzali CRM ?' }
      );
    }

    return actions;
  };

  if (!isExpanded) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          onClick={toggleExpanded}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
        >
          <Bot className="w-6 h-6 text-white" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
        </Button>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          Parler à SUZai
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={modalRef}
      className={`absolute z-50 ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`
      }}
    >
      <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm h-full flex flex-col">
        {/* Header - Draggable */}
        <div 
          ref={headerRef}
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-t-lg cursor-move select-none"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <Bot className="w-8 h-8" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h3 className="font-bold text-xl">SUZai</h3>
              <p className="text-sm text-emerald-100 font-medium">
                {currentPage === 'email' && 'Assistant Email'}
                {currentPage === 'bookings' && 'Assistant Rendez-vous'}
                {currentPage === 'clients' && 'Assistant Clients'}
                {currentPage === 'finance' && 'Assistant Finance'}
                {currentPage === 'dashboard' && 'Assistant CRM'}
                {!['email', 'bookings', 'clients', 'finance', 'dashboard'].includes(currentPage) && 'Assistant CRM'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-white/20 text-white border-0">
              <Sparkles className="w-3 h-3 mr-1" />
              IA
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              className="text-white hover:bg-white/20 p-1"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <CardContent className="p-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-6 py-4 shadow-sm ${
                    message.type === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-50 text-gray-900 border border-gray-200'
                  }`}
                >
                  {message.isTyping ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">SUZai réfléchit...</span>
                    </div>
                  ) : (
                    <>
                      {renderMessageContent(message.content)}
                      <p className={`text-xs mt-1 ${
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tapez votre message ou utilisez la voix..."
                  className="pr-10 border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                  disabled={isProcessing}
                />
                {isRecording && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              <Button
                onClick={handleVoiceToggle}
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                className="p-2"
                disabled={isProcessing}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button
                onClick={() => handleSendMessage(inputValue)}
                size="sm"
                className="p-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                disabled={!inputValue.trim() || isProcessing}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {getQuickActions().map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendMessage(action.action)}
                  className="text-xs border-gray-300 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200"
                  disabled={isProcessing}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>

        {/* Resize Handle */}
        <div
          ref={resizeHandleRef}
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-center justify-center"
          style={{ cursor: 'se-resize' }}
        >
          <GripVertical className="w-4 h-4 text-gray-400 rotate-45" />
        </div>
      </Card>
    </div>
  );
} 
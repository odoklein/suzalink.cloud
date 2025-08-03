"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useNextAuth } from '@/lib/nextauth-context';
import AiChatFeedback from './AiChatFeedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  Bot, 
  Sparkles, 
  Loader2,
  MessageCircle,
  User
} from 'lucide-react';

interface Message {
  id: string;
  sender_type: 'user' | 'ai';
  content: string;
  timestamp?: Date;
}

export default function AiChat({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { session } = useNextAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 text-lg font-medium">
              Veuillez vous connecter pour utiliser le chat IA
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!session) {
      setError('Vous devez être connecté pour chatter.');
      return;
    }
    setLoading(true);
    setError('');
    const userMsg: Message = {
      id: Math.random().toString(),
      sender_type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation_id: conversationId, message: userMsg.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue');
      setMessages((prev) => [...prev, { ...data.aiMsg, sender_type: 'ai', timestamp: new Date() }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <Card className="flex flex-col h-full shadow-lg border-0 bg-white">
        {/* Header */}
        <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-t-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Bot className="w-8 h-8 text-white" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h2 className="text-2xl font-bold">SUZai Assistant</h2>
                <p className="text-emerald-100 text-sm font-medium">
                  Assistant IA intelligent pour Suzali CRM
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="default" className="bg-white/20 text-white border-0 px-3 py-1">
                <Sparkles className="w-4 h-4 mr-2" />
                IA
              </Badge>
              <div className="flex items-center gap-2 text-emerald-100">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{messages.length} messages</span>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex-1 p-0 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Bot className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Bienvenue dans le chat SUZai ! 🤖
                    </h3>
                    <p className="text-gray-600 max-w-md">
                      Je suis votre assistant IA personnel. Je peux vous aider avec les emails, 
                      rendez-vous, factures, et la gestion des clients. Posez-moi vos questions !
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start gap-3 max-w-[80%] ${msg.sender_type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      msg.sender_type === 'user' 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {msg.sender_type === 'user' ? (
                        <User className="w-5 h-5" />
                      ) : (
                        <Bot className="w-5 h-5" />
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={`flex flex-col ${msg.sender_type === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`rounded-2xl px-6 py-4 shadow-sm ${
                        msg.sender_type === 'user' 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-gray-50 text-gray-900 border border-gray-200'
                      }`}>
                        {msg.sender_type === 'user' ? (
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none text-sm leading-relaxed">
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
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                      
                      {/* Timestamp */}
                      {msg.timestamp && (
                        <div className={`text-xs mt-2 ${
                          msg.sender_type === 'user' ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {formatTime(msg.timestamp)}
                        </div>
                      )}

                      {/* Feedback for AI messages */}
                      {msg.sender_type === 'ai' && (
                        <div className="mt-2">
                          <AiChatFeedback messageId={msg.id} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex flex-col">
                      <div className="bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                          <span className="text-sm text-gray-600">SUZai réfléchit...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-6 pb-4">
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    type="text"
                    className="border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                    placeholder="Tapez votre message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={loading}
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !input.trim()}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
              
              {/* Quick Actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { label: '👋 Salut', action: 'Salut ! Comment ça va ?' },
                  { label: '❓ Aide', action: 'J\'ai besoin d\'aide avec Suzali CRM' },
                  { label: '🔧 Problème', action: 'J\'ai un problème technique' },
                  { label: '📚 Guide', action: 'Peux-tu m\'expliquer comment utiliser une fonctionnalité ?' }
                ].map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInput(action.action);
                      setTimeout(() => sendMessage(), 100);
                    }}
                    className="text-xs border-gray-300 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200"
                    disabled={loading}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User as UserIcon, Users as UsersIcon, MessageCircle, Dot, Paperclip, Send } from "lucide-react";

interface User {
  id: string;
  full_name: string | null;
  email: string;
}

interface Chat {
  id: string;
  type: "private" | "group" | "project";
  created_by: string;
  created_at: string;
  project_id?: string;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  file_url?: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [chatType, setChatType] = useState<"private" | "group" | "project">("private");
  const [chatParticipants, setChatParticipants] = useState<any[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, { content: string; sent_at: string; sender_id: string }>>({});
  // Add state for mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch all chats for the user
  useEffect(() => {
    if (!user) return;
    const fetchChats = async () => {
      setLoading(true);
      // Fetch chats where user is a participant
      const { data: participantRows } = await supabase
        .from("chat_participants")
        .select("chat_id")
        .eq("user_id", user.id);
      const chatIds = participantRows?.map((row: { chat_id: string }) => row.chat_id) || [];
      if (chatIds.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }
      const { data: chatsList } = await supabase
        .from("chats")
        .select("*")
        .in("id", chatIds);
      setChats(chatsList || []);
      setLoading(false);
    };
    fetchChats();
  }, [user]);

  // Fetch all users for participant selection
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from("users").select("id, full_name, email");
      setUsers(data?.filter((u: User) => u.id !== user?.id) || []);
    };
    if (user) fetchUsers();
  }, [user]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChat || !user) return;
    const fetchMessages = async () => {
      const res = await fetch(`/api/chat/${selectedChat.id}`, {
        headers: { 'x-user-id': user.id },
      });
      if (res.status === 403) {
        setMessages([]);
        // Optionally show a message: Not a participant
        return;
      }
      const { messages, participants } = await res.json();
      setMessages(messages || []);
      setChatParticipants(participants || []);
    };
    fetchMessages();
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`chat-messages-${selectedChat.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${selectedChat.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat, user]);

  // Fetch last message for each chat after chats are loaded
  useEffect(() => {
    if (!chats.length) return;
    const fetchLastMessages = async () => {
      const lastMsgs: Record<string, { content: string; sent_at: string; sender_id: string }> = {};
      for (const chat of chats) {
        const { data: msg } = await supabase
          .from("chat_messages")
          .select("content, sent_at, sender_id")
          .eq("chat_id", chat.id)
          .order("sent_at", { ascending: false })
          .limit(1)
          .single();
        if (msg) lastMsgs[chat.id] = msg;
      }
      setLastMessages(lastMsgs);
    };
    fetchLastMessages();
  }, [chats]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // User map for sender name lookup
  const userMap = users.reduce((acc, u) => {
    acc[u.id] = u;
    return acc;
  }, {} as Record<string, User>);
  userMap[user?.id ?? ""] = { id: user?.id ?? "", full_name: "You", email: user?.email ?? "" };

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() && !file) return;
    let file_url;
    if (file) {
      const { data, error } = await supabase.storage
        .from("chat-files")
        .upload(`${selectedChat?.id}/${Date.now()}-${file.name}`, file);
      if (error) {
        alert("File upload failed");
        return;
      }
      file_url = data?.path;
    }
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: selectedChat?.id,
        sender_id: user?.id,
        content: newMessage,
        file_url,
      }),
    });
    setNewMessage("");
    setFile(null);
  };

  // Create new chat (simplified: only type and created_by, can be extended for participants)
  const handleCreateChat = async (type: "private" | "group" | "project") => {
    setShowModal(false);
    // TODO: send selectedParticipants to backend and store in a participants table
    const res = await fetch("/api/chat/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, created_by: user?.id, participants: selectedParticipants }),
    });
    if (!res.ok) {
      const errorText = await res.text();
      alert("Failed to create chat: " + errorText);
      return;
    }
    const { chat } = await res.json();
    setChats((prev) => [...prev, chat]);
    setSelectedChat(chat);
  };

  // Helper for avatar/initials
  function getAvatar(chat: Chat) {
    if (chat.type === "private") {
      // Find the other participant
      const other = users.find(u => u.id !== user?.id && chats.some(c => c.id === chat.id));
      if (other?.full_name) {
        const initials = other.full_name.split(" ").map(n => n[0]).join("").toUpperCase();
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700 text-sm">
            {initials}
          </div>
        );
      }
      return <UserIcon className="w-8 h-8 text-gray-400" />;
    }
    // Group/project chat
    return <UsersIcon className="w-8 h-8 text-gray-400" />;
  }

  // Helper for participant avatars
  function getParticipantAvatar(user: any) {
    if (user?.full_name) {
      const initials = user.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase();
      return (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 text-xs border-2 border-white -ml-2 first:ml-0">
          {initials}
        </div>
      );
    }
    return <UserIcon className="w-7 h-7 text-gray-400 border-2 border-white -ml-2 first:ml-0 rounded-full bg-gray-100" />;
  }

  function formatTime(dateString: string) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  // Add skeleton components
  function ChatSkeleton() {
    return (
      <div className="mb-2 p-3 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  function MessageSkeleton() {
    return (
      <div className="flex items-end gap-2 justify-start animate-pulse">
        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gray-200"></div>
        <div className="max-w-[75%] md:max-w-md lg:max-w-lg px-3 md:px-4 py-2 rounded-2xl bg-gray-200">
          <div className="h-3 bg-gray-300 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[80vh] gap-4 p-2 md:p-4 min-h-0">
      {/* Sidebar: Chat List - Responsive */}
      <Card className={`${sidebarOpen ? 'fixed inset-0 z-50 md:relative md:inset-auto' : 'hidden md:block'} w-full md:w-1/4 p-4 md:p-6 flex flex-col bg-white/95 backdrop-blur-sm`}>
        <div className="flex justify-between items-center mb-4 p-2 md:p-4">
          <h2 className="text-xl font-bold">Chats</h2>
          <div className="flex gap-2">
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogTrigger asChild>
                <Button size="sm" className="text-xs">New Chat</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a new chat</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Select value={chatType} onValueChange={v => setChatType(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select chat type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private Chat</SelectItem>
                    <SelectItem value="group">Group Chat</SelectItem>
                    <SelectItem value="project">Project Chat</SelectItem>
                  </SelectContent>
                </Select>
                {chatType === "private" && (
                  <Select value={selectedParticipants[0] || ""} onValueChange={v => setSelectedParticipants([v])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {(chatType === "group" || chatType === "project") && (
                  <div className="flex flex-wrap gap-1">
                    {users.map(u => (
                      <Badge
                        key={u.id}
                        variant={selectedParticipants.includes(u.id) ? "default" : undefined}
                        onClick={() => {
                          setSelectedParticipants(prev =>
                            prev.includes(u.id)
                              ? prev.filter(id => id !== u.id)
                              : [...prev, u.id]
                          );
                        }}
                        className="cursor-pointer"
                      >
                        {u.full_name || u.email}
                      </Badge>
                    ))}
                  </div>
                )}
                <Button onClick={() => handleCreateChat(chatType)}>Create Chat</Button>
              </div>
            </DialogContent>
          </Dialog>
            {/* Mobile close button */}
            <Button
              size="sm"
              variant="outline"
              className="md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              ×
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pr-1 md:pr-2">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <ChatSkeleton key={i} />
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-gray-500 mb-4">Start a new chat to begin messaging with your team</p>
              <Button onClick={() => setShowModal(true)} className="bg-purple-500 hover:bg-purple-600">
                Start Your First Chat
              </Button>
            </div>
          ) : (
            chats.map((chat) => {
              const lastMsg = lastMessages[chat.id];
              return (
              <Card
                key={chat.id}
                  className={`mb-2 p-3 cursor-pointer transition-all border-l-4 ${selectedChat?.id === chat.id ? "border-purple-500 bg-purple-50" : "border-transparent hover:bg-gray-50"}`}
                  onClick={() => {
                    setSelectedChat(chat);
                    setSidebarOpen(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    {getAvatar(chat)}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold capitalize truncate text-sm">{chat.type} chat</span>
                        {lastMsg && (
                          <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{formatTime(lastMsg.sent_at)}</span>
                        )}
                      </div>
                      {lastMsg ? (
                        <div className="text-xs text-gray-600 truncate flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 text-gray-300" />
                          <span className="truncate">{lastMsg.content}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic">No messages yet</div>
                      )}
                    </div>
                  </div>
              </Card>
              );
            })
          )}
        </div>
      </Card>
      
      {/* Main: Chat Window - Responsive */}
      <Card className="flex-1 flex flex-col min-h-0 p-2 md:p-6 bg-white/90 rounded-3xl shadow-xl">
        {selectedChat ? (
          <>
            {/* Enhanced Chat Header - Responsive */}
            <div className="border-b px-4 md:px-8 py-4 flex items-center gap-4 bg-white/80 rounded-t-3xl shadow-sm mb-2" style={{ minHeight: 64 }}>
              {/* Mobile menu button */}
              <Button
                size="sm"
                variant="ghost"
                className="md:hidden p-1"
                onClick={() => setSidebarOpen(true)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
              
              {/* Chat type icon */}
              {selectedChat.type === "private" ? (
                <UserIcon className="w-6 h-6 md:w-7 md:h-7 text-purple-400" />
              ) : (
                <UsersIcon className="w-6 h-6 md:w-7 md:h-7 text-purple-400" />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base md:text-lg text-gray-900 capitalize truncate">
                    {selectedChat.type} chat
                  </span>
                  <Badge variant="default" className="capitalize text-xs px-2 py-0.5 hidden sm:inline">
                    {selectedChat.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {/* Participant avatars - responsive */}
                  {chatParticipants.slice(0, 3).map((p, i) => (
                    <span key={p.user_id || i}>{getParticipantAvatar(p.users)}</span>
                  ))}
                  {chatParticipants.length > 3 && (
                    <span className="text-xs text-gray-500 ml-2">+{chatParticipants.length - 3} more</span>
                  )}
                </div>
              </div>
              
              {/* Placeholder for online status */}
              <div className="flex items-center gap-1">
                <Dot className="w-4 h-4 md:w-5 md:h-5 text-green-500 animate-pulse" />
                <span className="text-xs text-green-600 hidden sm:inline">Online</span>
              </div>
            </div>
            
            {/* Messages area - responsive */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-6 space-y-4 bg-gray-50 rounded-b-3xl">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <MessageSkeleton key={i} />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                    <p className="text-gray-500">Send the first message to start the conversation</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  const sender = userMap[msg.sender_id];
                  const initials = sender?.full_name ? sender.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase() : "?";
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      {/* Avatar for others */}
                      {!isMe && (
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700 text-xs md:text-sm shadow-sm">
                          {initials}
                        </div>
                      )}
                      <div className={`max-w-[75%] md:max-w-md lg:max-w-lg px-5 md:px-7 py-3 rounded-2xl shadow-sm ${isMe ? "bg-purple-500 text-white rounded-br-sm" : "bg-white text-gray-900 rounded-bl-sm border border-gray-200"}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-semibold truncate">{isMe ? "You" : sender?.full_name || msg.sender_id}</span>
                          <span className="text-xs text-gray-400">{new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="break-words whitespace-pre-line text-base">{msg.content}</div>
                  {msg.file_url && (
                    <a
                      href={supabase.storage.from("chat-files").getPublicUrl(msg.file_url).data.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                            className="text-blue-200 underline text-xs block mt-1"
                    >
                      Attachment
                    </a>
                  )}
                </div>
                      {/* Avatar for me */}
                      {isMe && (
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold text-white text-xs md:text-sm shadow-sm">
                          {initials}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input area - responsive */}
            <div className="border-t p-3 md:p-5 flex gap-3 items-center bg-white/80 rounded-b-3xl shadow-inner mt-2">
              <label className="flex items-center cursor-pointer mr-1 md:mr-2">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <span className="p-2 rounded-full hover:bg-purple-100 transition-colors">
                  <Paperclip className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                </span>
              </label>
              <Input
                className="flex-1 rounded-full px-3 md:px-4 py-2 bg-gray-100 border border-gray-200 focus:ring-2 focus:ring-purple-200 transition-all text-sm"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newMessage.trim()) handleSend();
                }}
                disabled={loading}
              />
              <Button
                className="rounded-full p-0 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center"
                onClick={handleSend}
                disabled={!newMessage.trim() && !file}
                variant="default"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center">
            <div>
              <MessageCircle className="w-14 h-14 mx-auto mb-6 text-gray-300" />
              <p className="text-xl font-medium mb-3">Select a chat to start messaging</p>
              <p className="text-base text-gray-500">Choose from your conversations or start a new one</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
} 
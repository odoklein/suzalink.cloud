"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

// Types
type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
  attachment_url?: string;
};

type Chat = {
  id: string;
  participants: string[];
  created_at: string;
};

export default function ChatSystem() {
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<{id: string, full_name: string, email: string, profile_picture_url?: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user, chats, and messages
  useEffect(() => {
    (async () => {
      // Try to get user from localStorage/session (Supabase client-side)
      const {
        data: { user },
        error
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        // Fetch all users except self
        const { data: usersData } = await supabase
          .from("users")
          .select("id, full_name, email, profile_picture_url")
          .neq("id", user.id);
        setUsers(usersData || []);
        // Fetch chats
        const { data: chatsData } = await supabase
          .from("chats1")
          .select("*")
          .contains("participants", [user.id]);
        setChats(chatsData || []);
        if (chatsData && chatsData.length > 0) {
          setActiveChat(chatsData[0]);
        }
      }
    })();
  }, []);

  // Fetch messages for active chat
  useEffect(() => {
    if (!activeChat) return;
    const fetchMessages = async () => {
      const { data: messagesData } = await supabase
        .from("messages1")
        .select("*")
        .eq("chat_id", activeChat.id)
        .order("created_at", { ascending: true });
      setMessages(messagesData || []);
      // Mark unread messages as read if they are for me
      if (user) {
        const unreadIds = (messagesData || []).filter(m => !m.read && m.sender_id !== user.id).map(m => m.id);
        if (unreadIds.length > 0) {
          await supabase.from("messages1").update({ read: true }).in("id", unreadIds);
        }
      }
    };
    fetchMessages();
    // Subscribe to new messages
    const channel = supabase
      .channel("messages1:realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages1", filter: `chat_id=eq.${activeChat.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      // Typing indicator events
      .on(
        "broadcast" as any,
        { event: "typing", schema: "public", table: "chats1", filter: `chat_id=eq.${activeChat.id}` },
        (payload) => {
          if (payload.payload.userId !== user?.id) setOtherTyping(payload.payload.typing);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat, user]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send a message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !user || !activeChat) return;
    let fileUrl = null;
    if (attachment) {
      setUploading(true);
      const fileExt = attachment.name.split('.').pop() || 'bin';
      const filePath = `chat-attachments/${activeChat.id}/${Date.now()}.${fileExt}`;
      console.log("Uploading file:", attachment);
      console.log("To path:", filePath);
      const { data, error } = await supabase.storage.from('attachments').upload(filePath, attachment);
      if (error) {
        alert('Erreur lors de l’upload: ' + error.message);
        setUploading(false);
        setAttachment(null);
        return;
      }
      if (data) {
        fileUrl = supabase.storage.from('attachments').getPublicUrl(filePath).data.publicUrl;
      }
      setUploading(false);
      setAttachment(null);
    }
    const { error } = await supabase.from("messages1").insert({
      chat_id: activeChat.id,
      sender_id: user.id,
      content: newMessage,
      read: false,
      attachment_url: fileUrl
    });
    if (error) {
      console.error('Supabase insert error:', error);
      alert('Supabase insert error: ' + JSON.stringify(error));
    }
    setNewMessage("");
  };

  // Typing event
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    setIsTyping(true);
    if (activeChat && user) {
      supabase.channel('typing-indicator').send({
        type: 'broadcast',
        event: 'typing',
        payload: { chat_id: activeChat.id, userId: user.id, typing: true }
      });
      setTimeout(() => {
        setIsTyping(false);
        supabase.channel('typing-indicator').send({
          type: 'broadcast',
          event: 'typing',
          payload: { chat_id: activeChat.id, userId: user.id, typing: false }
        });
      }, 2000);
    }
  };

  // Handler: Start or continue chat with a user
  const handleSelectUser = async (targetUserId: string) => {
    if (!user || !targetUserId) return;
    // Check if chat exists
    let chat = chats.find(c => c.participants.length === 2 && c.participants.includes(targetUserId));
    if (!chat) {
      // Create new chat
      const { data: newChat, error } = await supabase
        .from("chats1")
        .insert({ participants: [user.id, targetUserId] })
        .select()
        .single();
      if (newChat) {
        setChats(prev => [...prev, newChat]);
        setActiveChat(newChat);
      }
    } else {
      setActiveChat(chat);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full max-h-[90vh] rounded-2xl overflow-hidden bg-[#F9F9FB] shadow-lg border border-gray-200">
      {/* Users list */}
      <aside className="w-full md:w-1/4 bg-white border-r border-gray-200 p-6 flex flex-col gap-4 min-h-[500px]">
        <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Communication</h2>
        <div className="bg-[#f6f7fa] rounded-xl shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">Utilisateurs</div>
          <ul className="space-y-2">
            {users.map((u) => {
              // Unread count for this user
              const chat = chats.find(c => c.participants.length === 2 && c.participants.includes(u.id));
              const unreadCount = chat && messages && chat.id !== activeChat?.id
                ? messages.filter(m => m.chat_id === chat.id && !m.read && m.sender_id === u.id).length
                : 0;
              return (
                <li
                  key={u.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all hover:bg-blue-50 ${activeChat && chat && chat.id === activeChat.id ? 'bg-blue-100' : ''}`}
                  onClick={() => handleSelectUser(u.id)}
                >
                  {u.profile_picture_url ? (
                    <img src={u.profile_picture_url} alt={u.full_name || u.email} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg">
                      {u.full_name ? u.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2) : '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-base truncate">{u.full_name || u.email}</span>
                    <span className="block text-xs text-gray-400">{u.email}</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">{unreadCount}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
      {/* Chat window */}
      <main className="flex-1 flex flex-col justify-between h-full bg-gradient-to-br from-[#f6f7fa] to-[#f8fcff] rounded-xl shadow-md">
        {/* Chat header with user name */}
        <div className="border-b px-8 py-4 bg-white flex items-center gap-3 rounded-t-xl shadow-sm">
          <span className="font-semibold text-lg text-gray-800">
            {activeChat && user && (() => {
              const otherId = activeChat.participants.find(pid => pid !== user.id);
              const otherUser = users.find(u => u.id === otherId);
              return otherUser ? (otherUser.full_name || otherUser.email) : "";
            })()}
          </span>
        </div>
        <div className="flex-1 px-8 py-4 overflow-y-auto flex flex-col gap-2">
          {messages.length === 0 ? (
            <div className="text-gray-400 text-center mt-8">Aucun message pour le moment.</div>
          ) : (
            // Group messages by date
            Object.entries(
              messages.reduce((acc, msg) => {
                const date = new Date(msg.created_at).toLocaleDateString();
                if (!acc[date]) acc[date] = [];
                acc[date].push(msg);
                return acc;
              }, {} as Record<string, typeof messages>)
            ).map(([date, msgs]) => (
              <div key={date}>
                <div className="text-xs text-gray-400 text-center my-2">
                  {(() => {
                    const today = new Date().toLocaleDateString();
                    const yesterday = new Date(
                      Date.now() - 86400000
                    ).toLocaleDateString();
                    if (date === today) return "Aujourd'hui";
                    if (date === yesterday) return "Hier";
                    return date;
                  })()}
                </div>
                {msgs.map((msg) => {
                  const sender = users.find((u) => u.id === msg.sender_id);
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 mb-2 ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                      {msg.sender_id !== user?.id &&
                        (sender?.profile_picture_url ? (
                          <img
                            src={sender.profile_picture_url}
                            alt={sender.full_name || sender.email}
                            className="w-8 h-8 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
                            {sender?.full_name
                              ? sender.full_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)
                              : "?"}
                          </div>
                        ))}
                      <div
                        className={`px-5 py-3 rounded-2xl max-w-lg shadow-sm font-medium text-base relative ${msg.sender_id === user?.id
                            ? "bg-blue-100 text-blue-900"
                            : "bg-gray-100 text-gray-800"
                          }`}>
                        {msg.attachment_url &&
                          (msg.attachment_url.match(
                            /\.(jpg|jpeg|png|gif|webp)$/i
                          ) ? (
                            <img
                              src={msg.attachment_url}
                              alt="attachment"
                              className="mb-2 max-h-48 rounded-xl border border-gray-200"
                            />
                          ) : (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block mb-2 text-blue-500 underline">
                              Fichier joint
                            </a>
                          ))}
                        {msg.content}
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-500">
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {msg.sender_id === user?.id && msg.read && (
                            <span title="Lu" className="ml-2 text-green-400">
                              &#10003;
                            </span>
                          )}
                        </div>
                      </div>
                      {msg.sender_id === user?.id &&
                        (user?.user_metadata?.profile_picture_url ? (
                          <img
                            src={user.user_metadata.profile_picture_url}
                            alt={user.email || ''}
                            className="w-8 h-8 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
                            {user?.user_metadata?.full_name
                              ? user.user_metadata.full_name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)
                              : "?"}
                          </div>
                        ))}
                    </div>
                  );
                })}
              </div>
            ))
          )}
          {otherTyping && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 animate-pulse" />
              <span className="text-xs text-gray-400 italic">L'utilisateur est en train d'écrire…</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Message input */}
        <form onSubmit={sendMessage} className="flex gap-3 px-8 py-4 border-t bg-white rounded-b-xl shadow-sm">
          <label className="flex items-center cursor-pointer mr-2">
            <input
              type="file"
              className="hidden"
              onChange={e => setAttachment(e.target.files?.[0] || null)}
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              disabled={!activeChat || uploading}
            />
            <span className="p-2 rounded-full hover:bg-blue-100 transition">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-3A2.25 2.25 0 008.25 5.25v13.5A2.25 2.25 0 0010.5 21h3a2.25 2.25 0 002.25-2.25V15" />
              </svg>
            </span>
          </label>
          {attachment && (
            <span className="text-xs text-blue-500 font-medium mr-2">{attachment.name}</span>
          )}
          <input
            type="text"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-[#f9f9fb] text-gray-800 placeholder-gray-400"
            placeholder="Écrire un message..."
            value={newMessage}
            onChange={handleTyping}
            disabled={!activeChat || uploading}
            autoComplete="off"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold shadow-md transition disabled:opacity-50"
            disabled={(!newMessage.trim() && !attachment) || !activeChat || uploading}
          >
            {uploading ? 'Envoi…' : 'Envoyer'}
          </button>
        </form>
      </main>
    </div>
  );
}

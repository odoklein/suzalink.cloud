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
  // Message reactions state: { [messageId]: Array<{emoji, users:[{id,full_name,profile_picture_url}]}> }
  const [messageReactions, setMessageReactions] = useState<Record<string, { emoji: string, users: { id: string, full_name: string, profile_picture_url?: string }[] }[]>>({});
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null); // messageId
  const EMOJI_LIST = ['👍', '😂', '❤️', '😮', '🎉', '😢'];
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<{id: string, full_name: string, email: string, profile_picture_url?: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{id: string, full_name: string, profile_picture_url?: string}[]>([]);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user, chats, and messages
  useEffect(() => {
    (async () => {
      setLoadingInitialData(true);
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
        
        // Fetch all messages for unread count calculation
        const { data: allMessagesData } = await supabase
          .from("messages1")
          .select("*")
          .in("chat_id", (chatsData || []).map(c => c.id));
        setAllMessages(allMessagesData || []);
      }
      setLoadingInitialData(false);
    })();
  }, []);

  // Fetch messages for active chat
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      setLoadingMessages(true);
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
          // Update allMessages locally so the badge disappears immediately
          setAllMessages(prev =>
            prev.map(m =>
              unreadIds.includes(m.id) ? { ...m, read: true } : m
            )
          );
        }
      }
      setLoadingMessages(false);
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
          if (!user) return;
          const { userId, full_name, profile_picture_url, typing } = payload.payload;
          setTypingUsers((prev) => {
            if (userId === user.id) return prev; // skip self
            if (typing) {
              // Add if not already present
              if (!prev.some(u => u.id === userId)) {
                return [...prev, { id: userId, full_name, profile_picture_url }];
              }
              return prev;
            } else {
              // Remove if present
              return prev.filter(u => u.id !== userId);
            }
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat, user]);

  // Fetch reactions for messages in active chat
  useEffect(() => {
    if (!activeChat || messages.length === 0) return;
    
    const fetchReactions = async () => {
      const { data: reactionsData } = await supabase
        .from('message_reactions')
        .select('message_id, emoji, user_id, users!message_reactions_user_id_fkey(full_name,profile_picture_url)')
        .in('message_id', messages.map(m => m.id));
      
      // Group by messageId and emoji
      const reactionsByMsg: Record<string, { emoji: string, users: { id: string, full_name: string, profile_picture_url?: string }[] }[]> = {};
      (reactionsData || []).forEach((r: any) => {
        if (!reactionsByMsg[r.message_id]) reactionsByMsg[r.message_id] = [];
        let emojiEntry = reactionsByMsg[r.message_id].find(e => e.emoji === r.emoji);
        if (!emojiEntry) {
          emojiEntry = { emoji: r.emoji, users: [] };
          reactionsByMsg[r.message_id].push(emojiEntry);
        }
        emojiEntry.users.push({ id: r.user_id, full_name: r.users.full_name, profile_picture_url: r.users.profile_picture_url });
      });
      setMessageReactions(reactionsByMsg);
    };
    
    fetchReactions();
  }, [activeChat, messages]);

  // Global subscription for all messages (to handle unread indicators and user list ordering)
  useEffect(() => {
    if (!user) return;
    
    const globalChannel = supabase
      .channel("global-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages1" },
        (payload) => {
          const newMessage = payload.new as Message;
          
          // Only process if this message is for a chat the user participates in
          const relevantChat = chats.find(chat => 
            chat.id === newMessage.chat_id && 
            chat.participants.includes(user.id)
          );
          
          if (relevantChat) {
            // Add to allMessages for unread count calculation
            setAllMessages(prev => [...prev, newMessage]);
            
            // Move this chat to the top of the list by reordering chats
            setChats(prevChats => {
              const otherChats = prevChats.filter(c => c.id !== relevantChat.id);
              return [relevantChat, ...otherChats];
            });
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [user, chats, activeChat]);

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
        payload: {
          chat_id: activeChat.id,
          userId: user.id,
          full_name: user.user_metadata?.full_name || user.email,
          profile_picture_url: user.user_metadata?.profile_picture_url || null,
          typing: true
        }
      });
      setTimeout(() => {
        setIsTyping(false);
        supabase.channel('typing-indicator').send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            chat_id: activeChat.id,
            userId: user.id,
            full_name: user.user_metadata?.full_name || user.email,
            profile_picture_url: user.user_metadata?.profile_picture_url || null,
            typing: false
          }
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

  // Reaction handler
  const handleReact = async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = messageReactions[messageId]?.find(e => e.emoji === emoji && e.users.some(u => u.id === user.id));
    if (existing) {
      // Remove reaction
      await supabase.from('message_reactions').delete().match({ message_id: messageId, user_id: user.id, emoji });
    } else {
      // Add reaction
      await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
    }
    // Refetch reactions for this message
    const { data: reactionsData } = await supabase
      .from('message_reactions')
      .select('message_id, emoji, user_id, users!message_reactions_user_id_fkey(full_name,profile_picture_url)')
      .eq('message_id', messageId);
    const reactionsByMsg: Record<string, { emoji: string, users: { id: string, full_name: string, profile_picture_url?: string }[] }[]> = {};
    (reactionsData || []).forEach((r: any) => {
      if (!reactionsByMsg[r.message_id]) reactionsByMsg[r.message_id] = [];
      let emojiEntry = reactionsByMsg[r.message_id].find(e => e.emoji === r.emoji);
      if (!emojiEntry) {
        emojiEntry = { emoji: r.emoji, users: [] };
        reactionsByMsg[r.message_id].push(emojiEntry);
      }
      emojiEntry.users.push({ id: r.user_id, full_name: r.users.full_name, profile_picture_url: r.users.profile_picture_url });
    });
    setMessageReactions(prev => ({ ...prev, ...reactionsByMsg }));
  };

  // Listen for realtime reaction changes
  useEffect(() => {
    if (!activeChat) return;
    const channel = supabase.channel('message-reactions').on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'message_reactions' },
      payload => {
        // Refetch all reactions for current messages
        if (messages.length > 0) {
          (async () => {
            const { data: reactionsData } = await supabase
              .from('message_reactions')
              .select('message_id, emoji, user_id, users!message_reactions_user_id_fkey(full_name,profile_picture_url)')
              .in('message_id', messages.map(m => m.id));
            const reactionsByMsg: Record<string, { emoji: string, users: { id: string, full_name: string, profile_picture_url?: string }[] }[]> = {};
            (reactionsData || []).forEach((r: any) => {
              if (!reactionsByMsg[r.message_id]) reactionsByMsg[r.message_id] = [];
              let emojiEntry = reactionsByMsg[r.message_id].find(e => e.emoji === r.emoji);
              if (!emojiEntry) {
                emojiEntry = { emoji: r.emoji, users: [] };
                reactionsByMsg[r.message_id].push(emojiEntry);
              }
              emojiEntry.users.push({ id: r.user_id, full_name: r.users.full_name, profile_picture_url: r.users.profile_picture_url });
            });
            setMessageReactions(reactionsByMsg);
          })();
        }
      }
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChat, messages]);

  return (
    <div className="flex flex-col md:flex-row h-full w-full max-h-[90vh] rounded-2xl overflow-hidden bg-[#F9F9FB] shadow-lg border border-gray-200">
      {/* Users list */}
      <aside className="w-full md:w-1/4 bg-white border-r border-gray-200 p-6 flex flex-col gap-4 min-h-[500px]">
        <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Communication</h2>
        <div className="bg-[#f6f7fa] rounded-xl shadow-sm p-4">
  <div className="text-sm font-semibold text-gray-700 mb-3">Chats</div>
  <ul className="space-y-2">
    {loadingInitialData ? (
      [...Array(5)].map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-1/2 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          </div>
          <div className="h-4 w-10 rounded bg-gray-200 animate-pulse" />
        </li>
      ))
    ) : (
      chats.map((chat) => {
        const otherId = chat.participants.find(pid => pid !== user?.id);
        const otherUser = users.find(u => u.id === otherId);
        const chatMessages = allMessages.filter(m => m.chat_id === chat.id);
        const lastMessage = chatMessages.length > 0 ? chatMessages.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b) : null;
        const isTyping = typingUsers.some(u => u.id === otherId);
        const unreadCount = chat.id !== activeChat?.id ? chatMessages.filter(m => !m.read && m.sender_id === otherId).length : 0;
        return (
          <li
            key={chat.id}
            className={`flex items-center gap-3 px-3 py-4 rounded-xl cursor-pointer transition-all hover:bg-blue-50 ${activeChat && chat.id === activeChat.id ? 'bg-blue-100' : ''}`}
            onClick={() => setActiveChat(chat)}
          >
            {otherUser?.profile_picture_url ? (
              <img src={otherUser.profile_picture_url} alt={otherUser.full_name || '?'} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg">
                {otherUser?.full_name ? otherUser.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2) : '?'}
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base truncate">{otherUser?.full_name || '?'}</span>
                <span className="text-xs text-gray-400 ml-2">
                  {lastMessage ? new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-500 min-h-[20px]">
                {isTyping ? (
                  <span className="text-blue-500 font-medium">Typing...</span>
                ) : lastMessage ? (
                  lastMessage.attachment_url ? (
                    <span className="italic text-gray-400">📎 Attachment</span>
                  ) : (
                    <span className="truncate">{lastMessage.content}</span>
                  )
                ) : (
                  <span className="italic text-gray-300">No messages yet</span>
                )}
                {lastMessage && lastMessage.sender_id === user?.id && (
                  <span className="ml-2">
                    {lastMessage.read ? (
                      <svg className="inline w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="inline w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    )}
                  </span>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-bold min-w-[20px] text-center">{unreadCount}</span>
            )}
          </li>
        );
      })
    )}
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
          {loadingMessages ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />}
                  <div className={`px-5 py-3 rounded-2xl max-w-lg shadow-sm ${i % 2 === 0 ? 'bg-gray-200' : 'bg-blue-200'} animate-pulse`}>
                    <div className="h-4 bg-gray-300 rounded w-48 mb-1"></div>
                    <div className="h-3 bg-gray-300 rounded w-32"></div>
                  </div>
                  {i % 2 !== 0 && <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />}
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
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
                      className={`flex items-end gap-2 mb-2 ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                      onMouseLeave={() => setShowEmojiPickerFor(null)}
                    >
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
                        className={`group px-5 py-3 rounded-2xl max-w-lg shadow-sm font-medium text-base relative ${msg.sender_id === user?.id
                            ? "bg-blue-100 text-blue-900"
                            : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {/* Emoji button on hover */}
                        <button
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity bg-white rounded-full shadow px-1 py-0.5 text-lg hover:bg-gray-50"
                          style={{ zIndex: 2 }}
                          onClick={e => { e.stopPropagation(); setShowEmojiPickerFor(msg.id === showEmojiPickerFor ? null : msg.id); }}
                          title="Réagir"
                        >
                          😊
                        </button>
                        {/* Emoji Picker */}
                        {showEmojiPickerFor === msg.id && (
                          <div className="absolute z-10 top-8 right-1 bg-white border rounded-xl shadow px-2 py-1 flex gap-1">
                            {EMOJI_LIST.map(emoji => (
                              <button
                                key={emoji}
                                className="text-xl hover:scale-125 transition-transform"
                                onClick={e => { e.stopPropagation(); handleReact(msg.id, emoji); setShowEmojiPickerFor(null); }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
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
                        {/* Reactions row */}
                            {messageReactions[msg.id] && (
                              <div className="flex gap-1 mt-1">
                                {messageReactions[msg.id].map(r => (
                                  <button
                                    key={r.emoji}
                                    className={`flex items-center px-2 py-0.5 rounded-full text-base border bg-white shadow-sm hover:bg-gray-50 ${r.users.some(u => u.id === user?.id) ? 'border-blue-400' : 'border-gray-200'}`}
                                    onClick={e => { e.stopPropagation(); handleReact(msg.id, r.emoji); }}
                                    title={r.users.map(u => u.full_name).join(', ')}
                                  >
                                    <span>{r.emoji}</span>
                                    <span className="ml-1 text-xs font-semibold">{r.users.length}</span>
                                  </button>
                                ))}
                              </div>
                            )}
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
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 px-8 pb-2">
              {typingUsers.map(u => (
                <div key={u.id} className="flex items-center gap-1">
                  {u.profile_picture_url ? (
                    <img src={u.profile_picture_url} alt={u.full_name} className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs text-blue-700 font-bold">
                      {u.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || '?'}
                    </div>
                  )}
                  <span className="text-xs text-gray-600 font-medium">{u.full_name?.split(' ')[0] || 'User'}</span>
                </div>
              ))}
              <span className="text-xs text-gray-500 font-medium ml-2 flex items-center">
                is typing
                <span className="ml-1 flex space-x-0.5">
                  <span className="animate-bounce inline-block w-1 h-1 bg-gray-400 rounded-full" style={{animationDelay: '0ms'}}></span>
                  <span className="animate-bounce inline-block w-1 h-1 bg-gray-400 rounded-full" style={{animationDelay: '100ms'}}></span>
                  <span className="animate-bounce inline-block w-1 h-1 bg-gray-400 rounded-full" style={{animationDelay: '200ms'}}></span>
                </span>
              </span>
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

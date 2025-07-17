"use client";
import { useState, useEffect, useRef } from "react";
import { Paperclip, Send, Mic, Smile, Video, Phone, MoreVertical } from "lucide-react";

// Pour la gestion audio
import { useRef as useReactRef2 } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { useRef as useReactRef } from "react";

export default function ChatPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [chatDetails, setChatDetails] = useState<Record<string, any>>({}); // infos participants et last message
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useReactRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
const [fileError, setFileError] = useState<string | null>(null);
const [isRecording, setIsRecording] = useState(false);
const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
const mediaRecorderRef = useReactRef2<MediaRecorder | null>(null);
const [recordingError, setRecordingError] = useState<string | null>(null);

  // Fetch chats + participants + last message
  useEffect(() => {
    if (!user) return;
    const fetchChats = async () => {
      setLoadingChats(true);
      const { data: participantRows } = await supabase
        .from("chat_participants")
        .select("chat_id")
        .eq("user_id", user.id);
      const chatIds = participantRows?.map((row: { chat_id: string }) => row.chat_id) || [];
      if (chatIds.length === 0) {
        setChats([]);
        setChatDetails({});
        setLoadingChats(false);
        return;
      }
      const { data: chatsList } = await supabase
        .from("chats")
        .select("*")
        .in("id", chatIds)
        .order("created_at", { ascending: false });
      setChats(chatsList || []);
      // Pour chaque chat, fetch participants et last message
      const details: Record<string, any> = {};
      await Promise.all((chatsList || []).map(async (chat: any) => {
        // Participants
        const { data: participants } = await supabase
          .from("chat_participants")
          .select("user_id, users(full_name, email)")
          .eq("chat_id", chat.id);
        // Last message
        const { data: lastMsg } = await supabase
          .from("chat_messages")
          .select("content, sent_at, sender_id")
          .eq("chat_id", chat.id)
          .order("sent_at", { ascending: false })
          .limit(1)
          .single();
        // Nom du projet si chat de type project
        let projectTitle = null;
        if (chat.type === "project" && chat.project_id) {
          const { data: project } = await supabase
            .from("projects")
            .select("title")
            .eq("id", chat.project_id)
            .single();
          projectTitle = project?.title || null;
        }
        details[chat.id] = {
          participants: participants || [],
          lastMsg: lastMsg || null,
          projectTitle,
        };
      }));
      setChatDetails(details);
      // Trie les chats par date du dernier message (plus récent en haut)
      const sortedChats = [...(chatsList || [])].sort((a, b) => {
        const aDate = details[a.id]?.lastMsg?.sent_at || a.created_at;
        const bDate = details[b.id]?.lastMsg?.sent_at || b.created_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
      setChats(sortedChats);
      setLoadingChats(false);
    };
    fetchChats();
  }, [user]);

  // Fonction utilitaire pour rafraîchir les détails d'un chat (participants + last message)
  const refreshChatDetails = async (chatId: string) => {
    // Participants
    const { data: participants } = await supabase
      .from("chat_participants")
      .select("user_id, users(full_name, email)")
      .eq("chat_id", chatId);
    // Last message
    const { data: lastMsg } = await supabase
      .from("chat_messages")
      .select("content, sent_at, sender_id")
      .eq("chat_id", chatId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .single();
    setChatDetails((prev) => ({
      ...prev,
      [chatId]: {
        participants: participants || [],
        lastMsg: lastMsg || null,
      },
    }));
    // Trie la liste des chats après update
    setChats((prev) => {
      const sorted = [...prev].sort((a, b) => {
        const aDate = (chatId === a.id ? lastMsg?.sent_at : chatDetails[a.id]?.lastMsg?.sent_at) || a.created_at;
        const bDate = (chatId === b.id ? lastMsg?.sent_at : chatDetails[b.id]?.lastMsg?.sent_at) || b.created_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
      return sorted;
    });
  };

  // Abonnement global realtime sur tous les chats de l'utilisateur
  useEffect(() => {
    if (!user || chats.length === 0) return;
    const chatIds = chats.map((c) => c.id);
    const channel = supabase
      .channel(`all-user-chats-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          if (payload.new && chatIds.includes(payload.new.chat_id)) {
            refreshChatDetails(payload.new.chat_id);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, chats]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChat || !user) return;
    const fetchMessages = async () => {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", selectedChat.id)
        .order("sent_at", { ascending: true });
      setMessages(data || []);
      setLoadingMessages(false);
      // Remonter le chat sélectionné en haut de la liste
      setChats((prev) => {
        if (!selectedChat) return prev;
        const idx = prev.findIndex((c) => c.id === selectedChat.id);
        if (idx === -1) return prev;
        const reordered = [prev[idx], ...prev.slice(0, idx), ...prev.slice(idx + 1)];
        return reordered;
      });
    };
    fetchMessages();
    // Realtime subscription
    const channel = supabase
      .channel(`chat-messages-${selectedChat.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${selectedChat.id}` },
        (payload) => {
          setMessages((prev) => {
            // Ajoute le message s'il n'existe pas déjà
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          // Remonter le chat sélectionné en haut de la liste
          setChats((prev) => {
            if (!selectedChat) return prev;
            const idx = prev.findIndex((c) => c.id === selectedChat.id);
            if (idx === -1) return prev;
            const reordered = [prev[idx], ...prev.slice(0, idx), ...prev.slice(idx + 1)];
            return reordered;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat, user]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Quand un message est envoyé ou reçu, remonte le chat en haut
  const moveChatToTop = (chatId: string) => {
    setChats((prev) => {
      const idx = prev.findIndex((c) => c.id === chatId);
      if (idx === -1) return prev;
      const reordered = [prev[idx], ...prev.slice(0, idx), ...prev.slice(idx + 1)];
      return reordered;
    });
  };

  // Send message
  const handleSend = async (e: any) => {
    e.preventDefault();
    setFileError(null);
    if (!selectedChat) {
      toast("Merci de sélectionner une discussion avant d'envoyer un message ou un fichier.");
      return;
    }
    if (!user) {
      toast("Vous devez être connecté pour envoyer un message.");
      return;
    }
    if (!message.trim() && !file && !recordedAudio) return;
    let file_url = null;
    let isAudioMessage = false;
    if (file) {
      // Vérification côté JS (déjà faite sur input, mais sécurité)
      if (file.size > 10 * 1024 * 1024) {
        setFileError("Fichier trop volumineux (max 10 Mo)");
        setFile(null);
        return;
      }
      const allowed = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip', 'application/x-zip-compressed',
        'audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg'
      ];
      if (!allowed.includes(file.type)) {
        setFileError("Type de fichier non autorisé (image, PDF, Word, Excel, Zip, audio)");
        setFile(null);
        return;
      }
      // Upload du fichier sur Supabase Storage
      const filePath = `${selectedChat.id}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("chat-files")
        .upload(filePath, file);
      if (error) {
        setFileError("Échec de l'envoi du fichier : " + error.message);
        setFile(null);
        return;
      }
      file_url = data?.path;
      if (file.type.startsWith('audio/')) isAudioMessage = true;
    }
    const { error: insertError } = await supabase.from("chat_messages").insert({
      chat_id: selectedChat.id,
      sender_id: user.id,
      content: isAudioMessage ? '[Message vocal]' : message,
      file_url,
    });
    if (insertError) {
      setFileError("Erreur lors de l'envoi du message : " + insertError.message);
      toast("Erreur lors de l'envoi du message : " + insertError.message + (file_url ? ` (fichier : ${file_url})` : ""));
      console.error("Erreur insertion message:", insertError);
      return;
    }
    if (file_url) {
      toast("Fichier envoyé avec succès ! (" + file_url + ")");
    }
    setMessage("");
    setFile(null);
    setRecordedAudio(null);
    setIsRecording(false);
    moveChatToTop(selectedChat.id);
    // Le realtime s'occupe d'ajouter le message
  };


  // Boutons appel/vidéo
  const handleFeatureComing = () => {
    toast("Fonctionnalité à venir !");
  };

  // Helper pour avatar/initiales
  function getAvatar(name: string | null | undefined, email: string | null | undefined) {
    const initials = name
      ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : (email ? email[0].toUpperCase() : "?");
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 text-xs border-2 border-white">
        {initials}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-32px)] bg-[#f7f8fa]">
      {/* Sidebar */}
      <aside className="w-80 min-w-[280px] bg-white border-r border-gray-100 flex flex-col p-6 rounded-3xl m-4 ml-0 shadow-sm">
        <h2 className="text-2xl font-bold mb-6">Discussions</h2>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
          />
        </div>
        <div className="flex-1 overflow-y-auto pr-2">
          {loadingChats ? (
            <div className="text-center text-gray-400 mt-8">Chargement...</div>
          ) : chats.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">Aucune discussion</div>
          ) : (
            chats.map((chat) => {
              const details = chatDetails[chat.id] || {};
              let displayName = "";
              if (chat.type === "private" && details.participants && user) {
                // DEBUG: log participants
                // console.log('participants', details.participants);
                const other = details.participants.find((p: any) => p.user_id !== user.id);
                displayName = (other?.users?.full_name && other?.users?.full_name.trim())
                  ? other.users.full_name
                  : (other?.users?.email || "Private chat");
              } else if (chat.type === "project" && details.projectTitle) {
                displayName = details.projectTitle;
              } else if (chat.type === "group" && chat.name) {
                displayName = chat.name;
              } else if (chat.type === "group") {
                displayName = "Group chat";
              }
              const lastMsg = details.lastMsg;
              return (
                <div
                  key={chat.id}
                  className={`flex flex-col gap-1 p-3 rounded-2xl cursor-pointer mb-2 transition-all hover:bg-blue-50 ${selectedChat?.id === chat.id ? "bg-blue-50" : ""}`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-lg">
                      {displayName ? displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2) : "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-base truncate">{displayName}</span>
                      {lastMsg && (
                        <span className="text-xs text-gray-400 ml-2 whitespace-nowrap float-right">{lastMsg.sent_at?.slice(11, 16)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 truncate flex items-center gap-1 pl-14">
                    {lastMsg ? lastMsg.content : <span className="italic text-gray-300">Aucun message</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-white rounded-3xl m-4 ml-0 shadow-xl overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-lg">
              {(() => {
                if (!selectedChat || !chatDetails[selectedChat.id]) return "";
                const details = chatDetails[selectedChat.id];
                if (selectedChat.type === "private" && details.participants && user) {
                  const other = details.participants.find((p: any) => p.user_id !== user.id);
                  return getAvatar(other?.users?.full_name, other?.users?.email);
                } else if (selectedChat.type === "project" && details.projectTitle) {
                  return details.projectTitle.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0,2);
                } else if (selectedChat.type === "group" && selectedChat.name) {
                  return selectedChat.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0,2);
                } else if (selectedChat.type === "group") {
                  return "G";
                }
                return "?";
              })()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg truncate">
                  {(() => {
                    if (!selectedChat || !chatDetails[selectedChat.id]) return "";
                    const details = chatDetails[selectedChat.id];
                    if (selectedChat.type === "private" && details.participants && user) {
                      const other = details.participants.find((p: any) => p.user_id !== user.id);
                      return (other?.users?.full_name && other?.users?.full_name.trim())
                        ? other.users.full_name
                        : (other?.users?.email || "Private chat");
                    } else if (selectedChat.type === "project" && details.projectTitle) {
                      return details.projectTitle;
                    } else if (selectedChat.type === "group" && selectedChat.name) {
                      return selectedChat.name;
                    } else if (selectedChat.type === "group") {
                      return "Group chat";
                    }
                    return "";
                  })()}
                </span>
              </div>
              {/* Affichage des participants pour groupes/projets */}
              {selectedChat && chatDetails[selectedChat.id] && (selectedChat.type === "group" || selectedChat.type === "project") && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {chatDetails[selectedChat.id].participants?.map((p: any) => (
                    <div key={p.user_id} className="flex items-center gap-1">
                      {getAvatar(p.users?.full_name, p.users?.email)}
                      <span className="text-xs text-gray-500 truncate max-w-[80px]">{p.users?.full_name || p.users?.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <button onClick={handleFeatureComing}><Phone className="w-5 h-5 cursor-pointer hover:text-blue-500" /></button>
            <button onClick={handleFeatureComing}><Video className="w-5 h-5 cursor-pointer hover:text-blue-500" /></button>
            <MoreVertical className="w-5 h-5 cursor-pointer hover:text-blue-500" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 bg-[#f7f8fa]">
          {loadingMessages ? (
            <div className="text-center text-gray-400">Chargement des messages...</div>
          ) : !selectedChat ? (
            <div className="text-center text-gray-400">Sélectionnez une discussion</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400">Aucun message</div>
          ) : (
            messages.map((msg) => {
              const fileUrl = msg.file_url ? supabase.storage.from("chat-files").getPublicUrl(msg.file_url).data.publicUrl : null;
              const isImage = fileUrl && (/\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl) || (msg.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.file_url)));
              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                >
                  {msg.sender_id !== user?.id && (
                    <div className="w-10 h-10 rounded-full bg-gray-200 mr-3" />
                  )}
                  <div className={`max-w-lg ${msg.sender_id === user?.id ? "bg-blue-500 text-white rounded-2xl rounded-br-sm" : "bg-white text-gray-900 rounded-2xl rounded-bl-sm border border-gray-100"} px-6 py-4 shadow-sm flex flex-col gap-2`}>
                    <span className="text-base break-words whitespace-pre-line">{msg.content}</span>
                    {fileUrl && (
                      isImage ? (
                        <img src={fileUrl} alt="attachment" className="rounded-xl max-w-xs mt-2" />
                      ) : (msg.file_url && msg.file_url.match(/\.(webm|wav|mp3|ogg)$/i)) ? (
                        <audio controls src={fileUrl} className="rounded-xl mt-2 max-w-xs" />
                      ) : (
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-2 text-blue-200 block">Télécharger le fichier</a>
                      )
                    )}
                    <span className="text-xs text-gray-400 mt-1 self-end">{msg.sent_at?.slice(11, 16)}</span>
                  </div>
                  {msg.sender_id === user?.id && (
                    <div className="w-10 h-10 rounded-full bg-gray-200 ml-3" />
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          className="flex items-center gap-3 px-8 py-6 border-t border-gray-100 bg-white"
          onSubmit={handleSend}
        >
          {/* Input file caché */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
            onChange={e => {
              setFileError(null);
              const f = e.target.files?.[0] || null;
              if (f) {
                if (f.size > 10 * 1024 * 1024) {
                  setFileError("Fichier trop volumineux (max 10 Mo)");
                  setFile(null);
                  return;
                }
                const allowed = [
                  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                  'application/pdf',
                  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  'application/zip', 'application/x-zip-compressed'
                ];
                if (!allowed.includes(f.type)) {
                  setFileError("Type de fichier non autorisé (image, PDF, doc, xls, zip)");
                  setFile(null);
                  return;
                }
                setFile(f);
              } else {
                setFile(null);
              }
            }}
          />
          <button
            type="button"
            className="p-2 rounded-full hover:bg-blue-50"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-5 h-5 text-gray-400" />
          </button>
          <button
            type="button"
            className={`p-2 rounded-full hover:bg-blue-50 ${isRecording ? 'bg-red-100' : ''}`}
            onClick={async () => {
              setRecordingError(null);
              if (isRecording) {
                // Stop recording
                mediaRecorderRef.current?.stop();
                setIsRecording(false);
              } else {
                // Start recording
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                  const mediaRecorder = new window.MediaRecorder(stream, {
                    mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined,
                  });
                  mediaRecorderRef.current = mediaRecorder;
                  const chunks: BlobPart[] = [];
                  mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                  };
                  mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    setRecordedAudio(blob);
                    setFile(new File([blob], `message-vocal-${Date.now()}.webm`, { type: 'audio/webm' }));
                  };
                  mediaRecorder.onerror = (e) => {
                    setRecordingError('Erreur lors de l’enregistrement audio');
                  };
                  mediaRecorder.start();
                  setIsRecording(true);
                } catch (err: any) {
                  setRecordingError("Micro non disponible ou refusé");
                  setIsRecording(false);
                }
              }
            }}
            disabled={!!file || !!recordedAudio || !!fileError}
            aria-label={isRecording ? "Arrêter l'enregistrement" : "Enregistrer un message vocal"}
          >
            <Mic className={`w-5 h-5 ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
          </button>
          <input
            type="text"
            placeholder="Écrire un message"
            className="flex-1 px-5 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 text-base"
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={!selectedChat}
          />
          <button type="button" className="p-2 rounded-full hover:bg-blue-50">
            <Smile className="w-5 h-5 text-gray-400" />
          </button>
          <button type="submit" className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center" disabled={!selectedChat || (!message.trim() && !file && !recordedAudio) || !!fileError || isRecording}>
            <Send className="w-5 h-5" />
          </button>
          {/* Afficher le nom du fichier sélectionné (optionnel) */}
          {file && (
            <span className="text-xs text-gray-500 truncate max-w-[120px]">{file.name}</span>
          )}
          {recordingError && (
            <span className="text-xs text-red-500 ml-2">{recordingError}</span>
          )}
          {isRecording && (
            <span className="text-xs text-red-500 ml-2 animate-pulse">Enregistrement en cours...</span>
          )}
          {recordedAudio && !file && (
            <span className="text-xs text-green-600 ml-2">Message vocal prêt à envoyer</span>
          )}
          {recordedAudio && file && (
            <audio controls src={URL.createObjectURL(recordedAudio)} className="ml-2 max-w-[120px] align-middle" />
          )}
          {fileError && (
            <span className="text-xs text-red-500 ml-2">{fileError}</span>
          )}
        </form>
      </main>
    </div>
  );
} 
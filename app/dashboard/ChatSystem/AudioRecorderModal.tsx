"use client";
import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

interface AudioRecorderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  activeChat: any;
  supabase: any;
  onSendAudio?: (audioBlob: Blob) => Promise<void>;
}

export default function AudioRecorderModal({ open, onOpenChange, user, activeChat, supabase }: AudioRecorderModalProps) {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<BlobPart[]>([]);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [audioPreview, setAudioPreview] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [uploading, setUploading] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) {
      setRecording(false);
      setMediaRecorder(null);
      setAudioChunks([]);
      setAudioPreview(null);
      setError(null);
      setRecordingSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [open]);

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Audio recording not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);
      audioChunksRef.current = [];
      setRecordingSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
      recorder.ondataavailable = (e) => {
        setAudioChunks((prev) => {
          const updated = [...prev, e.data];
          audioChunksRef.current = updated;
          return updated;
        });
      };
      recorder.onstop = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        const blobParts = audioChunksRef.current.length > 0 ? audioChunksRef.current : audioChunks;
        const audioBlob = new Blob(blobParts, { type: "audio/webm" });
        if (audioBlob.size > 0) {
          setAudioPreview(audioBlob);
        }
        setMediaRecorder(null);
        setAudioChunks([]);
        audioChunksRef.current = [];
        setRecordingSeconds(0);
      };
      recorder.start();
      setRecording(true);
    } catch (err: any) {
      setError('Could not access microphone: ' + (err?.message || err));
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSend = async () => {
    if (!audioPreview || !user || !activeChat) {
      setError('No audio to send or missing user/chat context.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fileExt = 'webm';
      const filePath = `chat-attachments/${activeChat.id}/${Date.now()}.${fileExt}`;
      console.log('Uploading audio to:', filePath);
      const { data, error: uploadError } = await supabase.storage.from('attachments').upload(filePath, audioPreview);
      let fileUrl = null;
      if (!uploadError && data) {
        fileUrl = supabase.storage.from('attachments').getPublicUrl(filePath).data.publicUrl;
        console.log('Audio uploaded. Public URL:', fileUrl);
      }
      if (fileUrl) {
        const { error: insertError } = await supabase.from("messages1").insert({
          chat_id: activeChat.id,
          sender_id: user.id,
          content: '',
          read: false,
          attachment_url: fileUrl
        });
        if (insertError) {
          setError('Failed to insert message: ' + insertError.message);
          console.error('Insert error:', insertError);
        } else {
          setUploading(false);
          onOpenChange(false);
        }
      } else if (uploadError) {
        setError('Audio upload failed: ' + uploadError.message);
        console.error('Upload error:', uploadError);
        setUploading(false);
      }
    } catch (err: any) {
      setError('Audio upload failed: ' + (err?.message || err));
      console.error('Caught error in handleSend:', err);
      setUploading(false);
    }
  };


  const handleCancel = () => {
    setAudioPreview(null);
    setRecording(false);
    setMediaRecorder(null);
    setAudioChunks([]);
    setError(null);
    setRecordingSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Voice Note</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {!recording && !audioPreview && (
            <button
              className="rounded-full bg-gray-200 hover:bg-gray-300 p-4"
              onClick={handleStartRecording}
              aria-label="Start recording"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-700">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="#fff" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 0v4m0-4h0" />
                <rect x="10" y="8" width="4" height="8" rx="2" fill="#e11d48" />
              </svg>
            </button>
          )}
          {recording && (
            <div className="flex flex-row items-center justify-between w-full gap-2">
              <button
                className="rounded-full bg-gray-200 hover:bg-red-200 p-3 animate-pulse transition-transform duration-200 hover:scale-110"
                onClick={handleCancel}
                aria-label="Cancel recording"
                type="button"
              >
                <span role="img" aria-label="cancel">❌</span>
              </button>
              <div className="flex flex-col items-center flex-1">
                <span className="text-red-600 font-semibold text-lg flex items-center gap-2">
                  <span role="img" aria-label="record">⏺️</span> Recording... {`${String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:${String(recordingSeconds % 60).padStart(2, '0')}`}
                </span>
              </div>
              <button
                className="rounded-full bg-green-500 text-white p-3 hover:bg-green-600 transition"
                onClick={handleStopRecording}
                aria-label="Finish recording"
                type="button"
                disabled={recordingSeconds < 1}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5v14" />
                </svg>
              </button>
            </div>
          )}
          {audioPreview && (
            <div className="w-full flex flex-col items-center gap-2">
              <audio ref={audioRef} controls src={URL.createObjectURL(audioPreview)} className="w-full" />
              <div className="flex gap-2 mt-2">
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-60"
                  onClick={handleSend}
                  type="button"
                  disabled={uploading}
                >{uploading ? 'Sending…' : 'Send'}</button>
                <button
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  onClick={handleCancel}
                  type="button"
                >Cancel</button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <button className="text-gray-500 hover:text-gray-700 text-sm" type="button">Close</button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

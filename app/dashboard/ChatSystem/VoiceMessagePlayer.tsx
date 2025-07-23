import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface VoiceMessagePlayerProps {
  url: string;
}

export default function VoiceMessagePlayer({ url }: VoiceMessagePlayerProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (waveformRef.current && url) {
      const ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#222",
        progressColor: "#222",
        barWidth: 3,
        height: 48,
        cursorWidth: 0,
        barRadius: 2,
        interact: true,
        normalize: true,
      });
      ws.load(url);
      ws.on("finish", () => setIsPlaying(false));
      ws.on("play", () => setIsPlaying(true));
      ws.on("pause", () => setIsPlaying(false));
      setWavesurfer(ws);
      return () => ws.destroy();
    }
  }, [url]);

  const handlePlayPause = () => {
    if (wavesurfer) {
      wavesurfer.playPause();
    }
  };

  return (
    <div className="flex items-center bg-gray-100 rounded-xl px-3 py-2">
      <button
        className="mr-2 focus:outline-none"
        onClick={handlePlayPause}
        aria-label={isPlaying ? "Pause" : "Play"}
        type="button"
      >
        {isPlaying ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2"><rect x="6" y="5" width="4" height="14" rx="2" fill="#222" /><rect x="14" y="5" width="4" height="14" rx="2" fill="#222" /></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2"><polygon points="6,4 20,12 6,20 6,4" fill="#222" /></svg>
        )}
      </button>
      <div ref={waveformRef} className="flex-1 min-w-[80px]" />
    </div>
  );
}

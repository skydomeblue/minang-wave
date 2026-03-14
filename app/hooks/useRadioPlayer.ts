"use client";

import { useRef, useState } from "react";

export function useRadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [volume, setVolume] = useState(0.7);

  const MAX_RETRY = 5;

  const loadStream = (url: string, autoplay = false) => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    audio.pause();
    audio.currentTime = 0;

    setError("");
    setRetry(0);
    setIsLoading(true);

    audio.src = url + "?t=" + Date.now();
    audio.load();

    if (autoplay) {
      play();
    }
  };

  const play = () => {
    if (!audioRef.current) return;

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => reconnect());
  };

  const pause = () => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setIsPlaying(false);
  };

  const reconnect = () => {
    if (!audioRef.current) return;

    if (retry >= MAX_RETRY) {
      setError("Stream tidak tersedia");
      setIsLoading(false);
      setIsPlaying(false);
      return;
    }

    setRetry((r) => r + 1);

    setTimeout(() => {
      audioRef.current?.play().catch(() => reconnect());
    }, 3000);
  };

  const changeVolume = (v: number) => {
    setVolume(v);

    if (audioRef.current) {
      audioRef.current.volume = v;
    }
  };

  return {
    audioRef,
    isPlaying,
    isLoading,
    error,
    retry,
    volume,
    play,
    pause,
    reconnect,
    loadStream,
    changeVolume,
  };
}

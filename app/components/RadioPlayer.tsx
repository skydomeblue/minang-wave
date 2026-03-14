"use client";

import { useEffect, useRef, useState } from "react";
import { stations } from "../data/stations";

type Station = {
  id: number;
  name: string;
  logo: string;
  stream: string;
};

export default function RadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentStation, setCurrentStation] = useState<Station>(stations[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const MAX_RETRY = 5;

  // load pertama
  useEffect(() => {
    loadStation(currentStation, false);
  }, []);

  // volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // cleanup
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const loadStation = (station: Station, autoplay = false) => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    audio.pause();
    audio.currentTime = 0;

    setError("");
    setRetry(0);
    setIsLoading(true);

    audio.src = station.stream + "?t=" + Date.now();
    audio.load();

    if (autoplay) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => reconnect());
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);

      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => reconnect());
    }
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

  const changeStation = (station: Station) => {
    const autoplay = isPlaying;

    setCurrentStation(station);
    loadStation(station, autoplay);
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  return (
    <div className="min-h-screen justify-between bg-[#f5f5f4] text-gray-800 flex flex-col items-center p-5">
      <audio
        ref={audioRef}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setError("");
        }}
        onError={() => reconnect()}
        onStalled={() => reconnect()}
      />

      {/* STATION LIST */}

      <div className="gap-3 mb-2 max-w-lg flex flex-col w-full">
        <span className="text-sm">Station List</span>
        {stations.map((station) => {
          const isActive = station.id === currentStation.id;
          return (
            <button
              key={station.id}
              onClick={() => changeStation(station)}
              className={`p-3 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-all duration-300
                ${isActive ? "bg-green-500 text-white" : "bg-white hover:scale-[102%]"}`}
            >
              <div className="flex items-center">
                <img src={`/img/${station.logo}`} className="w-8 h-8 rounded" />
                <span className="text-sm flex-1 ml-3">{station.name}</span>
              </div>

              {isActive && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  <span className="text-xs">NOW</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* PLAYER */}

      <div className="bg-white w-full max-w-lg p-3 rounded-full flex flex-col gap-2 border border-[#e7e5e4]">
        <div className="flex items-center h-full ">
          <img
            src={`/img/${currentStation.logo}`}
            className="w-12 h-12 mx-auto rounded-lg"
          />

          <div className="w-full px-4 flex flex-col transition-all duration-800">
            <span className="font-bold">{currentStation.name}</span>

            <div className="flex gap-2 items-center">
              {isPlaying &&
                (isLoading ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-yellow-600 animate-pulse" />
                    <span className="text-sm text-yellow-600">
                      Buffering...
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[13px]">Live Broadcast</span>
                  </>
                ))}

              {error && <p className="text-red-400 text-sm">{error}</p>}

              {retry > 0 && retry < MAX_RETRY && (
                <p className="text-orange-400 text-sm">
                  Reconnecting ({retry}/{MAX_RETRY})
                </p>
              )}
            </div>
          </div>

          <button
            onClick={togglePlay}
            className={` cursor-pointer p-6 text-white rounded-full relative flex items-center justify-center bg-[#F94864]`}
          >
            {/* PLAY */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`size-6 absolute transition-all duration-300 ${isPlaying ? "opacity-0 scale-75" : "opacity-100 scale-100"}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
              />
            </svg>

            {/* PAUSE */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`size-6 absolute transition-all duration-300 
                ${isPlaying ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 5.25v13.5m-7.5-13.5v13.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

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

  const [stationStatus, setStationStatus] = useState<Record<number, boolean>>(
    {},
  );

  const MAX_RETRY = 5;

  const retryRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // cek stream station
  const checkStations = async () => {
    const results: Record<number, boolean> = {};

    await Promise.all(
      stations.map(
        (station) =>
          new Promise<void>((resolve) => {
            const testAudio = new Audio();
            testAudio.src = station.stream;

            const timeout = setTimeout(() => {
              results[station.id] = false;
              resolve();
            }, 5000);

            testAudio.addEventListener("canplay", () => {
              clearTimeout(timeout);
              results[station.id] = true;
              resolve();
            });

            testAudio.addEventListener("error", () => {
              clearTimeout(timeout);
              results[station.id] = false;
              resolve();
            });
          }),
      ),
    );

    setStationStatus(results);
  };

  // load pertama
  useEffect(() => {
    loadStation(currentStation, false);
    checkStations();
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
    retryRef.current = 0;
    setIsLoading(true);

    audio.src = station.stream;
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

    if (retryRef.current >= MAX_RETRY) {
      setError("Stream tidak tersedia");
      setIsLoading(false);
      setIsPlaying(false);

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      retryRef.current = 0;
      return;
    }

    retryRef.current += 1;

    retryTimerRef.current = setTimeout(() => {
      audioRef.current?.play().catch(() => reconnect());
    }, 1000);
  };

  const changeStation = (station: Station) => {
    const isOnline = stationStatus[station.id];

    if (!isOnline) return;

    const autoplay = isPlaying;

    setIsPlaying(true);
    setCurrentStation(station);

    loadStation(station, autoplay);
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-gray-800 flex flex-col items-center p-5">
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

      {/* WRAPPER biar bisa flex properly */}
      <div className="flex flex-col w-full max-w-lg flex-1 min-h-0">
        {/* STATION LIST */}
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
          <span className="text-sm sticky top-0 bg-[#f5f5f4] z-10">
            Station List
          </span>

          {stations.map((station) => {
            const isActive = station.id === currentStation.id;
            const isOnline = stationStatus[station.id] !== false;

            return (
              <button
                key={station.id}
                disabled={!isOnline}
                onClick={() => changeStation(station)}
                className={`p-3 rounded-lg flex items-center justify-between gap-3 transition-all duration-300
            
            ${
              !isOnline
                ? "bg-red-100 text-red-500 cursor-not-allowed"
                : isActive
                  ? "bg-green-500 text-white"
                  : "bg-white"
            }`}
              >
                <div className="flex items-center">
                  <img
                    src={`/img/${station.logo}`}
                    className="w-8 h-8 rounded"
                  />

                  <span className="text-sm flex-1 ml-3">{station.name}</span>

                  {!isOnline && (
                    <span className="text-xs ml-2 text-red-600">OFFLINE</span>
                  )}
                </div>

                {isActive && isOnline && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    <span className="text-xs">NOW</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* PLAYER (tetap di bawah) */}
        <div className="fixed bottom-0 left-0 w-full flex justify-center p-3 bg-transparent z-50">
          <div className="bg-white w-full max-w-lg p-3 rounded-full flex flex-col gap-2 border border-[#e7e5e4] shadow-lg">

            <div className="flex items-center h-full">
              <img
                src={`/img/${currentStation.logo}`}
                className="w-12 h-12 mx-auto rounded-lg"
              />

              <div className="w-full px-4 flex flex-col">
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

                  {error && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-red-700 animate-pulse" />
                      <span className="text-[13px] text-red-700">{error}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={togglePlay}
                className="cursor-pointer p-6 text-white rounded-full relative flex items-center justify-center bg-[#F94864]"
              >
                {/* PLAY */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`size-6 absolute transition-all duration-300 ${
                    isPlaying ? "opacity-0 scale-75" : "opacity-100 scale-100"
                  }`}
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
                  className={`size-6 absolute transition-all duration-300 ${
                    isPlaying ? "opacity-100 scale-100" : "opacity-0 scale-75"
                  }`}
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
      </div>
    </div>
  );
}

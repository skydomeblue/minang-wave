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

  const [isCheckingStations, setIsCheckingStations] = useState(true);

  // NEW
  const [showPlayer, setShowPlayer] = useState(false);

  const MAX_RETRY = 5;

  const retryRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // cek stream station
  const checkStations = async () => {
    setIsCheckingStations(true);

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
    setIsCheckingStations(false);
  };

  // load pertama
  useEffect(() => {
    const savedStation = localStorage.getItem("lastStation");

    if (savedStation) {
      const parsed = JSON.parse(savedStation);

      setCurrentStation(parsed);
      setShowPlayer(true);

      loadStation(parsed, false);
    } else {
      // pertama kali buka → player disembunyikan
      setShowPlayer(false);
    }

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

    // simpan station terakhir
    localStorage.setItem("lastStation", JSON.stringify(station));

    // tampilkan player
    setShowPlayer(true);

    loadStation(station, autoplay);
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-gray-800 flex flex-col items-center">
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
      <div className="bg-white fixed z-50 flex w-full justify-center py-3 items-center gap-2">
        <img src={`/img/podcast.png`} className="w-6" />
        <span className=" font-bold text-lg text-[#376CFB]">Minang Wave</span>
      </div>
      <div className="flex flex-col w-full max-w-md flex-1 min-h-0 p-3 mt-14">
        {/* STATION LIST */}
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
          <div className="flex justify-between">
            <span className="text-sm sticky top-0 bg-[#f5f5f4] z-10">
              Station List
            </span>
            <button
              onClick={checkStations}
              disabled={isCheckingStations}
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full duration-300 transition-all bg-[#376CFB] text-white ${
                isCheckingStations
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-[#2448A7]/70 cursor-pointer"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`w-4 h-4 ${isCheckingStations ? "animate-spin" : ""}`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              {isCheckingStations ? "Checking..." : "Refresh"}
            </button>
          </div>

          <div className="flex flex-col gap-2 mb-24">
            {isCheckingStations ? (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-white animate-pulse flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-gray-200 rounded" />

                    <div className="flex flex-col gap-1">
                      <div className="h-3 w-43 bg-gray-200 rounded" />
                      <div className="h-2 w-28 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              stations.map((station) => {
                const isActive = station.id === currentStation.id;
                const isOnline = stationStatus[station.id] !== false;
                return (
                  <button
                    key={station.id}
                    disabled={!isOnline}
                    onClick={() => changeStation(station)}
                    className={`rounded-lg flex items-center transition-all duration-300 overflow-hidden border-2 border-transparent
                                ${
                                  !isOnline
                                    ? "bg-white text-red-500 cursor-not-allowed "
                                    : isActive && isLoading
                                      ? "bg-yellow-500 border-yellow-500 text-yellow-600"
                                      : isActive
                                        ? "bg-[#376CFB] font-semibold text-[#376CFB]"
                                        : "bg-white cursor-pointer border-transparent"
                                }
                              `}
                  >
                    {/* icon play slide */}
                    <div
                      className={`flex items-center justify-center text-white transition-all duration-300 ease-out overflow-hidden 
                                ${
                                  isActive && isOnline
                                    ? "w-14 opacity-100 translate-x-0 px-3"
                                    : "w-0 opacity-0 -translate-x-3 px-0"
                                }
                              `}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="size-7"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                        />
                      </svg>
                    </div>

                    {/* konten utama */}
                    <div className="flex py-2 justify-between w-full px-2 bg-white items-center rounded-l-full">
                      {/* kiri */}
                      <div className="flex items-center">
                        <div className="bg-white border border-[#376CFB] overflow-hidden rounded-full p-2">
                          <img
                            src={`/img/${station.logo}`}
                            className="w-6 h-6"
                          />
                        </div>

                        <span className="text-sm flex-1 ml-3">
                          {station.name}
                        </span>
                      </div>

                      {/* offline text */}
                      {!isOnline && (
                        <span className="text-xs ml-2 text-red-500">
                          Offline
                        </span>
                      )}

                      {/* equalizer */}
                      {isActive && isOnline && (
                        <div className="flex items-center gap-2 ml-2">
                          {/* Loading state */}
                          {isLoading ? (
                            <div className="flex items-end gap-[3px] h-5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span
                                  key={i}
                                  className={`w-[3px] h-[3px] bg-yellow-600 rounded-full animate-bounce`}
                                  style={{
                                    animationDelay: `${i * 0.12}s`,
                                    animationDuration: "0.6s",
                                  }}
                                />
                              ))}
                            </div>
                          ) : (
                            /* Equalizer animation */
                            <div className="flex items-end gap-[3px] h-5">
                              <span
                                className={`
                                    w-[3px] bg-[#376CFB] rounded-full
                                    animate-eq1
                                    ${!isPlaying && "[animation-play-state:paused]"}
                                  `}
                              />

                              <span
                                className={`
                                    w-[3px] bg-[#376CFB] rounded-full
                                    animate-eq2
                                    ${!isPlaying && "[animation-play-state:paused]"}
                                  `}
                              />

                              <span
                                className={`
                                    w-[3px] bg-[#376CFB] rounded-full
                                    animate-eq3
                                    ${!isPlaying && "[animation-play-state:paused]"}
                                  `}
                              />

                              <span
                                className={`
                                    w-[3px] bg-[#376CFB] rounded-full
                                    animate-eq2
                                    ${!isPlaying && "[animation-play-state:paused]"}
                                  `}
                              />

                              <span
                                className={`
                                    w-[3px] bg-[#376CFB] rounded-full
                                    animate-eq1
                                    ${!isPlaying && "[animation-play-state:paused]"}
                                  `}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* PLAYER */}
        <div
          className={`fixed bottom-0 left-0 w-full flex justify-center p-3 bg-transparent z-50
  transition-all duration-500
  ${
    showPlayer
      ? "translate-y-0 opacity-100"
      : "translate-y-full opacity-0 pointer-events-none"
  }`}
        >
          <div className="bg-white w-full max-w-md p-3 rounded-full flex flex-col gap-2 border border-[#e7e5e4] shadow-lg">
            <div className="flex items-center h-full">
              {/* vinyl */}
              <img
                src={`/img/vinyl.png`}
                className={`
          w-12 h-12 mx-auto rounded-lg
          animate-spin
          [animation-duration:3s]
          ${!isPlaying && "[animation-play-state:paused]"}
        `}
              />

              {/* info */}
              <div className="w-full px-3 flex flex-col">
                {/* animated station name */}
                <div className="relative h-[22px] overflow-hidden">
                  <span
                    key={currentStation.name}
                    className="
              absolute left-0 top-0 w-full
              font-bold
              animate-[stationIn_.35s_ease]
            "
                  >
                    {currentStation.name}
                  </span>
                </div>

                {/* status */}
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

              {/* play button */}
              <button
                onClick={togglePlay}
                className="
          cursor-pointer
          p-6
          text-white
          rounded-full
          relative
          flex items-center justify-center
          bg-[#F94864]
        "
              >
                {/* play icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`
            size-6 absolute
            transition-all duration-300
            ${isPlaying ? "opacity-0 scale-75" : "opacity-100 scale-100"}
          `}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                  />
                </svg>

                {/* pause icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`
            size-6 absolute
            transition-all duration-300
            ${isPlaying ? "opacity-100 scale-100" : "opacity-0 scale-75"}
          `}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z"
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

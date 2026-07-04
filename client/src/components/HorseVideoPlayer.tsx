import { useRef, useEffect, useState, useCallback } from "react";
import { getHorseImage, type BaseHorse } from "@/lib/horses";

export type HorseAction = "idle" | "walk" | "eat" | "play" | "run";

interface HorseVideoPlayerProps {
  horseColor: string;
  currentAction: HorseAction;
  onActionComplete?: () => void;
  className?: string;
}

const ACTIONS: HorseAction[] = ["idle", "walk", "eat", "play", "run"];

export default function HorseVideoPlayer({
  horseColor,
  currentAction,
  onActionComplete,
  className = "",
}: HorseVideoPlayerProps) {
  const activeRef = useRef<HTMLVideoElement>(null);
  const bufferRef = useRef<HTMLVideoElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const onActionCompleteRef = useRef(onActionComplete);
  onActionCompleteRef.current = onActionComplete;
  const lastActionRef = useRef<string>("");
  const [videoAvailable, setVideoAvailable] = useState(true);

  const getVideoSrc = useCallback(
    (action: HorseAction) => `${import.meta.env.BASE_URL}videos/${horseColor}-${action}.mp4`,
    [horseColor]
  );

  useEffect(() => {
    const testVideo = document.createElement("video");
    testVideo.src = getVideoSrc("idle");
    testVideo.addEventListener("error", () => setVideoAvailable(false), { once: true });
    testVideo.addEventListener("canplay", () => setVideoAvailable(true), { once: true });
    testVideo.load();
  }, [getVideoSrc]);

  useEffect(() => {
    if (!videoAvailable) return;
    let idx = 0;
    const preloadNext = () => {
      if (idx >= ACTIONS.length) return;
      const video = document.createElement("video");
      video.preload = "auto";
      video.src = getVideoSrc(ACTIONS[idx]);
      video.addEventListener("canplaythrough", () => { idx++; preloadNext(); }, { once: true });
      video.addEventListener("error", () => { idx++; preloadNext(); }, { once: true });
      video.load();
    };
    preloadNext();
  }, [getVideoSrc, videoAvailable]);

  useEffect(() => {
    if (!videoAvailable || !activeRef.current) return;
    activeRef.current.src = getVideoSrc("idle");
    activeRef.current.loop = true;
    activeRef.current.muted = true;
    activeRef.current.playsInline = true;
    activeRef.current.play().catch(() => {});
    setActiveIndex(0);
    lastActionRef.current = "idle";
  }, [getVideoSrc, videoAvailable]);

  useEffect(() => {
    if (!videoAvailable) return;
    const actionKey = `${currentAction}-${horseColor}`;
    if (actionKey === lastActionRef.current) return;
    lastActionRef.current = actionKey;

    const isBufferNext = activeIndex === 0;
    const incoming = isBufferNext ? bufferRef.current : activeRef.current;
    const outgoing = isBufferNext ? activeRef.current : bufferRef.current;

    if (!incoming || !outgoing) return;

    const src = getVideoSrc(currentAction);
    const isIdle = currentAction === "idle";

    incoming.src = src;
    incoming.loop = isIdle;
    incoming.muted = true;
    incoming.playsInline = true;

    const handleCanPlay = () => {
      incoming.play().catch(() => {});
      setActiveIndex(isBufferNext ? 1 : 0);
      setTimeout(() => {
        outgoing.pause();
      }, 400);
    };

    const handleEnded = () => {
      if (!isIdle && onActionCompleteRef.current) {
        onActionCompleteRef.current();
      }
    };

    incoming.addEventListener("canplay", handleCanPlay, { once: true });
    incoming.addEventListener("ended", handleEnded);
    incoming.load();

    return () => {
      incoming.removeEventListener("canplay", handleCanPlay);
      incoming.removeEventListener("ended", handleEnded);
    };
  }, [currentAction, horseColor, getVideoSrc, activeIndex, videoAvailable]);

  if (!videoAvailable) {
    const horseImg = getHorseImage(horseColor as BaseHorse);
    return (
      <div className={`relative ${className}`} data-testid="horse-video-player">
        <img
          src={horseImg}
          alt="Horse"
          className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl"
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} data-testid="horse-video-player">
      <video
        ref={activeRef}
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-400 ${
          activeIndex === 0 ? "opacity-100" : "opacity-0"
        }`}
        muted
        playsInline
        autoPlay
      />
      <video
        ref={bufferRef}
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-400 ${
          activeIndex === 1 ? "opacity-100" : "opacity-0"
        }`}
        muted
        playsInline
      />
    </div>
  );
}

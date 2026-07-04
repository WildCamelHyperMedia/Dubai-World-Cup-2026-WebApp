import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Instagram, ArrowLeft, Camera, SwitchCamera, Copy, Check, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useJourney } from "@/lib/JourneyContext";
import { getCombinedImagePath } from "@/lib/getImagePath";
import { useTranslation } from "react-i18next";
import dwc30Logo from "@/assets/images/dwc-30th-logo-04-cropped.png";
import SaduPattern from "@/components/SaduPattern";

const captureBg = `${import.meta.env.BASE_URL}images/capture-bg.png`;


type CameraState = "idle" | "requesting" | "granted" | "denied";

function useCamera() {
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, cameraState]);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    setCameraState("requesting");
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          zoom: 1,
        } as MediaTrackConstraints,
        audio: false,
      });
      const track = newStream.getVideoTracks()[0];
      if (track) {
        try {
          const caps = track.getCapabilities?.() as any;
          if (caps?.zoom) {
            await track.applyConstraints({ advanced: [{ zoom: caps.zoom.min } as any] });
          }
        } catch {}
      }
      setStream(newStream);
      setCameraState("granted");
      setFacingMode(facing);
    } catch {
      setCameraState("denied");
    }
  }, [stream]);

  const flipCamera = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment";
    startCamera(next);
  }, [facingMode, startCamera]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraState("idle");
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  return { cameraState, videoRef, startCamera, flipCamera, stopCamera, facingMode };
}

function useTouchGestures() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastDist = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handlePointerCancel = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastDist.current > 0) {
        const delta = dist / lastDist.current;
        setScale((prev) => Math.min(2, Math.max(0.5, prev * delta)));
      }
      lastDist.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastDist.current = 0;
  }, []);

  return {
    position,
    scale,
    containerRef,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

export default function Capture() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [captured, setCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hashtagCopied, setHashtagCopied] = useState(false);
  const [showGoldBadge, setShowGoldBadge] = useState(false);
  const { baseHorse, horseName, customizations, markCaptured, markShared } = useJourney();
  const activeCustomizationCount = Object.keys(customizations).filter(k => k !== "silk").length;
  const allStationsComplete = activeCustomizationCount >= 5;
  const camera = useCamera();
  const touch = useTouchGestures();

  const cameraVideoRef = camera.videoRef;
  const horseVideoContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const hasAnyCustomization = useMemo(
    () => Object.keys(customizations).length > 0,
    [customizations]
  );

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.overflow = "hidden";
    camera.startCamera("environment");
    return () => {
      camera.stopCamera();
      document.body.style.overflow = "";
    };
  }, []);

  const horseImageSrc = getCombinedImagePath(baseHorse, customizations);


  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject();
      img.src = src;
    });
  }, []);

  const drawBrandedFrame = useCallback(async (
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    photoSource: HTMLVideoElement | HTMLImageElement | null,
    isVideo: boolean,
    flipHorizontal: boolean,
  ) => {
    const margin = 40;
    const bottomArea = 280;
    const photoW = canvasW - margin * 2;
    const photoH = canvasH - margin - bottomArea;
    const photoX = margin;
    const photoY = margin;
    const photoRadius = 32;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
    bgGrad.addColorStop(0, "#FAF6F0");
    bgGrad.addColorStop(0.7, "#F5EDE0");
    bgGrad.addColorStop(1, "#EDE3D0");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    const borderW = 3;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(photoX - borderW, photoY - borderW, photoW + borderW * 2, photoH + borderW * 2, photoRadius + borderW);
    const borderGrad = ctx.createLinearGradient(photoX, photoY, photoX + photoW, photoY + photoH);
    borderGrad.addColorStop(0, "#C4883A");
    borderGrad.addColorStop(0.5, "#B89B71");
    borderGrad.addColorStop(1, "#C4883A");
    ctx.fillStyle = borderGrad;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(photoX, photoY, photoW, photoH, photoRadius);
    ctx.clip();

    if (photoSource) {
      if (isVideo) {
        const vid = photoSource as HTMLVideoElement;
        const vw = vid.videoWidth || canvasW;
        const vh = vid.videoHeight || canvasH;
        const vAspect = vw / vh;
        const cAspect = photoW / photoH;
        let sx = 0, sy = 0, sw = vw, sh = vh;
        if (vAspect > cAspect) { sw = vh * cAspect; sx = (vw - sw) / 2; }
        else { sh = vw / cAspect; sy = (vh - sh) / 2; }
        if (flipHorizontal) {
          ctx.save();
          ctx.translate(photoX + photoW, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(vid, sx, sy, sw, sh, 0, photoY, photoW, photoH);
          ctx.restore();
        } else {
          ctx.drawImage(vid, sx, sy, sw, sh, photoX, photoY, photoW, photoH);
        }
      } else {
        ctx.drawImage(photoSource, photoX, photoY, photoW, photoH);
      }
    } else {
      ctx.fillStyle = "#D4C4A8";
      ctx.fillRect(photoX, photoY, photoW, photoH);
    }

    const horseContainer = horseVideoContainerRef.current;
    if (horseContainer) {
      const containerParent = horseContainer.parentElement;
      if (containerParent) {
        const parentRect = containerParent.getBoundingClientRect();
        const horseRect = horseContainer.getBoundingClientRect();
        const relX = (horseRect.left - parentRect.left) / parentRect.width;
        const relY = (horseRect.top - parentRect.top) / parentRect.height;
        const relW = horseRect.width / parentRect.width;
        const relH = horseRect.height / parentRect.height;
        const drawX = photoX + relX * photoW;
        const drawY = photoY + relY * photoH;
        const drawW = relW * photoW;
        const drawH = relH * photoH;

        const allImages = horseContainer.querySelectorAll("img");
        for (const imgEl of allImages) {
          const srcW = imgEl.naturalWidth || drawW;
          const srcH = imgEl.naturalHeight || drawH;
          const srcAspect = srcW / srcH;
          const dstAspect = drawW / drawH;
          let fitW = drawW, fitH = drawH, fitX = drawX, fitY = drawY;
          if (srcAspect > dstAspect) { fitH = drawW / srcAspect; fitY = drawY + (drawH - fitH) / 2; }
          else { fitW = drawH * srcAspect; fitX = drawX + (drawW - fitW) / 2; }
          ctx.drawImage(imgEl, fitX, fitY, fitW, fitH);
        }
      }
    }
    ctx.restore();

    const bottomStartY = photoY + photoH;
    const centerX = canvasW / 2;

    try {
      const badgeImg = await loadImage(`${import.meta.env.BASE_URL}images/badges/gold-badge.png`);
      const badgeSize = 160;
      const badgeX = centerX - badgeSize / 2;
      const badgeY = bottomStartY - badgeSize * 0.45;

      ctx.save();
      ctx.shadowColor = "rgba(196,136,58,0.35)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 6;
      ctx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);
      ctx.restore();
    } catch {}

    const lineY1 = bottomStartY + 100;
    const lineW = 200;
    const lineGrad = ctx.createLinearGradient(centerX - lineW / 2, 0, centerX + lineW / 2, 0);
    lineGrad.addColorStop(0, "rgba(196,136,58,0)");
    lineGrad.addColorStop(0.15, "rgba(196,136,58,0.4)");
    lineGrad.addColorStop(0.5, "rgba(196,136,58,0.8)");
    lineGrad.addColorStop(0.85, "rgba(196,136,58,0.4)");
    lineGrad.addColorStop(1, "rgba(196,136,58,0)");
    ctx.fillStyle = lineGrad;
    ctx.fillRect(centerX - lineW / 2, lineY1, lineW, 1.5);

    try {
      const logoImg = await loadImage(dwc30Logo);
      const logoH = 90;
      const logoW = logoImg.naturalWidth * (logoH / logoImg.naturalHeight);
      const logoX = centerX - logoW / 2;
      const logoY = lineY1 + 20;
      ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
    } catch {}

    const lineY2 = bottomStartY + 230;
    ctx.fillStyle = lineGrad;
    ctx.fillRect(centerX - lineW / 2, lineY2, lineW, 1.5);
  }, [loadImage]);

  const capturePhoto = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const vid = (camera.cameraState === "granted" && cameraVideoRef.current) ? cameraVideoRef.current : null;
    await drawBrandedFrame(ctx, width, height, vid, true, camera.facingMode === "user");

    const dataUrl = canvas.toDataURL("image/png");
    setCapturedImage(dataUrl);
    setCaptured(true);
    camera.stopCamera();
    markCaptured();
    if (allStationsComplete) {
      setShowGoldBadge(true);
    }
  }, [camera.cameraState, camera.facingMode, cameraVideoRef, markCaptured, drawBrandedFrame]);

  const dataUrlToBlob = useCallback((dataUrl: string): Blob => {
    const [header, base64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] || "image/png";
    const binary = atob(base64);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }, []);

  const downloadImage = useCallback(async () => {
    if (!capturedImage) return;
    const blob = dataUrlToBlob(capturedImage);
    const file = new File([blob], "drc30-capture.png", { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "DWC30 Capture" });
        return;
      } catch {}
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "drc30-capture.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  }, [capturedImage, dataUrlToBlob]);

  const generateStoryAndShare = useCallback(async () => {
    if (!capturedImage) return;
    const blob = dataUrlToBlob(capturedImage);
    const file = new File([blob], "drc30-story.png", { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "#DWC30" });
        markShared();
        return;
      } catch {}
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "drc30-story.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    markShared();
  }, [capturedImage, markShared, dataUrlToBlob]);

  return (
    <div className="h-screen h-[100dvh] w-full bg-[var(--bg)] flex flex-col relative overflow-hidden font-sans">
      <img src={`${import.meta.env.BASE_URL}images/hoof-pattern.png`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.25] pointer-events-none z-0" />
      <canvas ref={canvasRef} className="hidden" />

      {!captured ? (
        <div className="fixed inset-0 z-0 flex flex-col" style={{ height: "100dvh" }}>
          {camera.cameraState === "granted" ? (
            <video
              ref={cameraVideoRef}
              autoPlay
              playsInline
              muted
              webkit-playsinline="true"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: camera.facingMode === "user" ? "scaleX(-1)" : "none" }}
              data-testid="camera-feed"
            />
          ) : camera.cameraState === "requesting" ? (
            <div className="absolute inset-0 bg-black flex items-center justify-center" data-testid="camera-loading">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-[var(--copper)] border-t-transparent rounded-full animate-spin" />
                <p className="text-white/60 text-sm">{t("Starting camera...")}</p>
              </div>
            </div>
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${captureBg})` }}
              data-testid="fallback-background"
            />
          )}

          {camera.cameraState === "denied" && (
            <div className="absolute top-20 left-0 right-0 z-30 flex justify-center">
              <div className="bg-black/80 backdrop-blur-md text-white/90 text-sm px-5 py-3 rounded-xl border border-white/10 mx-6 text-center flex flex-col items-center gap-2" data-testid="text-camera-denied">
                <p>{t("Camera access denied. Please allow camera access for the AR experience.")}</p>
                <button
                  onClick={() => camera.startCamera("environment")}
                  className="px-4 py-1.5 bg-[var(--copper)] text-white text-xs rounded-lg uppercase tracking-wider font-semibold"
                  data-testid="button-retry-camera"
                >
                  {t("Try Again")}
                </button>
              </div>
            </div>
          )}

          <div className="relative z-20 flex-shrink-0 px-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent" style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))", paddingBottom: "8px" }}>
            <button
              className="w-8 h-8 flex items-center justify-center text-white bg-white/15 backdrop-blur-md rounded-full border border-white/20"
              onClick={() => {
                camera.stopCamera();
                setLocation("/journey");
              }}
              data-testid="button-back-journey-capture"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <img
              src={dwc30Logo}
              alt="DWC 30th"
              className="h-7 object-contain drop-shadow-[0_0_20px_rgba(196,136,58,0.3)]"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div className="flex gap-2">
              {camera.cameraState === "granted" && (
                <button
                  onClick={camera.flipCamera}
                  className="w-8 h-8 flex items-center justify-center text-white bg-white/15 backdrop-blur-md rounded-full border border-white/20"
                  data-testid="button-flip-camera"
                  aria-label={t("Flip Camera")}
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              )}
              {(camera.cameraState === "idle" || camera.cameraState === "denied") && (
                <button
                  onClick={() => camera.startCamera("environment")}
                  className="w-8 h-8 flex items-center justify-center text-white bg-white/15 backdrop-blur-md rounded-full border border-white/20"
                  data-testid="button-enable-camera"
                  aria-label={t("Enable Camera")}
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div
            className="relative z-10 flex-1 min-h-0 flex items-center justify-center overflow-hidden"
            style={{ touchAction: "none" }}
          >
            <div
              ref={horseVideoContainerRef}
              className="w-[70%] max-w-[280px] relative"
              style={{
                aspectRatio: "1",
                transform: `translate(${touch.position.x}px, ${touch.position.y}px) scale(${touch.scale})`,
                cursor: "grab",
              }}
              {...touch.handlers}
              data-testid="horse-ar-overlay"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
                className="w-full h-full"
              >
                <img
                  src={horseImageSrc}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                  alt="Customized Horse"
                  data-testid="img-horse-capture"
                />
              </motion.div>
            </div>
          </div>

          <div className="relative z-20 flex-shrink-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent pt-2 px-5" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}>
            {horseName && (
              <p className="text-center font-serif text-[14px] text-[var(--copper)] mb-1 text-shadow-warm-lg" data-testid="text-horse-name-capture">
                {horseName}
              </p>
            )}
            <div className="flex justify-center">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full border-[3px] border-[var(--copper)]/80 flex items-center justify-center relative bg-transparent shadow-[0_0_24px_rgba(196,136,58,0.3)] sadu-shutter"
                data-testid="button-capture-shutter"
              >
                <div className="w-[52px] h-[52px] bg-gradient-to-br from-[var(--copper)] to-[var(--terracotta)] rounded-full transition-transform hover:scale-95 sadu-fab" />
              </motion.button>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 z-10 flex flex-col bg-black overflow-hidden" style={{ height: "100dvh" }}>
          <div className="flex-shrink-0 flex items-center px-5 pt-4 pb-2">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full text-white"
              onClick={() => {
                setCaptured(false);
                setCapturedImage(null);
                setShowGoldBadge(false);
                camera.startCamera("environment");
              }}
              data-testid="button-back-capture"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="flex-1 text-center text-white font-serif text-base tracking-wide">
              {t("Your Capture")}
            </h2>
            <div className="w-8" />
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center px-4 pb-1">
            <div className="h-full max-h-full w-auto">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured AR Photo"
                  className="h-full w-auto max-w-full object-contain rounded-lg shadow-2xl"
                  data-testid="captured-photo"
                />
              ) : (
                <div className="h-full aspect-[9/16] bg-[#D4C4A8] rounded-lg" />
              )}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative z-20 flex-shrink-0 px-5 pt-3 pb-4 flex flex-col items-center"
            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}
          >
            <h3 className="font-serif text-lg text-[#C4883A] font-bold mb-0.5">
              {t("Masterpiece Saved")}
            </h3>
            <p className="text-[10px] text-white/50 font-light mb-2.5">
              Share on Instagram using <span className="text-[#C4883A] font-semibold">#DWC30</span> & tag <span className="text-[#C4883A] font-semibold">@racingdubai</span> to enter the AED 3,000 draw.
            </p>

            <div className="w-full max-w-md flex gap-2 mb-2">
              <Button
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-90 text-white font-semibold tracking-[0.08em] text-[11px] uppercase shadow-[0_6px_20px_rgba(253,29,29,0.15)] border-0"
                onClick={generateStoryAndShare}
                data-testid="button-share-instagram"
              >
                <Instagram className="w-4 h-4 mr-2" />
                {t("Share to Story")}
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 font-medium tracking-[0.08em] text-[11px] uppercase"
                data-testid="button-save-image"
                onClick={downloadImage}
              >
                <Download className="w-4 h-4 mr-2" />
                {t("Save Image")}
              </Button>
            </div>

            <div className="w-full max-w-md mb-1.5">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText("I just completed the DWC30 Heritage Journey and unlocked my final AR horse. #DWC30 #DWC26 @racingdubai");
                    setHashtagCopied(true);
                    setTimeout(() => setHashtagCopied(false), 2000);
                  } catch {}
                }}
                className="w-full h-8 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:text-white/80 hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-[11px] tracking-wider"
                data-testid="button-copy-hashtag"
              >
                {hashtagCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400 font-medium">{t("Copied!")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t("Copy Caption")}</span>
                  </>
                )}
              </button>
            </div>

            <div className="w-full max-w-md">
              <button
                className="w-full h-9 text-[11px] uppercase tracking-[0.1em] text-white/40 hover:text-white/70 transition-colors font-medium"
                onClick={() => setLocation("/")}
                data-testid="button-return-home"
              >
                {t("Return to Home")}
              </button>
            </div>
          </motion.div>

          <AnimatePresence>
            {showGoldBadge && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                  onClick={() => setShowGoldBadge(false)}
                />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="w-full max-w-[calc(100vw-2rem)] bg-[var(--surface-1)] rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-[var(--border)] sadu-popup max-h-[85dvh] overflow-y-auto pointer-events-auto"
                  data-testid="popup-gold-badge"
                >
                  <div className="relative px-6 pt-6 pb-2">
                    <button
                      onClick={() => setShowGoldBadge(false)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors z-10"
                      data-testid="button-close-gold-badge"
                    >
                      <span className="sr-only">Close</span>
                      ✕
                    </button>

                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#C4883A]/15 flex items-center justify-center">
                        <Award className="w-5 h-5 text-[#C4883A]" />
                      </div>
                      <h3 className="font-serif text-xl text-[var(--primary)] font-bold leading-tight pr-8">
                        {t("badge_gold_earned")}
                      </h3>
                    </div>
                  </div>

                  <div className="px-6 pb-6">
                    <div className="flex flex-col items-center text-center mb-4">
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                        className="relative w-20 h-20 mb-3"
                      >
                        <img
                          src={`${import.meta.env.BASE_URL}images/badges/gold-badge.png`}
                          alt="Gold Badge"
                          className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(196,136,58,0.5)]"
                          data-testid="img-gold-badge-celebration"
                        />
                        <motion.div
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                          className="absolute -inset-1 rounded-full border-2 border-[#C4883A]/40"
                        />
                      </motion.div>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-xs tracking-[0.2em] uppercase font-bold text-[#C4883A] mb-1"
                      >
                        {t("badge_unlocked")}
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="font-serif text-lg text-[var(--primary)] font-bold"
                      >
                        {t("badge_gold_title")}
                      </motion.p>
                    </div>
                    <p className="text-[var(--text-muted)] text-sm leading-relaxed text-center mb-5">
                      {t("badge_gold_desc")}
                    </p>

                    <button
                      onClick={() => setShowGoldBadge(false)}
                      className="w-full h-12 btn-vivid rounded-2xl text-sm font-semibold tracking-[0.1em] uppercase border-0 flex items-center justify-center gap-2 shadow-md"
                      data-testid="button-dismiss-gold-badge"
                    >
                      {t("Continue")}
                    </button>
                  </div>
                </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

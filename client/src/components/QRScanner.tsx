import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle, AlertCircle, Loader2, Camera, Keyboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import jsQR from "jsqr";

const STATION_UNLOCK_CODES: Record<string, string> = {
  TALLI30: "talli",
  SADU30: "sadu",
  SADDLE30: "saddle",
  POTTERY30: "pottery",
  SILK30: "silk",
  ALKHOUS30: "alkhous",
};

interface QRScannerProps {
  participantId: string | null;
  onSuccess: (stationId: string, unlockToken: string) => void;
  onClose: () => void;
}

export default function QRScanner({ participantId, onSuccess, onClose }: QRScannerProps) {
  const { t } = useTranslation();
  const [manualCode, setManualCode] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [cameraError, setCameraError] = useState(false);
  const isProcessingRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const verifyCodeFn = useCallback(async (code: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setStatus("verifying");
    setErrorMsg("");

    const stationId = STATION_UNLOCK_CODES[code.trim().toUpperCase()];

    if (stationId) {
      const unlockToken =
        Math.random().toString(36).substring(2) + Date.now().toString(36);
      setStatus("success");
      setTimeout(() => {
        onSuccess(stationId, unlockToken);
      }, 1500);
    } else {
      setStatus("error");
      setErrorMsg(t("scanner_invalid_code"));
      isProcessingRef.current = false;
    }
  }, [onSuccess, t]);

  const handleQrDetected = useCallback((data: string) => {
    if (isProcessingRef.current) return;
    const code = data.trim().toUpperCase();
    if (code.length >= 4) {
      stopCamera();
      verifyCodeFn(code);
    }
  }, [stopCamera, verifyCodeFn]);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      if (qrCode && qrCode.data) {
        handleQrDetected(qrCode.data);
        return;
      }
    } catch {}

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [handleQrDetected]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch {
      setCameraError(true);
      setMode("manual");
    }
  }, [scanFrame]);

  useEffect(() => {
    if (mode === "camera" && status !== "success" && status !== "verifying") {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode, startCamera, stopCamera, status]);

  const handleManualSubmit = () => {
    if (manualCode.trim().length < 4) return;
    verifyCodeFn(manualCode);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#050810] flex flex-col"
      data-testid="qr-scanner-overlay"
    >
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={handleClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white border border-white/20"
          data-testid="button-close-scanner"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="font-serif text-lg text-white">{t("scanner_title")}</h2>
        <div className="w-10" />
      </div>

      <div className={`flex-1 flex flex-col items-center px-6 overflow-y-auto pb-6${mode === "manual" || status === "success" ? " justify-center" : ""}`}>
        {status === "success" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center flex-1 flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10 }}
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <CheckCircle className="w-10 h-10 text-green-400" />
            </motion.div>
            <h3 className="font-serif text-2xl text-white mb-2">{t("scanner_success")}</h3>
            <p className="text-white/50 text-sm">{t("scanner_unlocking")}</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm flex flex-col items-center mt-2"
          >
            {mode === "camera" ? (
              <>
                <div className="relative w-full aspect-square max-w-[280px] mb-4 rounded-2xl overflow-hidden bg-black border border-white/10">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    data-testid="video-camera-feed"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  <div className="absolute inset-0 pointer-events-none z-10">
                    <div className="absolute top-4 left-4 w-10 h-10 border-t-3 border-l-3 border-[var(--primary)] rounded-tl-lg" />
                    <div className="absolute top-4 right-4 w-10 h-10 border-t-3 border-r-3 border-[var(--primary)] rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-10 h-10 border-b-3 border-l-3 border-[var(--primary)] rounded-bl-lg" />
                    <div className="absolute bottom-4 right-4 w-10 h-10 border-b-3 border-r-3 border-[var(--primary)] rounded-br-lg" />
                  </div>

                  <motion.div
                    animate={{ y: ["0%", "90%", "0%"] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                    className="absolute top-4 left-4 right-4 h-[2px] z-10"
                    style={{ background: "linear-gradient(90deg, transparent, var(--primary), transparent)" }}
                  />

                  {status === "verifying" && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                      <Loader2 className="w-8 h-8 text-[var(--highlight)] animate-spin" />
                    </div>
                  )}
                </div>

                <p className="text-white/50 text-sm text-center mb-4 max-w-[260px]">
                  {t("scanner_camera_hint")}
                </p>

                {status === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-400 text-xs mb-4 bg-red-500/10 px-3 py-2 rounded-lg w-full"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}

                <button
                  onClick={() => { stopCamera(); setMode("manual"); }}
                  className="flex items-center gap-2 text-white/60 text-sm hover:text-white/80 transition-colors mb-4"
                  data-testid="button-switch-manual"
                >
                  <Keyboard className="w-4 h-4" />
                  {t("scanner_enter_manually")}
                </button>
              </>
            ) : (
              <>
                <div className="w-full rounded-2xl bg-white/[0.04] border border-white/10 p-5 mb-4">
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-[0.15em] mb-3 text-center">
                    {t("scanner_manual_title")}
                  </p>

                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => { setManualCode(e.target.value.toUpperCase()); setStatus("idle"); setErrorMsg(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(); }}
                    placeholder={t("scanner_placeholder")}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white text-center text-lg tracking-[0.3em] font-mono placeholder:text-white/20 focus:outline-none focus:border-[var(--primary)]/50 transition-all uppercase mb-3"
                    maxLength={20}
                    data-testid="input-manual-code"
                  />

                  {status === "error" && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-red-400 text-xs mb-3 bg-red-500/10 px-3 py-2 rounded-lg"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errorMsg}</span>
                    </motion.div>
                  )}

                  <button
                    onClick={handleManualSubmit}
                    disabled={manualCode.trim().length < 4 || status === "verifying"}
                    className="w-full py-3 bg-gradient-to-r from-[var(--primary)] to-[var(--highlight)] text-white rounded-xl text-sm font-bold uppercase tracking-[0.15em] shadow-[0_6px_24px_rgba(212,160,84,0.3)] disabled:opacity-40 flex items-center justify-center gap-2"
                    data-testid="button-submit-code"
                  >
                    {status === "verifying" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    {t("scanner_unlock_button")}
                  </button>
                </div>

                {!cameraError && (
                  <button
                    onClick={() => setMode("camera")}
                    className="flex items-center gap-2 text-white/60 text-sm hover:text-white/80 transition-colors"
                    data-testid="button-switch-camera"
                  >
                    <Camera className="w-4 h-4" />
                    {t("scanner_use_camera")}
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Check, Sparkles, QrCode, ArrowLeft, X, Award } from "lucide-react";
import { useJourney } from "@/lib/JourneyContext";
import { CRAFT_DATA, STATION_IDS, ACTIVE_STATION_COUNT, type ActiveStationId } from "@/lib/crafts";
import { getCombinedImagePath } from "@/lib/getImagePath";
import { useTranslation } from "react-i18next";
import QRScanner from "@/components/QRScanner";

const STATIONS = [
  { id: "talli", name: "Al Talli", desc: "Emirati Embroidery" },
  { id: "sadu", name: "Sadu", desc: "Bedouin Textiles" },
  { id: "saddle", name: "Leather", desc: "Leather Crafting" },
  { id: "pottery", name: "Pottery", desc: "Clay Sculpting" },
  { id: "alkhous", name: "Al Khous", desc: "Palm Leaf Weaving" },
];

const TILE_COLORS = [
  "var(--terracotta)",
  "var(--copper)",
  "var(--godolphin-blue)",
  "var(--sage-green)",
  "var(--camel-tan)",
];

export default function JourneyMap() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const {
    unlockedStations,
    unlockStation,
    points,
    addPoints,
    baseHorse,
    horseName,
    customizations,
    participantId,
  } = useJourney();
  const [showScanner, setShowScanner] = useState(false);
  const [showReward, setShowReward] = useState<{
    id: string;
    pts: number;
  } | null>(null);
  const [showCapturePrompt, setShowCapturePrompt] = useState(false);

  const handleStationClick = (id: string) => {
    if (unlockedStations.includes(id)) {
      setLocation(`/station/${id}`);
    } else {
      setShowScanner(true);
    }
  };

  const handleScanSuccess = (stationId: string, unlockToken: string) => {
    const activeIds = STATIONS.map(s => s.id);
    if (!activeIds.includes(stationId)) {
      setShowScanner(false);
      return;
    }
    setShowScanner(false);
    unlockStation(stationId, unlockToken);
    addPoints(50);
    setShowReward({ id: stationId, pts: 50 });
    setTimeout(() => {
      setShowReward(null);
      setLocation(`/station/${stationId}`);
    }, 2000);
  };

  const activeStationIds = STATIONS.map(s => s.id);
  const customizedCount = Object.keys(customizations).filter(k => activeStationIds.includes(k)).length;
  const progressCount = customizedCount;
  const allCompleted = customizedCount >= ACTIVE_STATION_COUNT;
  const avatarSrc = getCombinedImagePath(baseHorse, customizations);

  const handleCaptureClick = () => {
    if (allCompleted) {
      setLocation("/capture");
    } else {
      setShowCapturePrompt(true);
    }
  };

  return (
    <div className="h-screen h-[100dvh] w-full flex flex-col relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-[0.12]"
        >
          <source src={`${import.meta.env.BASE_URL}videos/stadium_night_lights.mp4`} type="video/mp4" />
        </video>
        <div className="absolute inset-0" />
      </div>

      <div className="relative z-20 flex items-center gap-2.5 px-4 pt-4 pb-2">
        <button
          onClick={() => setLocation("/")}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-sm"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm border-2 border-[var(--copper)] overflow-hidden flex items-center justify-center shadow-md">
            <img
              src={avatarSrc}
              alt="Avatar"
              className="w-full h-full object-contain"
              data-testid="img-avatar"
            />
          </div>
          <div>
            {horseName ? (
              <p className="font-serif text-[13px] text-[var(--copper)] leading-none" data-testid="text-horse-display-name">
                {horseName}
              </p>
            ) : (
              <p className="text-[10px] tracking-[0.15em] uppercase text-white/70 font-bold">
                {t("Heritage Trail")}
              </p>
            )}
            <span className="font-serif text-sm text-white leading-none">
              {progressCount}/{ACTIVE_STATION_COUNT}
            </span>
          </div>
        </div>

        <button
          className={`rounded-xl text-[9px] px-3 h-7 font-bold tracking-[0.1em] uppercase shadow-md border-0 flex items-center gap-1.5 transition-all ${
            allCompleted
              ? "btn-vivid"
              : "bg-white/15 backdrop-blur-md text-white/60 border border-white/20"
          }`}
          onClick={handleCaptureClick}
          data-testid="button-capture"
        >
          {allCompleted ? (
            <Sparkles className="w-3 h-3" />
          ) : (
            <Lock className="w-3 h-3" />
          )}
          {t("Capture")}
        </button>
      </div>

      <div className="w-full px-4 mb-2 relative z-10">
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--copper), var(--terracotta))",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${(Math.min(progressCount, ACTIVE_STATION_COUNT) / ACTIVE_STATION_COUNT) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4 pb-4 z-10">
        <div className="grid grid-cols-2 gap-2 h-full" style={{ gridTemplateRows: "1fr 1fr 1fr" }}>
          {STATIONS.map((station, index) => {
            const craft =
              CRAFT_DATA[station.id as ActiveStationId];
            const isUnlocked = unlockedStations.includes(station.id);
            const isCompleted = !!customizations[station.id];
            const tileColor = TILE_COLORS[index];

            return (
              <motion.button
                key={station.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.08, duration: 0.4 }}
                onClick={() => handleStationClick(station.id)}
                className={`relative rounded-2xl overflow-hidden group border border-white/10 shadow-lg ${
                  !isUnlocked ? "opacity-50" : ""
                }`}
                data-testid={`button-station-${station.id}`}
              >
                <img
                  src={craft.heritageImage}
                  alt={t(station.name)}
                  className="absolute inset-0 w-full h-full object-cover"
                />

                <div
                  className="absolute inset-0"
                  style={{
                    background: isUnlocked
                      ? "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)"
                      : "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 100%)",
                  }}
                />

                {isCompleted && (
                  <div
                    className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center shadow-lg z-10"
                    style={{ background: tileColor }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}

                {!isUnlocked && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/20">
                      <Lock className="w-4 h-4 text-white/70" />
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {showReward?.id === station.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1.2 }}
                      exit={{ opacity: 0, y: -30 }}
                      className="absolute inset-0 flex items-center justify-center z-20"
                    >
                      <span className="font-serif text-2xl text-white font-bold drop-shadow-lg">
                        +{showReward.pts}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                  <div
                    className="w-4 h-[2px] mb-1.5 rounded-full"
                    style={{ background: tileColor }}
                  />
                  <h3 className="text-white font-serif text-[14px] font-bold leading-tight mb-0.5">
                    {t(station.name)}
                  </h3>
                  <p className="text-white/50 text-[9px] tracking-[0.1em] uppercase font-medium">
                    {t(station.desc)}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowScanner(true)}
        className="fixed bottom-5 right-4 z-30 w-12 h-12 rounded-full bg-[var(--copper)] text-white flex items-center justify-center shadow-[0_8px_28px_rgba(196,136,58,0.4)] border-2 border-white/20"
        data-testid="button-scan-qr"
      >
        <QrCode className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {showScanner && (
          <QRScanner
            participantId={participantId}
            onSuccess={handleScanSuccess}
            onClose={() => setShowScanner(false)}
          />
        )}

        {showCapturePrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowCapturePrompt(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-4 right-4 bottom-8 z-50 bg-[var(--surface-1)] rounded-2xl p-5 shadow-[0_16px_48px_rgba(0,0,0,0.2)] border border-[var(--border)]"
              data-testid="prompt-capture-locked"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[var(--copper)]/15 flex items-center justify-center flex-shrink-0 border border-[var(--copper)]/30">
                  <Lock className="w-5 h-5 text-[var(--copper)]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-serif text-lg text-[var(--primary)] font-bold mb-1">
                    {t("AR Experience Locked")}
                  </h3>
                  <p className="text-[var(--text-muted)] text-sm font-light leading-relaxed">
                    {t("Complete all 5 heritage stations by scanning their QR codes to unlock the AR photo experience.")} ({progressCount}/{ACTIVE_STATION_COUNT})
                  </p>
                </div>
                <button
                  onClick={() => setShowCapturePrompt(false)}
                  className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex-shrink-0"
                  data-testid="button-close-capture-prompt"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => {
                  setShowCapturePrompt(false);
                  setShowScanner(true);
                }}
                className="w-full h-12 mt-4 btn-vivid rounded-xl text-sm font-semibold tracking-[0.1em] uppercase border-0 flex items-center justify-center gap-2 shadow-heritage-lg"
                data-testid="button-scan-from-prompt"
              >
                <QrCode className="w-4 h-4" />
                {t("Scan")}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

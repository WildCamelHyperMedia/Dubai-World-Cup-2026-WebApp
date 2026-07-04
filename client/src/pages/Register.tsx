import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Globe,
  Map,
  BookOpen,
  QrCode,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useJourney } from "@/lib/JourneyContext";

import VenueTreeMap from "@/components/VenueTreeMap";
import ReadMoreSheet from "@/components/ReadMoreSheet";

type ActiveOverlay = null | "map" | "guide";

export default function Register() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { setParticipantId, language, setLanguage } = useJourney();
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);

  const closeOverlay = useCallback(() => {
    setActiveOverlay(null);
  }, []);

  useEffect(() => {
    if (!activeOverlay) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOverlay();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeOverlay, closeOverlay]);

  const handleSkipAsGuest = () => {
    setParticipantId(crypto.randomUUID());
    setLocation("/select-horse");
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  const GUIDE_STEPS = [
    {
      icon: MapPin,
      titleKey: "guide_step_arrive",
      descKey: "guide_step_arrive_desc",
    },
    {
      icon: QrCode,
      titleKey: "guide_step_scan",
      descKey: "guide_step_scan_desc",
    },
    {
      icon: CheckCircle2,
      titleKey: "guide_step_complete",
      descKey: "guide_step_complete_desc",
    },
    {
      icon: ChevronRight,
      titleKey: "guide_step_unlock",
      descKey: "guide_step_unlock_desc",
    },
  ];

  return (
    <div className="relative h-screen h-[100dvh] w-full overflow-hidden flex flex-col font-sans bg-black">
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-[0.45]"
        >
          <source src={`${import.meta.env.BASE_URL}videos/heritage_horse_dubai.mp4`} type="video/mp4" />
        </video>
      </div>

      <header className="relative z-20 w-full flex justify-between items-center px-5 pt-5 pb-3">
        <button
          onClick={() => setLocation("/")}
          aria-label={t("Back")}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white border border-white/25 shadow-sm"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          onClick={toggleLanguage}
          aria-label={t("Switch Language")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-medium tracking-wider uppercase border border-white/25 shadow-sm"
          data-testid="button-language-toggle"
        >
          <Globe className="w-3 h-3" />
          {language === "en" ? "عربي" : "EN"}
        </button>
      </header>

      <div className="relative z-10 flex-1 w-full max-w-md mx-auto flex flex-col justify-end px-5 pb-6 mb-[144px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-4"
        >
          <h1
            className="font-serif text-[28px] text-white font-bold leading-[1.1] mb-1.5"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}
          >
            {t("Welcome")}
          </h1>
          <p
            className="text-white/80 text-[13px] font-light leading-relaxed"
            style={{ textShadow: "0 1px 10px rgba(0,0,0,0.3)" }}
          >
            {t("Discover the legacy")}
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSkipAsGuest}
          className="w-full rounded-2xl bg-white/15 backdrop-blur-lg p-3 flex items-center gap-3 mb-2.5 border border-white/25 text-left group shadow-[0_8px_32px_rgba(0,0,0,0.2)] "
          data-testid="button-begin-journey"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--copper)] flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
            <ChevronRight className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <span className="text-white text-[14px] font-bold tracking-[0.03em] block mb-0.5">
              {t("Begin Journey")}
            </span>
            <span className="text-white/60 text-[10px] font-light leading-snug block">
              {t("Discover the legacy")}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/50 flex-shrink-0" />
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="grid grid-cols-3 gap-2 mb-3"
        >
          <button
            onClick={() => setActiveOverlay("map")}
            className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl bg-white/12 backdrop-blur-md border border-white/20 hover:bg-white/20 active:scale-95 transition-all"
            data-testid="button-view-map"
          >
            <Map className="w-3.5 h-3.5 text-white/80" />
            <span className="text-[8px] font-semibold tracking-[0.05em] uppercase text-white/70">
              {t("Venue Map")}
            </span>
          </button>

          <button
            onClick={() => setActiveOverlay("guide")}
            className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl bg-white/12 backdrop-blur-md border border-white/20 hover:bg-white/20 active:scale-95 transition-all"
            data-testid="button-event-guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-white/80" />
            <span className="text-[8px] font-semibold tracking-[0.05em] uppercase text-white/70">
              {t("Competition Guide")}
            </span>
          </button>

          <button
            onClick={() => setLocation("/race")}
            className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl bg-gradient-to-br from-[#C4883A]/20 to-[#B89B71]/20 backdrop-blur-md border border-[#C4883A]/30 hover:bg-[#C4883A]/30 active:scale-95 transition-all"
            data-testid="button-horse-race"
          >
            <Trophy className="w-3.5 h-3.5 text-[#C4883A]" />
            <span className="text-[8px] font-semibold tracking-[0.05em] uppercase text-[#C4883A]/90">
              {t("Horse Race")}
            </span>
          </button>

        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <button
            className="w-full h-10 text-white/50 hover:text-white/80 text-[11px] font-medium tracking-[0.1em] uppercase transition-all duration-200 active:scale-95"
            onClick={handleSkipAsGuest}
            data-testid="button-skip-guest"
          >
            {t("Skip as Guest")}
          </button>
        </motion.div>
      </div>

      <AnimatePresence>
        {activeOverlay === "map" && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]"
          >
            <div className="flex justify-between items-center px-5 pt-6 pb-2">
              <button
                onClick={closeOverlay}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-main)]"
                data-testid="button-close-map"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="font-serif text-lg text-[var(--text-main)] tracking-wide">
                {t("Heritage Trail Map")}
              </h3>
              <div className="w-9" />
            </div>
            <div className="flex-1 px-3 pb-3 overflow-hidden">
              <VenueTreeMap />
            </div>
          </motion.div>
        )}

        {activeOverlay === "guide" && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)] overflow-y-auto"
          >
            <div className="flex justify-between items-center px-5 pt-8 pb-3">
              <button
                onClick={closeOverlay}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-main)]"
                data-testid="button-close-guide"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="font-serif text-lg text-[var(--text-main)] tracking-wide">
                {t("Competition Guide")}
              </h3>
              <div className="w-9" />
            </div>

            <div className="px-6 pb-8">
              <div className="bg-[var(--copper)]/10 border border-[var(--copper)]/20 rounded-xl p-4 mb-6">
                <ReadMoreSheet
                  text={t("guide_goal")}
                  lines={3}
                  title={t("Competition Guide")}
                  textClassName="text-[var(--primary)] text-sm font-medium leading-relaxed text-center"
                />
              </div>

              <p className="text-[var(--text-muted)] text-sm uppercase tracking-[0.15em] font-bold mb-4">
                {t("guide_how_it_works")}
              </p>

              <div className="space-y-1">
                {GUIDE_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const isLast = i === GUIDE_STEPS.length - 1;
                  return (
                    <div key={i} data-testid={`guide-step-${i}`}>
                      <div className="flex items-start gap-4 py-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--copper)]/15 flex items-center justify-center border border-[var(--copper)]/30">
                          <Icon className="w-5 h-5 text-[var(--copper)]" />
                        </div>
                        <div className="flex-1 pt-0.5">
                          <h4 className="text-[var(--text-main)] text-sm font-medium mb-0.5">
                            {t(step.titleKey)}
                          </h4>
                          <p className="text-[var(--text-muted)] text-sm font-light leading-relaxed">
                            {t(step.descKey)}
                          </p>
                        </div>
                      </div>
                      {!isLast && (
                        <div className="flex items-center gap-4">
                          <div className="w-10 flex justify-center">
                            <div className="w-px h-4 bg-[var(--copper)]/30" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
                <ReadMoreSheet
                  text={t("guide_note")}
                  lines={3}
                  title={t("Competition Guide")}
                  textClassName="text-[var(--text-muted)] text-sm font-light leading-relaxed text-center"
                />
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  className="w-full h-13 btn-vivid rounded-2xl text-sm font-semibold tracking-[0.1em] uppercase shadow-[0_6px_20px_rgba(92,61,46,0.18)] transition-all duration-300 border-0"
                  onClick={() => {
                    setActiveOverlay(null);
                    handleSkipAsGuest();
                  }}
                  data-testid="button-guide-begin"
                >
                  {t("guide_lets_begin")}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

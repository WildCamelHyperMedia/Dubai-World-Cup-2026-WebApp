import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useJourney } from "@/lib/JourneyContext";
import { HORSES, type BaseHorse } from "@/lib/horses";

export default function HorseSelect() {
  const [, setLocation] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const { t } = useTranslation();
  const { setBaseHorse, setHorseName, horseName } = useJourney();
  const [nameInput, setNameInput] = useState(horseName || "");

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchDelta = useRef(0);

  const selected = HORSES[currentIndex];

  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= HORSES.length) return;
      setDirection(idx > currentIndex ? 1 : -1);
      setCurrentIndex(idx);
    },
    [currentIndex]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchDelta.current = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(touchDelta.current) > 60) {
      if (touchDelta.current < 0 && currentIndex < HORSES.length - 1) {
        goTo(currentIndex + 1);
      } else if (touchDelta.current > 0 && currentIndex > 0) {
        goTo(currentIndex - 1);
      }
    }
  };

  const handleConfirm = () => {
    localStorage.setItem("selectedHorse", selected.id);
    setBaseHorse(selected.id as BaseHorse);
    setHorseName(nameInput.trim());
    setLocation("/journey");
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div className="h-screen h-[100dvh] w-full flex flex-col relative overflow-hidden font-sans bg-[var(--bg)]">
      <div className="absolute inset-0 z-0">
        <img src="/images/hoof-pattern.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.25] pointer-events-none" />
      </div>
      <header className="relative z-20 flex items-center justify-between px-5 pb-0 pt-[60px]">
        <button
          onClick={() => setLocation("/register")}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-1)] text-[var(--text-main)] border border-[var(--border)] shadow-sm"
          data-testid="button-back-register"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <span className="text-[14px] tracking-[0.3em] uppercase text-[var(--copper)] font-bold block text-shadow-warm">
            {t("Choose Your Companion")}
          </span>
        </div>
        <div className="w-8" />
      </header>
      <div
        ref={containerRef}
        className="flex-1 relative z-10 flex flex-col items-center justify-start overflow-hidden pt-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        data-testid="horse-carousel"
      >
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[70vw] h-[70vw] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(196,136,58,0.15), transparent 60%)" }}
        />

        <div className="relative w-full flex-1 flex items-center justify-center px-8">
          {currentIndex > 0 && (
            <button
              onClick={() => goTo(currentIndex - 1)}
              className="absolute left-3 z-30 w-10 h-10 rounded-full bg-[var(--surface-1)]/80 backdrop-blur-sm border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shadow-md sadu-fab"
              data-testid="button-horse-prev"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={selected.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full max-w-[320px] flex flex-col items-center"
            >
              <div className="relative w-[75%] max-w-[260px] aspect-square mb-4 mx-auto">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-6 bg-[var(--primary)]/8 blur-2xl rounded-[100%]" />
                <img
                  src={selected.image}
                  alt={t(selected.nameKey)}
                  className="w-full h-full object-contain drop-shadow-[0_16px_48px_rgba(92,61,46,0.2)]"
                  data-testid="img-selected-horse"
                />
              </div>

              <h2
                className="font-serif text-[26px] text-[var(--primary)] font-bold text-center mb-1"
                data-testid="text-horse-name"
              >
                {t(selected.nameKey)}
              </h2>
              <p className="text-[var(--text-muted)] text-[13px] font-light leading-relaxed text-center max-w-[240px] mb-3">
                {t(selected.descKey)}
              </p>

              <div className="w-full max-w-[240px]">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={t("Name your horse...")}
                  maxLength={20}
                  className="w-full h-[42px] px-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] text-[var(--primary)] text-[14px] text-center font-serif placeholder:text-[var(--text-muted)]/50 placeholder:font-sans placeholder:text-[12px] focus:outline-none focus:border-[var(--copper)] focus:ring-1 focus:ring-[var(--copper)]/30 transition-all shadow-heritage-sm"
                  data-testid="input-horse-name"
                />
              </div>
            </motion.div>
          </AnimatePresence>

          {currentIndex < HORSES.length - 1 && (
            <button
              onClick={() => goTo(currentIndex + 1)}
              className="absolute right-3 z-30 w-10 h-10 rounded-full bg-[var(--surface-1)]/80 backdrop-blur-sm border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shadow-md sadu-fab"
              data-testid="button-horse-next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      <div className="relative z-20 px-6 pb-6 pt-3 -mt-10">
        <div className="flex justify-center gap-2 mb-4">
          {HORSES.map((horse, i) => (
            <button
              key={horse.id}
              onClick={() => goTo(i)}
              className={`transition-all duration-300 rounded-full ${
                i === currentIndex
                  ? "w-7 h-2 bg-[var(--copper)]"
                  : "w-2 h-2 bg-[var(--border)] hover:bg-[var(--text-muted)]"
              }`}
              data-testid={`button-horse-dot-${horse.id}`}
            />
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleConfirm}
          className="w-full h-[50px] btn-vivid rounded-2xl text-[13px] tracking-[0.15em] uppercase flex items-center justify-center gap-2 shadow-heritage-lg border-0 mt-[50px] mb-[50px]"
          data-testid="button-confirm-horse"
        >
          <Check className="w-4 h-4" />
          {t("Confirm Selection")}
        </motion.button>
      </div>
    </div>
  );
}

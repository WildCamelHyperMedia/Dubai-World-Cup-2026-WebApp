import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone } from "lucide-react";

function RotatePrompt({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center gap-6"
      data-testid="rotate-prompt"
    >
      <motion.div
        animate={{ rotate: [0, -90, -90, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", times: [0, 0.3, 0.7, 1] }}
        className="relative"
      >
        <Smartphone className="w-20 h-20 text-white/80" />
      </motion.div>

      <div className="text-center px-8">
        <p className="text-white text-lg font-semibold mb-2">
          {t("Rotate your phone")}
        </p>
        <p className="text-white/50 text-sm font-light leading-relaxed">
          {t("For the best map experience, turn your device sideways")}
        </p>
      </div>

      <button
        onClick={onDismiss}
        className="mt-4 px-8 py-3 rounded-full bg-[var(--copper,#C4883A)] text-white text-sm tracking-[0.1em] uppercase font-semibold shadow-lg"
        data-testid="button-dismiss-rotate"
      >
        {t("Got it")}
      </button>
    </motion.div>
  );
}

export default function VenueTreeMap() {
  const { t } = useTranslation();
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [viewportSize, setViewportSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const portrait = w < h;
      setViewportSize({ w, h });
      setIsPortrait(portrait);
      if (portrait) {
        setShowRotatePrompt(true);
      }
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  const mapContent = (
    <div className="relative w-full h-full bg-black">
      <img
        src={`${import.meta.env.BASE_URL}images/heritage-trail-map-labeled.jpg`}
        alt={t("Heritage Trail Map")}
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );

  return (
    <div className="relative w-full h-full" data-testid="venue-tree-map">
      <AnimatePresence>
        {showRotatePrompt && isPortrait && (
          <RotatePrompt onDismiss={() => setShowRotatePrompt(false)} />
        )}
      </AnimatePresence>

      {isPortrait ? (
        <div
          className="absolute top-1/2 left-1/2"
          style={{
            width: `${viewportSize.h}px`,
            height: `${viewportSize.w}px`,
            transform: "translate(-50%, -50%) rotate(90deg)",
          }}
        >
          {mapContent}
        </div>
      ) : (
        <div className="w-full h-full">
          {mapContent}
        </div>
      )}
    </div>
  );
}

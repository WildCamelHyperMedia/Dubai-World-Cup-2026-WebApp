import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Sparkles, Check, Paintbrush, ArrowRight, X, MapPin, QrCode, UserPlus, Shield, Trophy, Gift, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useJourney } from "@/lib/JourneyContext";
import { CRAFT_DATA, STATION_IDS, ACTIVE_STATION_COUNT, STATION_OPTIONS, type ActiveStationId } from "@/lib/crafts";
import { getCombinedImagePath } from "@/lib/getImagePath";
import { useTranslation } from "react-i18next";
import ReadMoreSheet from "@/components/ReadMoreSheet";
import dwc30Logo from "@/assets/images/dwc-30th-logo-04-cropped.png";

const STATION_NAMES: Record<string, string> = {
  talli: "Al Talli",
  sadu: "Sadu",
  saddle: "Leather",
  pottery: "Pottery",
  alkhous: "Al Khous",
};

export default function Station() {
  const params = useParams<{ id: string }>();
  const stationId = params.id || "talli";
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { setCustomization, customizations, baseHorse, horseName, addPoints, isGuest, participantId } =
    useJourney();
  const needsRegistration = isGuest || !participantId;
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const isActiveStation = (STATION_IDS as readonly string[]).includes(stationId);

  useEffect(() => {
    if (!isActiveStation) {
      setLocation("/journey");
    }
  }, [isActiveStation, setLocation]);

  if (!isActiveStation) return null;
  const craft = CRAFT_DATA[stationId as ActiveStationId];
  const options = STATION_OPTIONS[stationId as ActiveStationId];
  if (!craft || !options) return null;

  const currentIdx = (STATION_IDS as readonly string[]).indexOf(stationId);
  const nextStationId = currentIdx < STATION_IDS.length - 1 ? STATION_IDS[currentIdx + 1] : null;
  const nextStationName = nextStationId ? STATION_NAMES[nextStationId] : null;
  const activeCustomizations = Object.keys(customizations).filter(k => (STATION_IDS as readonly string[]).includes(k));
  const customizedCount = activeCustomizations.length;
  const completedCountAfterEquip = customizedCount + (customizations[stationId] ? 0 : 1);
  const allDoneAfterEquip = completedCountAfterEquip >= ACTIVE_STATION_COUNT;
  const alreadyCustomized = !!customizations[stationId];
  const currentOptionId = customizations[stationId] || null;

  useEffect(() => {
    if (currentOptionId) {
      setSelectedOption(currentOptionId);
    }
  }, [currentOptionId]);

  const handleEquip = () => {
    const optionToSave = selectedOption || options[0].id;
    if (!alreadyCustomized) {
      setCustomization(stationId, optionToSave);
      addPoints(10);
    } else if (customizations[stationId] !== optionToSave) {
      setCustomization(stationId, optionToSave);
    }
    setShowPopup(true);
  };

  const handleSkip = () => {
    setLocation("/journey");
  };

  const handlePopupDismiss = () => {
    setShowPopup(false);
    setLocation("/journey");
  };

  const handlePopupRegister = () => {
    setShowPopup(false);
    setLocation("/register");
  };

  const handlePopupCapture = () => {
    setShowPopup(false);
    setLocation("/capture");
  };

  const previewOptionId = selectedOption || options[0].id;
  const horsePreviewSrc = getCombinedImagePath(
    baseHorse,
    customizations,
    stationId,
    previewOptionId
  );

  const chapterNumber = (STATION_IDS as readonly string[]).indexOf(stationId) + 1;

  return (
    <div className="h-screen h-[100dvh] w-full flex flex-col relative overflow-hidden font-sans bg-[var(--bg)]">
      <img src={`${import.meta.env.BASE_URL}images/hoof-pattern.png`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.25] pointer-events-none z-0" />
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto hide-scrollbar">
              <div className="relative w-full h-[35vh] min-h-[200px] overflow-hidden">
                <img
                  src={craft.heritageImage}
                  alt={t(craft.heritageTitle)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[var(--bg)]" />

                <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-5 pt-5">
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-white border border-white/20"
                    onClick={() => setLocation("/journey")}
                    data-testid="button-back-journey"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <img
                    src={dwc30Logo}
                    alt="DWC 30th"
                    className="h-8 object-contain"
                    style={{ filter: "brightness(0) invert(1)" }}
                  />
                  <div className="w-8" />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-[2px] bg-[var(--copper)]" />
                    <span className="text-[var(--copper)] text-[10px] tracking-[0.25em] uppercase font-bold">
                      {t("Discover the Craft")} — {chapterNumber}/{ACTIVE_STATION_COUNT}
                    </span>
                  </div>
                  <h1
                    className="font-serif text-[28px] text-[var(--primary)] leading-[1.1] font-bold text-shadow-warm"
                    data-testid="text-chapter-title"
                  >
                    {t(craft.heritageTitle)}
                  </h1>
                </div>
              </div>

              <div className="px-5 pt-3 pb-3">
                {craft.heritageTagline && (
                  <div className="mb-5 pl-4 border-l-2 border-[var(--copper)]/40">
                    <p className="text-[var(--terracotta)] text-sm leading-[1.8] italic font-light opacity-80">
                      "{t(craft.heritageTagline)}"
                    </p>
                  </div>
                )}

                <ReadMoreSheet
                  text={t(craft.heritageBody)}
                  lines={4}
                  title={t(craft.heritageTitle)}
                />
              </div>

              <div className="h-24" />
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent pt-5 pb-6 px-5">
              <div className="flex gap-2.5">
                <button
                  className="h-[46px] px-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)] text-[11px] tracking-[0.1em] uppercase font-medium hover:border-[var(--primary)]/30 transition-all"
                  onClick={handleSkip}
                  data-testid="button-skip-station"
                >
                  {t("Skip")}
                </button>
                <Button
                  className="flex-1 h-[46px] btn-vivid rounded-2xl font-semibold tracking-[0.15em] text-[12px] uppercase shadow-[0_6px_24px_rgba(92,61,46,0.2)] border-0 flex items-center justify-center gap-2"
                  onClick={() => setStep(2)}
                  data-testid="button-customize-horse"
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  {t("Customize Horse")}
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="relative z-20 flex items-center gap-2.5 px-5 pt-5 pb-2">
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-muted)]"
                  onClick={() => setStep(1)}
                  data-testid="button-back-to-info"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex-1">
                  <p className="text-[9px] tracking-[0.2em] uppercase text-[var(--text-muted)] font-bold">
                    {t("Step")} 2 / 2
                  </p>
                  <h2 className="font-serif text-base text-[var(--primary)] font-bold leading-tight">
                    {t("Choose Your Style")}
                  </h2>
                </div>
                <img
                  src={dwc30Logo}
                  alt="DWC 30th"
                  className="h-7 object-contain opacity-40"
                  style={{ filter: "brightness(0)" }}
                />
              </div>

              <div className="px-5 pt-2 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-[2px] bg-[var(--copper)]" />
                  <span className="text-[11px] tracking-[0.2em] uppercase text-[var(--text-muted)] font-bold">
                    {t(craft.heritageTitle)}
                  </span>
                </div>

                <div className="flex gap-2.5">
                  {options.map((option) => {
                    const isSelected = selectedOption === option.id || (!selectedOption && option.id === options[0].id);
                    return (
                      <button
                        key={option.id}
                        onClick={() => setSelectedOption(option.id)}
                        className={`flex-1 rounded-2xl border-2 p-3 transition-all duration-200 ${
                          isSelected
                            ? "border-[var(--copper)] bg-[var(--copper)]/10 shadow-[0_0_16px_rgba(196,136,58,0.15)]"
                            : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--primary)]/30"
                        }`}
                        data-testid={`button-option-${option.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? "border-[var(--copper)] bg-[var(--copper)]" : "border-[var(--border)]"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-sm font-semibold ${isSelected ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}>
                            {t(option.label)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center px-4 min-h-0">
                <div className="relative w-full max-w-[320px] aspect-square" style={{ maxHeight: "40vh" }}>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-[var(--primary)]/10 blur-3xl rounded-[100%]" />
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={previewOptionId}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4 }}
                      src={horsePreviewSrc}
                      className="w-full h-full object-contain drop-shadow-[0_16px_48px_rgba(92,61,46,0.2)]"
                      alt="Horse Preview"
                      data-testid="img-horse-preview"
                    />
                  </AnimatePresence>
                  {horseName && (
                    <p className="absolute -bottom-1 left-1/2 -translate-x-1/2 font-serif text-[14px] text-[var(--copper)] whitespace-nowrap" data-testid="text-horse-name-station">
                      {horseName}
                    </p>
                  )}
                </div>
              </div>

              <div className="h-8" />
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent pt-4 pb-5 px-5">
              <div className="flex gap-2.5">
                <button
                  className="h-[44px] px-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)] text-[11px] tracking-[0.1em] uppercase font-medium hover:border-[var(--primary)]/30 transition-all"
                  onClick={() => setStep(1)}
                  data-testid="button-back-step1"
                >
                  {t("Back")}
                </button>
                <Button
                  className="flex-1 h-[44px] btn-vivid rounded-2xl font-semibold tracking-[0.15em] text-[12px] uppercase shadow-heritage-lg border-0 flex items-center justify-center gap-2"
                  onClick={handleEquip}
                  data-testid="button-equip"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {alreadyCustomized ? t("Update & Continue") : t("Equip & Continue")}
                </Button>
              </div>
              <button
                className="w-full mt-2 h-9 text-[var(--text-muted)] text-xs tracking-[0.1em] uppercase font-medium hover:text-[var(--primary)] transition-colors"
                onClick={handleSkip}
                data-testid="button-skip-customize"
              >
                {t("Skip")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPopup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={handlePopupDismiss}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-[calc(100vw-2rem)] bg-[var(--surface-1)] rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-[var(--border)] sadu-popup max-h-[85dvh] overflow-y-auto pointer-events-auto"
                data-testid="popup-post-equip"
              >
              <div className="relative px-6 pt-6 pb-2">
                <button
                  onClick={handlePopupDismiss}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  data-testid="button-close-popup"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--copper)]/15 flex items-center justify-center">
                    {needsRegistration ? (
                      <UserPlus className="w-5 h-5 text-[var(--copper)]" />
                    ) : allDoneAfterEquip ? (
                      <Award className="w-5 h-5 text-[#C0C0C0]" />
                    ) : (
                      <Check className="w-5 h-5 text-[var(--copper)]" />
                    )}
                  </div>
                  <h3 className="font-serif text-xl text-[var(--primary)] font-bold leading-tight pr-8">
                    {needsRegistration
                      ? t("popup_register_title")
                      : allDoneAfterEquip
                        ? t("popup_all_complete_title")
                        : t("popup_journey_continues_title")}
                  </h3>
                </div>
              </div>

              <div className="px-6 pb-6">
                {needsRegistration ? (
                  <div className="space-y-3 mb-5">
                    <div className="flex items-start gap-3">
                      <Shield className="w-4 h-4 text-[var(--godolphin-blue)] mt-0.5 flex-shrink-0" />
                      <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                        {t("popup_register_save")}
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Trophy className="w-4 h-4 text-[var(--terracotta)] mt-0.5 flex-shrink-0" />
                      <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                        {t("popup_register_eligible")}
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Gift className="w-4 h-4 text-[var(--sage-green)] mt-0.5 flex-shrink-0" />
                      <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                        {t("popup_register_guest")}
                      </p>
                    </div>
                  </div>
                ) : allDoneAfterEquip ? (
                  <div className="mb-5">
                    <div className="flex flex-col items-center text-center mb-4">
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                        className="relative w-20 h-20 mb-3"
                      >
                        <img
                          src={`${import.meta.env.BASE_URL}images/badges/silver-badge.png`}
                          alt="Silver Badge"
                          className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(192,192,192,0.5)]"
                          data-testid="img-silver-badge-station"
                        />
                        <motion.div
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                          className="absolute -inset-1 rounded-full border-2 border-[#C0C0C0]/40"
                        />
                      </motion.div>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-xs tracking-[0.2em] uppercase font-bold text-[#A0A0A0] mb-1"
                      >
                        {t("badge_unlocked")}
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="font-serif text-lg text-[var(--primary)] font-bold"
                      >
                        {t("badge_silver_title")}
                      </motion.p>
                    </div>
                    <p className="text-[var(--text-muted)] text-sm leading-relaxed text-center">
                      {t("popup_all_complete_desc")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 mb-5">
                    <div className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-[var(--sage-green)] mt-0.5 flex-shrink-0" />
                      <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                        {t("popup_journey_continues_equipped", { station: t(STATION_NAMES[stationId] || stationId) })}
                      </p>
                    </div>
                    {nextStationName && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-[var(--godolphin-blue)] mt-0.5 flex-shrink-0" />
                        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                          {t("popup_journey_continues_next", { nextStation: t(nextStationName) })}
                        </p>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <QrCode className="w-4 h-4 text-[var(--copper)] mt-0.5 flex-shrink-0" />
                      <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                        {t("popup_journey_continues_scan")}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  {needsRegistration ? (
                    <>
                      <button
                        onClick={handlePopupDismiss}
                        className="flex-1 h-12 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)] text-xs tracking-[0.1em] uppercase font-medium transition-all"
                        data-testid="button-popup-continue-guest"
                      >
                        {t("popup_continue_button")}
                      </button>
                      <button
                        onClick={handlePopupRegister}
                        className="flex-1 h-12 btn-vivid rounded-2xl text-sm font-semibold tracking-[0.1em] uppercase border-0 flex items-center justify-center gap-2 shadow-md"
                        data-testid="button-popup-register"
                      >
                        <UserPlus className="w-4 h-4" />
                        {t("popup_register_button")}
                      </button>
                    </>
                  ) : allDoneAfterEquip ? (
                    <button
                      onClick={handlePopupCapture}
                      className="w-full h-12 btn-vivid rounded-2xl text-sm font-semibold tracking-[0.1em] uppercase border-0 flex items-center justify-center gap-2 shadow-md"
                      data-testid="button-popup-go-capture"
                    >
                      <Sparkles className="w-4 h-4" />
                      {t("popup_go_capture")}
                    </button>
                  ) : (
                    <button
                      onClick={handlePopupDismiss}
                      className="w-full h-12 btn-vivid rounded-2xl text-sm font-semibold tracking-[0.1em] uppercase border-0 flex items-center justify-center gap-2 shadow-md"
                      data-testid="button-popup-continue"
                    >
                      <ArrowRight className="w-4 h-4" />
                      {t("popup_continue_button")}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

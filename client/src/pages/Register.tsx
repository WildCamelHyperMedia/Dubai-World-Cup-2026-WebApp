import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  X,
  Globe,
  Map,
  BookOpen,
  UserPlus,
  QrCode,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Mail,
  Trophy,
  Shield,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "react-i18next";
import { useJourney } from "@/lib/JourneyContext";
import { apiRequest } from "@/lib/queryClient";
import OTPInput from "@/components/OTPInput";

import VenueTreeMap from "@/components/VenueTreeMap";
import ReadMoreSheet from "@/components/ReadMoreSheet";

type ActiveOverlay = null | "map" | "guide" | "register";
type SignupStep = "form" | "otp";
type LoginStep = "identifier" | "otp";

export default function Register() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { setParticipantId, language, setLanguage, isGuest, participantId } = useJourney();
  const [loading, setLoading] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [authTab, setAuthTab] = useState<"signup" | "login">("signup");
  const modalRef = useRef<HTMLDivElement>(null);

  const [signupStep, setSignupStep] = useState<SignupStep>("form");
  const [signupOtp, setSignupOtp] = useState("");
  const [signupError, setSignupError] = useState("");

  const [loginStep, setLoginStep] = useState<LoginStep>("identifier");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginError, setLoginError] = useState("");

  const [resendTimer, setResendTimer] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    consent: false,
  });

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (isGuest && participantId) {
      setShowGuestPrompt(true);
    }
  }, [isGuest, participantId]);

  const closeOverlay = useCallback(() => {
    if (loading) return;
    setActiveOverlay(null);
  }, [loading]);

  const resetForms = useCallback(() => {
    setSignupStep("form");
    setSignupOtp("");
    setSignupError("");
    setLoginStep("identifier");
    setLoginOtp("");
    setLoginError("");
    setResendTimer(0);
  }, []);

  useEffect(() => {
    if (!activeOverlay) {
      resetForms();
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOverlay();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeOverlay, closeOverlay, resetForms]);

  useEffect(() => {
    if (activeOverlay === "register" && modalRef.current) {
      const firstInput = modalRef.current.querySelector("input");
      firstInput?.focus();
    }
  }, [activeOverlay]);

  const sendOtp = async (identifier: string, type: "signup" | "login") => {
    const res = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, type }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.error === "rate_limited") throw new Error(t("otp_rate_limited"));
      if (data.error === "not_found") throw new Error(t("login_not_found"));
      if (data.error === "delivery_failed")
        throw new Error(t("otp_delivery_failed"));
      if (data.error === "internal_error")
        throw new Error(t("otp_send_error"));
      throw new Error(t("otp_send_error"));
    }
    return data;
  };

  const verifyOtp = async (
    identifier: string,
    code: string,
    type: "signup" | "login"
  ): Promise<string> => {
    const res = await fetch("/api/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, code, type }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.error === "expired_code") throw new Error(t("otp_expired"));
      if (data.error === "invalid_code") throw new Error(t("otp_invalid"));
      if (data.error === "too_many_attempts")
        throw new Error(t("otp_too_many_attempts"));
      throw new Error(t("otp_verify_error"));
    }
    return data.verificationToken;
  };

  const handleSignupSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSignupError("");
    try {
      await sendOtp(formData.email.trim().toLowerCase(), "signup");
      setSignupStep("otp");
      setResendTimer(60);
    } catch (err: any) {
      setSignupError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupVerifyAndRegister = async () => {
    if (signupOtp.replace(/\s/g, "").length !== 6) return;
    setLoading(true);
    setSignupError("");
    try {
      const token = await verifyOtp(
        formData.email.trim().toLowerCase(),
        signupOtp,
        "signup"
      );
      const res = await apiRequest("POST", "/api/participants", {
        ...formData,
        verificationToken: token,
      });
      const participant = await res.json();
      setParticipantId(participant.id);
      setLocation("/select-horse");
    } catch (err: any) {
      setSignupError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async (
    identifier: string,
    type: "signup" | "login"
  ) => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await sendOtp(identifier.trim().toLowerCase(), type);
      setResendTimer(60);
      if (type === "signup") {
        setSignupError("");
        setSignupOtp("");
      } else {
        setLoginError("");
        setLoginOtp("");
      }
    } catch (err: any) {
      if (type === "signup") setSignupError(err.message);
      else setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");
    try {
      await sendOtp(loginIdentifier.trim().toLowerCase(), "login");
      setLoginStep("otp");
      setResendTimer(60);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginVerify = async () => {
    if (loginOtp.replace(/\s/g, "").length !== 6) return;
    setLoading(true);
    setLoginError("");
    try {
      let token: string;
      try {
        token = await verifyOtp(
          loginIdentifier.trim().toLowerCase(),
          loginOtp,
          "login"
        );
      } catch (err: any) {
        setLoginError(err.message);
        return;
      }
      const res = await fetch("/api/participants/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginIdentifier.trim().toLowerCase(),
          verificationToken: token,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.error === "otp_not_verified") {
          setLoginError(t("otp_verify_error"));
        } else {
          setLoginError(t("login_not_found"));
        }
        return;
      }
      const participant = await res.json();
      setParticipantId(participant.id);
      setLocation("/select-horse");
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipAsGuest = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/participants", {
        isGuest: true,
      });
      const participant = await res.json();
      setParticipantId(participant.id);
      setLocation("/select-horse");
    } catch (err) {
      console.error("Guest registration failed:", err);
    } finally {
      setLoading(false);
    }
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

  const renderOtpVerification = (
    otp: string,
    setOtp: (v: string) => void,
    error: string,
    identifier: string,
    type: "signup" | "login",
    onVerify: () => void,
    onBack: () => void
  ) => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm mb-4 transition-colors"
        data-testid="button-otp-back"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t("Back")}
      </button>

      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--copper)]/15 flex items-center justify-center border border-[var(--copper)]/30">
          <CheckCircle2 className="w-7 h-7 text-[var(--copper)]" />
        </div>
        <h3 className="text-[var(--text-main)] text-lg font-medium mb-1">
          {t("otp_verification_title")}
        </h3>
        <p className="text-[var(--text-muted)] text-sm font-light leading-relaxed">
          {t("otp_sent_to")}{" "}
          <span className="text-[var(--primary)]">{identifier}</span>
        </p>
      </div>

      <div className="mb-6">
        <OTPInput value={otp} onChange={setOtp} disabled={loading} />
      </div>

      {error && (
        <p
          className="text-[var(--terracotta)] text-sm text-center mb-4"
          data-testid="text-otp-error"
        >
          {error}
        </p>
      )}

      <Button
        type="button"
        disabled={loading || otp.replace(/\s/g, "").length !== 6}
        className="w-full h-13 btn-vivid rounded-2xl text-sm font-semibold tracking-[0.1em] uppercase shadow-[0_6px_20px_rgba(92,61,46,0.18)] transition-all duration-300 border-0 disabled:opacity-50"
        onClick={onVerify}
        data-testid="button-verify-otp"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          t("otp_verify_button")
        )}
      </Button>

      <div className="mt-4 text-center">
        <p className="text-[var(--text-muted)] text-sm mb-1">
          {t("otp_didnt_receive")}
        </p>
        <button
          type="button"
          disabled={resendTimer > 0 || loading}
          onClick={() => handleResendOtp(identifier, type)}
          className="text-[var(--copper)] text-sm font-medium hover:underline disabled:opacity-50 disabled:no-underline"
          data-testid="button-resend-otp"
        >
          {resendTimer > 0
            ? `${t("otp_resend_in")} ${resendTimer}s`
            : t("otp_resend")}
        </button>
      </div>

      <p className="text-[var(--text-muted)]/60 text-sm text-center mt-4">
        {t("otp_expires_note")}
      </p>

      <div className="mt-4 mx-auto max-w-xs rounded-xl border border-[var(--copper)]/30 bg-[var(--copper)]/10 px-4 py-2.5">
        <p className="text-[var(--copper)] text-xs text-center font-medium leading-relaxed" data-testid="text-spam-notice">
          Can't find the code? Please check your spam or junk folder.
        </p>
      </div>
    </motion.div>
  );

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
          <source src="/videos/heritage_horse_dubai.mp4" type="video/mp4" />
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
          onClick={() => setActiveOverlay("register")}
          className="w-full rounded-2xl bg-white/15 backdrop-blur-lg p-3 flex items-center gap-3 mb-2.5 border border-white/25 text-left group shadow-[0_8px_32px_rgba(0,0,0,0.2)] "
          data-testid="button-login-signup"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--copper)] flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
            <UserPlus className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <span className="text-white text-[14px] font-bold tracking-[0.03em] block mb-0.5">
              {t("Login / Sign Up")}
            </span>
            <span className="text-white/60 text-[10px] font-light leading-snug block">
              {t("Enter your details to save your progress")}
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
            onClick={() => window.location.href = "https://race.drc30.ae"}
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
            disabled={loading}
            data-testid="button-skip-guest"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              t("Skip as Guest")
            )}
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
                  disabled={loading}
                  data-testid="button-guide-begin"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    t("guide_lets_begin")
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-12 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl text-sm font-medium tracking-[0.1em] uppercase"
                  onClick={() => {
                    setActiveOverlay("register");
                  }}
                  data-testid="button-guide-register"
                >
                  {t("Login / Sign Up")}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {activeOverlay === "register" && (
          <motion.div
            ref={modalRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="registration-dialog-title"
          >
            <div className="flex justify-between items-center px-5 pt-8 pb-3">
              <button
                onClick={closeOverlay}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-main)]"
                data-testid="button-close-modal"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3
                id="registration-dialog-title"
                className="font-serif text-lg text-[var(--text-main)] tracking-wide"
              >
                {authTab === "signup"
                  ? signupStep === "otp"
                    ? t("otp_verification_title")
                    : t("Guest Registration")
                  : loginStep === "otp"
                    ? t("otp_verification_title")
                    : t("Welcome back")}
              </h3>
              <div className="w-9" />
            </div>

            <div className="px-6 pb-8">
              {(signupStep === "form" && authTab === "signup") ||
              (loginStep === "identifier" && authTab === "login") ? (
                <div className="flex mb-6 rounded-xl overflow-hidden border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab("signup");
                      setLoginError("");
                    }}
                    className="flex-1 py-2.5 text-sm font-medium uppercase tracking-[0.1em] transition-all"
                    style={{
                      background:
                        authTab === "signup" ? "var(--primary)" : "transparent",
                      color: authTab === "signup" ? "white" : "var(--text-muted)",
                    }}
                    data-testid="tab-signup"
                  >
                    {t("Sign Up")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab("login");
                      setSignupError("");
                    }}
                    className="flex-1 py-2.5 text-sm font-medium uppercase tracking-[0.1em] transition-all"
                    style={{
                      background:
                        authTab === "login" ? "var(--primary)" : "transparent",
                      color: authTab === "login" ? "white" : "var(--text-muted)",
                    }}
                    data-testid="tab-login"
                  >
                    {t("Login")}
                  </button>
                </div>
              ) : null}

              <AnimatePresence mode="wait">
                {authTab === "signup" ? (
                  signupStep === "form" ? (
                    <motion.div
                      key="signup-form"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <p className="text-[var(--text-muted)] text-sm font-light leading-relaxed mb-6">
                        {t("Enter your details to save your progress")}
                      </p>

                      <form
                        onSubmit={handleSignupSendOtp}
                        className="space-y-5"
                      >
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="reg-name"
                              className="text-[var(--text-muted)] text-sm uppercase tracking-[0.1em] font-medium"
                            >
                              {t("Full Name")}
                            </Label>
                            <Input
                              id="reg-name"
                              placeholder=""
                              className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl h-12 px-4 text-[var(--text-main)] focus-visible:ring-1 focus-visible:ring-[var(--copper)] text-sm placeholder:text-[var(--border)] transition-all"
                              required
                              value={formData.name}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  name: e.target.value,
                                })
                              }
                              data-testid="input-name"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label
                              htmlFor="reg-mobile"
                              className="text-[var(--text-muted)] text-sm uppercase tracking-[0.1em] font-medium"
                            >
                              {t("Mobile Number")}
                            </Label>
                            <Input
                              id="reg-mobile"
                              type="tel"
                              placeholder=""
                              className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl h-12 px-4 text-[var(--text-main)] focus-visible:ring-1 focus-visible:ring-[var(--copper)] text-sm placeholder:text-[var(--border)] transition-all"
                              required
                              value={formData.mobile}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  mobile: e.target.value,
                                })
                              }
                              data-testid="input-mobile"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label
                              htmlFor="reg-email"
                              className="text-[var(--text-muted)] text-sm uppercase tracking-[0.1em] font-medium"
                            >
                              {t("Email Address")}
                            </Label>
                            <Input
                              id="reg-email"
                              type="email"
                              placeholder=""
                              className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl h-12 px-4 text-[var(--text-main)] focus-visible:ring-1 focus-visible:ring-[var(--copper)] text-sm placeholder:text-[var(--border)] transition-all"
                              required
                              value={formData.email}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  email: e.target.value,
                                })
                              }
                              data-testid="input-email"
                            />
                          </div>

                        </div>

                        <div className="flex items-start space-x-3 pt-2">
                          <Checkbox
                            id="consent"
                            className="border-[var(--text-muted)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:border-[var(--primary)] mt-0.5 rounded-sm"
                            checked={formData.consent}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                consent: checked === true,
                              })
                            }
                            required
                            data-testid="checkbox-consent"
                          />
                          <Label
                            htmlFor="consent"
                            className="text-sm text-[var(--text-muted)] font-light leading-relaxed cursor-pointer"
                          >
                            {t("I accept the terms")}
                          </Label>
                        </div>

                        {signupError && (
                          <p
                            className="text-[var(--terracotta)] text-sm font-light"
                            data-testid="text-signup-error"
                          >
                            {signupError}
                          </p>
                        )}

                        <div className="pt-4 space-y-3">
                          <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-13 btn-vivid rounded-2xl text-sm font-semibold tracking-[0.1em] uppercase shadow-[0_6px_20px_rgba(92,61,46,0.18)] transition-all duration-300 border-0"
                            data-testid="button-submit"
                          >
                            {loading ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              t("Continue")
                            )}
                          </Button>

                          {!(
                            formData.name ||
                            formData.mobile ||
                            formData.email
                          ) && (
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={loading}
                              className="w-full h-12 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl text-sm font-medium tracking-[0.1em] uppercase"
                              onClick={handleSkipAsGuest}
                              data-testid="button-skip-guest-modal"
                            >
                              {t("Skip as Guest")}
                            </Button>
                          )}
                        </div>
                      </form>
                    </motion.div>
                  ) : (
                    <div key="signup-otp">
                      {renderOtpVerification(
                        signupOtp,
                        setSignupOtp,
                        signupError,
                        formData.email,
                        "signup",
                        handleSignupVerifyAndRegister,
                        () => {
                          setSignupStep("form");
                          setSignupError("");
                          setSignupOtp("");
                        }
                      )}
                    </div>
                  )
                ) : loginStep === "identifier" ? (
                  <motion.div
                    key="login-form"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <p className="text-[var(--text-muted)] text-sm font-light leading-relaxed mb-5">
                      {t("login_otp_desc")}
                    </p>

                    <form
                      onSubmit={handleLoginSendOtp}
                      className="space-y-5"
                    >
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="login-identifier"
                          className="text-[var(--text-muted)] text-sm uppercase tracking-[0.1em] font-medium"
                        >
                          {t("Email Address")}
                        </Label>
                        <Input
                          id="login-identifier"
                          type="email"
                          placeholder=""
                          className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl h-12 px-4 text-[var(--text-main)] focus-visible:ring-1 focus-visible:ring-[var(--copper)] text-sm placeholder:text-[var(--border)] transition-all"
                          required
                          value={loginIdentifier}
                          onChange={(e) => {
                            setLoginIdentifier(e.target.value);
                            setLoginError("");
                          }}
                          data-testid="input-login-identifier"
                        />
                      </div>

                      {loginError && (
                        <p
                          className="text-[var(--terracotta)] text-sm font-light"
                          data-testid="text-login-error"
                        >
                          {loginError}
                        </p>
                      )}

                      <div className="pt-4">
                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full h-13 btn-vivid rounded-2xl text-sm font-semibold tracking-[0.1em] uppercase shadow-[0_6px_20px_rgba(92,61,46,0.18)] transition-all duration-300 border-0"
                          data-testid="button-login-send-otp"
                        >
                          {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            t("otp_send_code")
                          )}
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  <div key="login-otp">
                    {renderOtpVerification(
                      loginOtp,
                      setLoginOtp,
                      loginError,
                      loginIdentifier.trim(),
                      "login",
                      handleLoginVerify,
                      () => {
                        setLoginStep("identifier");
                        setLoginError("");
                        setLoginOtp("");
                      }
                    )}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {createPortal(
        <AnimatePresence>
          {showGuestPrompt && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
                onClick={() => setShowGuestPrompt(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 60, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center px-5"
                data-testid="popup-guest-register"
              >
                <div className="bg-[var(--surface-1)] rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-[var(--border)] w-full max-w-sm">
                  <div className="relative px-5 pt-5 pb-2">
                    <button
                      onClick={() => setShowGuestPrompt(false)}
                      className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                      data-testid="button-close-guest-prompt"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[var(--copper)]/15 flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-[var(--copper)]" />
                      </div>
                      <h3 className="font-serif text-lg text-[var(--primary)] font-bold leading-tight pr-6">
                        {t("guest_prompt_title")}
                      </h3>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start gap-2.5">
                        <Shield className="w-3.5 h-3.5 text-[var(--godolphin-blue)] mt-0.5 flex-shrink-0" />
                        <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                          {t("popup_register_save")}
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Trophy className="w-3.5 h-3.5 text-[var(--terracotta)] mt-0.5 flex-shrink-0" />
                        <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                          {t("popup_register_eligible")}
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Gift className="w-3.5 h-3.5 text-[var(--sage-green)] mt-0.5 flex-shrink-0" />
                        <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                          {t("popup_register_guest")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => setShowGuestPrompt(false)}
                        className="flex-1 h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)] text-[10px] tracking-[0.1em] uppercase font-medium transition-all"
                        data-testid="button-guest-prompt-dismiss"
                      >
                        {t("popup_continue_button")}
                      </button>
                      <button
                        onClick={() => {
                          setShowGuestPrompt(false);
                          setActiveOverlay("register");
                        }}
                        className="flex-1 h-11 btn-vivid rounded-2xl text-xs font-semibold tracking-[0.1em] uppercase border-0 flex items-center justify-center gap-1.5 shadow-md"
                        data-testid="button-guest-prompt-register"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        {t("popup_register_button")}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

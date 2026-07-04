import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useJourney } from "@/lib/JourneyContext";
import { useTranslation } from "react-i18next";

import dwc30Logo from "@/assets/images/dwc-30th-logo-04-cropped.png";
import dubaiCultureLogo from "@/assets/images/dubai-culture-logo.png";

const racingVideo = `${import.meta.env.BASE_URL}videos/heritage_crafts_bg.mp4`;

export default function Home() {
  const [, setLocation] = useLocation();
  const { setLanguage } = useJourney();
  const { t } = useTranslation();

  const handleStart = (lang: "en" | "ar") => {
    setLanguage(lang);
    setLocation("/register");
  };

  return (
    <div className="relative h-screen h-[100dvh] w-full overflow-hidden flex flex-col font-sans bg-black">
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-[0.45]"
          data-testid="video-hero-bg"
        >
          <source src={racingVideo} type="video/mp4" />
        </video>
      </div>

      <div className="relative z-10 flex-1 flex flex-col px-6 pt-6 pb-6">
        <div className="flex-1 flex flex-col items-center justify-center -mt-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <img
              src={dwc30Logo}
              alt="DWC 30th Anniversary"
              className="w-[95%] max-w-[420px] object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
              style={{ filter: "brightness(0) invert(1)" }}
              data-testid="img-logo"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-8 text-center"
          >
            <h1
              className="font-serif text-[24px] leading-[1.2] font-bold text-white mb-1 text-shadow-warm-lg"
              dir="rtl"
              data-testid="text-hero-title-ar"
            >
              رحلة تراثية تفاعلية
            </h1>
            <p className="text-white/60 text-[13px] leading-relaxed font-light max-w-[280px] mx-auto mb-3" dir="rtl">
              اكتشف إرث الحصان العربي الأصيل عبر الحرف الإماراتية التقليدية
            </p>
            <h2
              className="font-serif text-[22px] leading-[1.15] font-bold text-white mb-1 text-shadow-warm-lg"
              data-testid="text-hero-title"
            >
              An Interactive Heritage Journey
            </h2>
            <p className="text-white/60 text-[13px] leading-relaxed font-light max-w-[280px] mx-auto">
              Discover the legacy of the Arabian horse through Emirati craftsmanship.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="space-y-2.5"
        >
          <button
            className="w-full h-[52px] btn-vivid rounded-2xl text-[14px] tracking-[0.15em] uppercase flex items-center justify-center shadow-[0_8px_30px_rgba(92,61,46,0.25)]"
            onClick={() => handleStart("ar")}
            data-testid="button-start-ar"
          >
            {t("Begin Journey", { lng: "ar" })}
          </button>

          <button
            className="w-full h-[48px] rounded-2xl text-[13px] font-semibold tracking-[0.12em] uppercase transition-all duration-300 flex items-center justify-center border border-white/30 text-white hover:bg-white/10 backdrop-blur-sm bg-white/5"
            onClick={() => handleStart("en")}
            data-testid="button-start-en"
          >
            {t("Begin Journey", { lng: "en" })}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="flex justify-center mt-3"
        >
          <img
            src={dubaiCultureLogo}
            alt="Dubai Culture"
            className="h-8 object-contain opacity-70"
            data-testid="img-dubai-culture-logo"
          />
        </motion.div>
      </div>
    </div>
  );
}

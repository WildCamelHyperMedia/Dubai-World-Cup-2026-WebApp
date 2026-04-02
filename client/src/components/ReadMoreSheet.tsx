import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ReadMoreSheetProps {
  text: string;
  lines?: number;
  title?: string;
  className?: string;
  textClassName?: string;
}

export default function ReadMoreSheet({ text, lines = 3, title, className = "", textClassName = "" }: ReadMoreSheetProps) {
  const [open, setOpen] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      setIsTruncated(el.scrollHeight > el.clientHeight + 1);
    }
  }, [text, lines]);

  const defaultTextClass = "text-[var(--text-muted)] text-[15px] leading-[1.8] font-light whitespace-pre-line";

  const overlay = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[9999] flex flex-col pointer-events-none"
            style={{ maxHeight: "85dvh" }}
          >
            <div className="rounded-t-3xl shadow-2xl w-full pointer-events-auto border-t-2 border-x-2 border-[var(--copper)]" style={{ maxHeight: "85dvh", background: "var(--surface-1)", boxShadow: "0 4px 24px rgba(196,136,58,0.12), 0 2px 8px rgba(92,61,46,0.08)" }}>
              <div className="flex justify-between items-center px-6 pt-5 pb-3">
                {title && (
                  <h3 className="font-serif text-lg leading-tight flex-1 pr-4" style={{ color: "var(--text-main)" }}>
                    {title}
                  </h3>
                )}
                <button
                  onClick={() => setOpen(false)}
                  aria-label={t('Close')}
                  className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                  data-testid="button-close-readmore"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 pb-6" style={{ maxHeight: "calc(85dvh - 70px)" }}>
                <p className={textClassName || "text-[15px] leading-[1.8] font-light whitespace-pre-line"} style={{ color: "var(--text-muted)" }}>
                  {text}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className={className}>
        <p
          ref={textRef}
          className={textClassName || defaultTextClass}
          style={{
            display: "-webkit-box",
            WebkitLineClamp: lines,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {text}
        </p>
        {isTruncated && (
          <button
            onClick={() => setOpen(true)}
            className="mt-2 text-[var(--primary)] text-sm font-medium uppercase tracking-wider hover:text-[var(--primary-hover)] transition-colors"
            data-testid="button-read-more"
          >
            {t("read_more")}
          </button>
        )}
      </div>

      {createPortal(overlay, document.body)}
    </>
  );
}

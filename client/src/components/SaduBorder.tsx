import { motion } from "framer-motion";

interface SaduBorderProps {
  variant?: "divider" | "band" | "accent";
  className?: string;
}

export default function SaduBorder({ variant = "divider", className = "" }: SaduBorderProps) {
  if (variant === "band") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className={`w-full overflow-hidden ${className}`}
        aria-hidden="true"
      >
        <div
          className="w-full h-16"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}images/patterns/sadu-blue-border.jpg)`,
            backgroundSize: 'auto 100%',
            backgroundRepeat: 'repeat-x',
            backgroundPosition: 'center',
            opacity: 0.7,
            maskImage: 'linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)',
          }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`w-full overflow-hidden ${className}`}
      aria-hidden="true"
      style={{ originX: 0.5 }}
    >
      <div
        className={`w-full ${variant === "accent" ? "h-10" : "h-8"}`}
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/sadu-border.jpg)`,
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'center',
          opacity: variant === "divider" ? 0.5 : 0.6,
          maskImage: 'linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)',
        }}
      />
    </motion.div>
  );
}

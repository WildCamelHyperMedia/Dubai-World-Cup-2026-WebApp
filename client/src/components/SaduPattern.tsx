import { motion } from "framer-motion";

interface SaduPatternProps {
  opacity?: number;
  className?: string;
  animate?: boolean;
  variant?: "full" | "top" | "bottom" | "corners" | "frame";
  image?: "blue" | "cream" | "rows" | "detail-blue" | "detail-cream";
}

const IMAGE_MAP: Record<string, string> = {
  "blue": `${import.meta.env.BASE_URL}images/patterns/sadu-blue-grid.jpg`,
  "cream": `${import.meta.env.BASE_URL}images/patterns/sadu-cream-grid.jpg`,
  "rows": `${import.meta.env.BASE_URL}images/patterns/sadu-blue-rows.jpg`,
  "detail-blue": `${import.meta.env.BASE_URL}images/patterns/sadu-blue-border.jpg`,
  "detail-cream": `${import.meta.env.BASE_URL}images/patterns/sadu-cream-large.jpg`,
};

export default function SaduPattern({ 
  opacity = 0.06, 
  className = "", 
  animate = true,
  variant = "full",
  image = "cream",
}: SaduPatternProps) {
  const src = IMAGE_MAP[image] || IMAGE_MAP.cream;

  const getMask = () => {
    switch (variant) {
      case "top":
        return "linear-gradient(to bottom, black 0%, black 30%, transparent 100%)";
      case "bottom":
        return "linear-gradient(to top, black 0%, black 30%, transparent 100%)";
      case "corners":
        return "radial-gradient(ellipse at 0% 0%, black 0%, transparent 50%), radial-gradient(ellipse at 100% 0%, black 0%, transparent 50%), radial-gradient(ellipse at 0% 100%, black 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, black 0%, transparent 50%)";
      case "frame":
        return "linear-gradient(to right, black 0%, transparent 15%, transparent 85%, black 100%), linear-gradient(to bottom, black 0%, transparent 15%, transparent 85%, black 100%)";
      default:
        return "radial-gradient(ellipse at center, black 0%, black 40%, transparent 80%)";
    }
  };

  const maskStyle = getMask();
  const useCompositeMask = variant === "corners" || variant === "frame";

  const content = (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      aria-hidden="true"
      style={{ opacity }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: variant === "full" ? "400px" : "300px",
          backgroundRepeat: "repeat",
          backgroundPosition: "center",
          ...(useCompositeMask ? {
            WebkitMaskImage: maskStyle,
            maskImage: maskStyle,
            WebkitMaskComposite: "source-over",
            maskComposite: "add",
          } : {
            WebkitMaskImage: maskStyle,
            maskImage: maskStyle,
          }),
        }}
      />
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2, delay: 0.3 }}
      className="contents"
    >
      {content}
    </motion.div>
  );
}

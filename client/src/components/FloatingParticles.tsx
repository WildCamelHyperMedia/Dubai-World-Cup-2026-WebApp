import { motion } from "framer-motion";

interface AmbientGlowProps {
  className?: string;
  variant?: "home" | "page" | "subtle";
}

export default function FloatingParticles({ className = "", variant = "page" }: AmbientGlowProps) {
  if (variant === "subtle") {
    return (
      <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`} aria-hidden="true">
        <motion.div
          className="absolute top-0 left-0 w-full h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, var(--copper), var(--camel-tan), transparent)' }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`} aria-hidden="true">
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full opacity-[0.06]"
        style={{
          background: 'radial-gradient(circle, var(--copper), transparent 70%)',
          top: '10%',
          left: '-5%',
        }}
        animate={{
          x: [0, 60, 0],
          y: [0, 40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute w-[250px] h-[250px] rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, var(--sage-green), transparent 70%)',
          bottom: '15%',
          right: '-5%',
        }}
        animate={{
          x: [0, -50, 0],
          y: [0, -30, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {variant === "home" && (
        <>
          <motion.div
            className="absolute w-[200px] h-[200px] rounded-full opacity-[0.05]"
            style={{
              background: 'radial-gradient(circle, var(--godolphin-blue), transparent 70%)',
              top: '50%',
              left: '60%',
            }}
            animate={{
              x: [0, -40, 0],
              y: [0, 50, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          />

          <motion.div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              background: 'linear-gradient(135deg, transparent 40%, rgba(196,136,58,0.04) 50%, transparent 60%)',
              backgroundSize: '200% 200%',
            }}
            animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      <motion.div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent 20%, var(--copper), var(--camel-tan), transparent 80%)' }}
        animate={{ opacity: [0.15, 0.4, 0.15] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

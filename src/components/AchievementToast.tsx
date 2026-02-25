import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type AchievementType = "badge" | "level" | "discipline" | "streak";

export interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  icon: string;
}

interface Props {
  achievement: Achievement | null;
  onClose: () => void;
}

const config: Record<AchievementType, { gradient: string; label: string; bg: string }> = {
  badge:      { gradient: "from-yellow-400 via-orange-400 to-red-400", label: "🏅 Nova Insígnia!", bg: "rgba(251,146,60,0.15)" },
  level:      { gradient: "from-purple-500 via-violet-500 to-indigo-500", label: "⬆️ Nou Nivell!", bg: "rgba(139,92,246,0.15)" },
  discipline: { gradient: "from-emerald-400 via-green-500 to-teal-500", label: "🔥 Autodisciplina!", bg: "rgba(16,185,129,0.15)" },
  streak:     { gradient: "from-pink-500 via-rose-400 to-red-400", label: "⚡ Ratxa!", bg: "rgba(244,63,94,0.15)" },
};

export function AchievementToast({ achievement, onClose }: Props) {
  useEffect(() => {
    if (!achievement) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [achievement, onClose]);

  const cfg = achievement ? config[achievement.type] : null;

  return (
    <AnimatePresence>
      {achievement && cfg && (
        <>
          {/* Fons fosc semitransparent */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Targeta centrada */}
          <motion.div
            key={achievement.id}
            initial={{ scale: 0.5, opacity: 0, y: 60 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          >
            <div
              className="pointer-events-auto mx-4 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden cursor-pointer"
              onClick={onClose}
            >
              {/* Franja de gradient a dalt */}
              <div className={`h-2 w-full bg-gradient-to-r ${cfg.gradient}`} />

              {/* Cos */}
              <div className="bg-white dark:bg-zinc-900 px-6 py-8 flex flex-col items-center text-center gap-4">

                {/* Emoji animat */}
                <motion.div
                  animate={{
                    scale: [1, 1.4, 0.9, 1.2, 1],
                    rotate: [0, -8, 8, -4, 0],
                  }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-7xl drop-shadow-lg"
                >
                  {achievement.icon}
                </motion.div>

                {/* Etiqueta tipus */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-gradient-to-r ${cfg.gradient} text-white`}>
                    {cfg.label}
                  </span>
                </motion.div>

                {/* Títol */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl font-black text-foreground leading-tight"
                >
                  {achievement.title}
                </motion.h2>

                {/* Descripció */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-muted-foreground"
                >
                  {achievement.description}
                </motion.p>

                {/* Barra de progrés que es buida (compte enrere visual) */}
                <motion.div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${cfg.gradient} rounded-full`}
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 5, ease: "linear" }}
                  />
                </motion.div>

                <p className="text-xs text-muted-foreground/60">Toca per tancar</p>
              </div>
            </div>
          </motion.div>

          {/* Partícules de confetti */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="fixed z-[9999] w-3 h-3 rounded-full pointer-events-none"
              style={{
                backgroundColor: ["#fbbf24","#f87171","#a78bfa","#34d399","#60a5fa","#f472b6"][i % 6],
                left: "50%",
                top: "50%",
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: (i % 2 === 0 ? 1 : -1) * (80 + i * 25),
                y: (i % 3 === 0 ? -1 : 1) * (60 + i * 20),
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: 1, delay: 0.1 + i * 0.04, ease: "easeOut" }}
            />
          ))}
        </>
      )}
    </AnimatePresence>
  );
}

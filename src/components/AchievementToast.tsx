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

const config: Record<AchievementType, { gradient: string; label: string; textColor: string }> = {
  badge:      { gradient: "from-yellow-400 via-orange-400 to-red-400",       label: "Nova Insígnia!",   textColor: "text-yellow-900" },
  level:      { gradient: "from-purple-500 via-violet-500 to-indigo-500",    label: "Nou Nivell!",      textColor: "text-purple-50"  },
  discipline: { gradient: "from-emerald-400 via-green-500 to-teal-500",      label: "Autodisciplina!",  textColor: "text-emerald-900" },
  streak:     { gradient: "from-pink-500 via-rose-400 to-orange-400",        label: "Ratxa!",           textColor: "text-pink-50"    },
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
          {/* Fons fosc */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Targeta centrada amb fons de color */}
          <motion.div
            key={achievement.id}
            initial={{ scale: 0.5, opacity: 0, y: 60 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          >
            <div
              className={`pointer-events-auto mx-4 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden cursor-pointer bg-gradient-to-br ${cfg.gradient} relative`}
              onClick={onClose}
            >
              {/* Brillantor decorativa */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/10 to-transparent pointer-events-none" />

              {/* Cos */}
              <div className="relative z-10 px-6 py-10 flex flex-col items-center text-center gap-4">

                {/* Emoji animat */}
                <motion.div
                  animate={{
                    scale: [1, 1.4, 0.9, 1.2, 1],
                    rotate: [0, -8, 8, -4, 0],
                  }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-8xl drop-shadow-lg"
                >
                  {achievement.icon}
                </motion.div>

                {/* Etiqueta tipus */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className={`text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full bg-white/25 backdrop-blur-sm ${cfg.textColor}`}>
                    ✦ {cfg.label} ✦
                  </span>
                </motion.div>

                {/* Títol */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`text-2xl font-black leading-tight ${cfg.textColor}`}
                >
                  {achievement.title}
                </motion.h2>

                {/* Descripció */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className={`text-sm opacity-90 ${cfg.textColor}`}
                >
                  {achievement.description}
                </motion.p>

                {/* Barra de compte enrere */}
                <motion.div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden mt-2">
                  <motion.div
                    className="h-full bg-white/70 rounded-full"
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 5, ease: "linear" }}
                  />
                </motion.div>

                <p className={`text-xs opacity-60 ${cfg.textColor}`}>Toca per tancar</p>
              </div>
            </div>
          </motion.div>

          {/* Confetti */}
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

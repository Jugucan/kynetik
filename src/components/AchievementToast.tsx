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

const colors: Record<AchievementType, string> = {
  badge: "from-yellow-400 to-orange-500",
  level: "from-purple-500 to-indigo-600",
  discipline: "from-green-400 to-emerald-600",
  streak: "from-red-400 to-pink-500",
};

const labels: Record<AchievementType, string> = {
  badge: "Nova Insígnia!",
  level: "Nou Nivell!",
  discipline: "Autodisciplina!",
  streak: "Ratxa!",
};

export function AchievementToast({ achievement, onClose }: Props) {
  useEffect(() => {
    if (!achievement) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [achievement, onClose]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          key={achievement.id}
          initial={{ y: -120, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -120, opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed top-6 left-1/2 z-[9999] -translate-x-1/2"
          onClick={onClose}
        >
          <div className={`bg-gradient-to-r ${colors[achievement.type]} rounded-2xl shadow-2xl p-4 flex items-center gap-4 min-w-[300px] max-w-[90vw] cursor-pointer relative overflow-hidden`}>
            
            <motion.div
              animate={{ scale: [1, 1.3, 1, 1.15, 1] }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-5xl flex-shrink-0"
            >
              {achievement.icon}
            </motion.div>

            <div className="text-white">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                {labels[achievement.type]}
              </p>
              <p className="text-lg font-black leading-tight">{achievement.title}</p>
              <p className="text-sm opacity-90">{achievement.description}</p>
            </div>

            {[...Array(6)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute w-2 h-2 rounded-full bg-white opacity-60 pointer-events-none"
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{
                  x: (i % 2 === 0 ? 1 : -1) * (40 + i * 15),
                  y: (i % 3 === 0 ? -1 : 1) * (30 + i * 10),
                  opacity: 0,
                }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                style={{ left: "50%", top: "50%" }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

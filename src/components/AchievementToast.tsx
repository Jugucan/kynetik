import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player } from "@lottiefiles/react-lottie-player";

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

// Animacions Lottie inline (sense URLs externes)
const LOTTIE_BADGE = {"v":"5.7.4","fr":30,"ip":0,"op":60,"w":200,"h":200,"nm":"badge","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"star","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":1,"k":[{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":0,"s":[0]},{"t":60,"s":[360]}]},"p":{"a":0,"k":[100,100,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":1,"k":[{"i":{"x":[0.833,0.833,0.833],"y":[0.833,0.833,0.833]},"o":{"x":[0.167,0.167,0.167],"y":[0.167,0.167,0.167]},"t":0,"s":[80,80,100]},{"i":{"x":[0.833,0.833,0.833],"y":[0.833,0.833,0.833]},"o":{"x":[0.167,0.167,0.167],"y":[0.167,0.167,0.167]},"t":30,"s":[110,110,100]},{"t":60,"s":[80,80,100]}]}},"ao":0,"shapes":[{"ty":"sr","d":1,"pt":{"a":0,"k":5},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"ir":{"a":0,"k":30},"is":{"a":0,"k":0},"or":{"a":0,"k":60},"os":{"a":0,"k":0},"ix":1,"nm":"star"},{"ty":"fl","c":{"a":0,"k":[1,0.8,0,1]},"o":{"a":0,"k":100},"r":1,"nm":"fill"}],"ip":0,"op":60,"st":0,"bm":0}]};

const config: Record<AchievementType, {
  gradient: string;
  label: string;
  textColor: string;
  emoji: string;
}> = {
  badge:      { gradient: "from-yellow-400 via-orange-400 to-red-400",    label: "Nova Insígnia!",  textColor: "text-yellow-900", emoji: "🏅" },
  level:      { gradient: "from-purple-500 via-violet-500 to-indigo-500", label: "Nou Nivell!",     textColor: "text-purple-50",  emoji: "⬆️" },
  discipline: { gradient: "from-emerald-400 via-green-500 to-teal-500",   label: "Autodisciplina!", textColor: "text-emerald-900", emoji: "🔥" },
  streak:     { gradient: "from-pink-500 via-rose-400 to-orange-400",     label: "Ratxa!",          textColor: "text-pink-50",    emoji: "⚡" },
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

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
              <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/10 to-transparent pointer-events-none" />

              <div className="relative z-10 px-6 py-10 flex flex-col items-center text-center gap-4">

                {/* Cercle blanc per contrast + emoji animat */}
                <motion.div
                  animate={{ scale: [1, 1.15, 0.95, 1.08, 1], rotate: [0, -6, 6, -3, 0] }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="w-28 h-28 rounded-full bg-white/90 shadow-lg flex items-center justify-center"
                >
                  <span className="text-6xl">{cfg.emoji}</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className={`text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full bg-white/25 backdrop-blur-sm ${cfg.textColor}`}>
                    ✦ {cfg.label} ✦
                  </span>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`text-2xl font-black leading-tight ${cfg.textColor}`}
                >
                  {achievement.title}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className={`text-sm opacity-90 ${cfg.textColor}`}
                >
                  {achievement.description}
                </motion.p>

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

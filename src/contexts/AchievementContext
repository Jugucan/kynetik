import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Achievement, AchievementToast } from "@/components/AchievementToast";

interface AchievementContextType {
  triggerAchievement: (a: Omit<Achievement, "id">) => void;
}

const Ctx = createContext<AchievementContextType>({ triggerAchievement: () => {} });

export function AchievementProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [current, setCurrent] = useState<Achievement | null>(null);

  const next = useCallback(() => {
    setQueue(q => {
      const [first, ...rest] = q;
      setCurrent(first ?? null);
      return rest;
    });
  }, []);

  const triggerAchievement = useCallback((a: Omit<Achievement, "id">) => {
    const achievement = { ...a, id: crypto.randomUUID() };
    setQueue(q => {
      // Si no hi ha cap actiu, mostrar ara
      if (!current && q.length === 0) setCurrent(achievement);
      else return [...q, achievement];
      return q;
    });
  }, [current]);

  return (
    <Ctx.Provider value={{ triggerAchievement }}>
      {children}
      <AchievementToast achievement={current} onClose={next} />
    </Ctx.Provider>
  );
}

export const useAchievement = () => useContext(Ctx);

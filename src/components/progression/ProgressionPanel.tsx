// ============================================================
// PANEL VISUAL DE PROGRESSIÓ (Nivell + Ratxa + XP)
// ============================================================

import { useState } from 'react';
import { ProgressionData, LEVELS } from '@/types/progression';
import { Flame, Star, Zap, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProgressionPanelProps {
  data: ProgressionData;
  userName?: string;
}

const ProgressionPanel = ({ data, userName }: ProgressionPanelProps) => {
  const { level, streak, xp, totalClasses, classesUntilNextLevel } = data;

  // Index del nivell actual dins LEVELS
  const currentLevelIndex = LEVELS.findIndex(l => l.id === level.id);
  const [visibleIndex, setVisibleIndex] = useState(currentLevelIndex);

  const visibleLevel = LEVELS[visibleIndex];
  const isCurrentLevel = visibleIndex === currentLevelIndex;
  const isPastLevel = visibleIndex < currentLevelIndex;
  const isFutureLevel = visibleIndex > currentLevelIndex;

  const canGoLeft = visibleIndex > 0;
  const canGoRight = visibleIndex < LEVELS.length - 1;

  // Càlcul del progrés per al nivell visible
  const getLevelProgress = (idx: number): number => {
    const lvl = LEVELS[idx];
    if (totalClasses < lvl.minClasses) return 0;
    if (lvl.maxClasses === null) return 100;
    if (totalClasses > lvl.maxClasses) return 100;
    const range = lvl.maxClasses - lvl.minClasses + 1;
    return Math.min(100, Math.round(((totalClasses - lvl.minClasses) / range) * 100));
  };

  const getClassesInfo = (idx: number): string => {
    const lvl = LEVELS[idx];
    if (isPastLevel || (isCurrentLevel && lvl.maxClasses === null)) {
      return `${lvl.minClasses}${lvl.maxClasses ? ` – ${lvl.maxClasses}` : '+'} classes`;
    }
    if (isCurrentLevel) {
      return classesUntilNextLevel !== null
        ? `Et falten ${classesUntilNextLevel} classes per pujar`
        : 'Nivell màxim assolit!';
    }
    // Nivell futur
    return `Cal arribar a ${lvl.minClasses} classes`;
  };

  return (
    <div className="space-y-3">

      {/* CARRUSEL DE NIVELLS */}
      <div className="relative">

        {/* Fletxa esquerra */}
        <button
          onClick={() => canGoLeft && setVisibleIndex(v => v - 1)}
          disabled={!canGoLeft}
          className={`
            absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10
            w-8 h-8 rounded-full flex items-center justify-center
            shadow-neo transition-all
            ${canGoLeft
              ? 'bg-background hover:shadow-neo-sm text-foreground'
              : 'opacity-0 pointer-events-none'
            }
          `}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Targeta de nivell */}
        <div
          className={`
            mx-4 p-5 rounded-2xl shadow-neo border transition-all duration-300
            ${isCurrentLevel
              ? `bg-gradient-to-br ${visibleLevel.bgGradient} border-white/50`
              : isPastLevel
                ? 'bg-muted/30 border-muted/50'
                : 'bg-muted/20 border-muted/40 opacity-70'
            }
          `}
        >
          {/* Etiqueta d'estat */}
          <div className="flex items-center justify-between mb-3">
            <span className={`
              text-xs font-bold px-2 py-0.5 rounded-full
              ${isCurrentLevel
                ? 'bg-white/40 text-foreground'
                : isPastLevel
                  ? 'bg-green-100 text-green-700'
                  : 'bg-muted text-muted-foreground'
              }
            `}>
              {isCurrentLevel ? '📍 Nivell actual' : isPastLevel ? '✅ Superat' : '🔒 Per aconseguir'}
            </span>

            {/* Indicadors de punts de navegació */}
            <div className="flex gap-1">
              {LEVELS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setVisibleIndex(idx)}
                  className={`
                    w-2 h-2 rounded-full transition-all
                    ${idx === visibleIndex
                      ? 'bg-primary scale-125'
                      : idx <= currentLevelIndex
                        ? 'bg-primary/40'
                        : 'bg-muted-foreground/30'
                    }
                  `}
                />
              ))}
            </div>
          </div>

          {/* Contingut principal */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className={`text-5xl ${isFutureLevel ? 'grayscale opacity-50' : ''}`}>
                {visibleLevel.emoji}
              </span>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {visibleIndex + 1} de {LEVELS.length}
                </p>
                <h2 className={`text-2xl font-black ${isCurrentLevel ? visibleLevel.color : 'text-muted-foreground'}`}>
                  {visibleLevel.name}
                </h2>
              </div>
            </div>

            {/* Classes necessàries / aconseguides */}
            <div className="text-right">
              {isCurrentLevel && (
                <>
                  <div className={`text-3xl font-black ${visibleLevel.color}`}>
                    {totalClasses}
                  </div>
                  <div className="text-xs text-muted-foreground">classes</div>
                </>
              )}
              {isPastLevel && (
                <div className="text-green-600 font-bold text-sm">✓ Completat</div>
              )}
              {isFutureLevel && (
                <>
                  <div className="text-2xl font-black text-muted-foreground">
                    {visibleLevel.minClasses}
                  </div>
                  <div className="text-xs text-muted-foreground">classes</div>
                </>
              )}
            </div>
          </div>

          {/* Descripció */}
          <p className={`text-sm mb-3 italic ${isCurrentLevel ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
            "{visibleLevel.description}"
          </p>

          {/* Info de classes */}
          <p className="text-xs text-muted-foreground mb-2">
            {getClassesInfo(visibleIndex)}
          </p>

          {/* Barra de progrés */}
          <div className="space-y-1">
            <div className="w-full bg-white/40 rounded-full h-2.5 shadow-neo-inset">
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ${
                  isCurrentLevel
                    ? visibleLevel.color.replace('text-', 'bg-')
                    : isPastLevel
                      ? 'bg-green-500'
                      : 'bg-muted-foreground/20'
                }`}
                style={{ width: `${getLevelProgress(visibleIndex)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Fletxa dreta */}
        <button
          onClick={() => canGoRight && setVisibleIndex(v => v + 1)}
          disabled={!canGoRight}
          className={`
            absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10
            w-8 h-8 rounded-full flex items-center justify-center
            shadow-neo transition-all
            ${canGoRight
              ? 'bg-background hover:shadow-neo-sm text-foreground'
              : 'opacity-0 pointer-events-none'
            }
          `}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* RATXA + XP en dues columnes */}
      <div className="grid grid-cols-2 gap-3">

        {/* RATXA SETMANAL */}
        <div className="p-4 rounded-2xl shadow-neo bg-background">
          <div className="flex items-center gap-2 mb-2">
            <Flame className={`w-4 h-4 ${streak.current > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Ratxa
            </span>
          </div>

          <div className={`text-4xl font-black mb-1 ${streak.current > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>
            {streak.current}
            <span className="text-lg font-normal ml-1">sem.</span>
          </div>

          {streak.isActiveThisWeek ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-600 font-medium">Activa aquesta setmana!</span>
            </div>
          ) : streak.current > 0 ? (
            <span className="text-xs text-amber-600 font-medium">
              ⚠️ Vine aquesta setmana per mantenir-la!
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Vine aquesta setmana per començar!
            </span>
          )}

          <div className="mt-2 pt-2 border-t border-muted/30">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Millor: <span className="font-bold text-foreground">{streak.best} sem.</span>
              </span>
            </div>
          </div>
        </div>

        {/* XP */}
        <div className="p-4 rounded-2xl shadow-neo bg-background">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              XP · Nivell {xp.level}
            </span>
          </div>

          <div className="text-4xl font-black text-yellow-600 mb-1">
            {xp.total}
            <span className="text-sm font-normal ml-1 text-muted-foreground">XP</span>
          </div>

          <div className="space-y-1">
            <div className="w-full bg-muted rounded-full h-2 shadow-neo-inset">
              <div
                className="bg-yellow-400 h-2 rounded-full transition-all duration-700"
                style={{ width: `${xp.progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {xp.currentLevelXP} / {xp.nextLevelXP} XP per nivell {xp.level + 1}
            </p>
          </div>

          <div className="mt-2 pt-2 border-t border-muted/30">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-500" />
              <span className="text-xs text-muted-foreground">
                Disponibles: <span className="font-bold text-yellow-600">{xp.available} XP</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Missatge motivacional */}
      <MotivationalMessage streak={streak} xp={xp} userName={userName} />
    </div>
  );
};

// Missatge motivacional segons l'estat
const MotivationalMessage = ({
  streak,
  xp,
  userName,
}: {
  streak: ProgressionData['streak'];
  xp: ProgressionData['xp'];
  userName?: string;
}) => {
  const name = userName ? `, ${userName.split(' ')[0]}` : '';

  let message = '';
  let emoji = '';
  let colorClass = '';

  if (streak.current >= 10) {
    message = `${streak.current} setmanes seguides${name}! Ets increïble.`;
    emoji = '🔥';
    colorClass = 'text-orange-700 bg-orange-50 border-orange-200';
  } else if (streak.current >= 4) {
    message = `Un mes seguida${name}! La constància és el teu superpower.`;
    emoji = '⚡';
    colorClass = 'text-blue-700 bg-blue-50 border-blue-200';
  } else if (streak.current >= 2) {
    message = `Segueix així${name}! Estàs construint un gran hàbit.`;
    emoji = '💪';
    colorClass = 'text-green-700 bg-green-50 border-green-200';
  } else if (streak.isActiveThisWeek) {
    message = `Bona setmana${name}! Torna la setmana que ve per fer ratxa.`;
    emoji = '🌟';
    colorClass = 'text-purple-700 bg-purple-50 border-purple-200';
  } else if (streak.current === 0 && xp.total > 0) {
    message = `Tens ${xp.total} XP acumulats${name}. La flama sempre pot tornar a encendre's!`;
    emoji = '✨';
    colorClass = 'text-amber-700 bg-amber-50 border-amber-200';
  } else {
    message = `Benvinguda${name}! Cada classe és un pas cap a la millor versió de tu.`;
    emoji = '🌱';
    colorClass = 'text-green-700 bg-green-50 border-green-200';
  }

  return (
    <div className={`p-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${colorClass}`}>
      <span className="text-lg flex-shrink-0">{emoji}</span>
      <span>{message}</span>
    </div>
  );
};

export default ProgressionPanel;

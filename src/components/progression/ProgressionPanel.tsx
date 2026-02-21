// ============================================================
// PANEL VISUAL DE PROGRESSIÓ (Nivell + Ratxa + XP)
// ============================================================

import { ProgressionData } from '@/types/progression';
import { Flame, Star, Zap, TrendingUp } from 'lucide-react';

interface ProgressionPanelProps {
  data: ProgressionData;
  userName?: string;
}

const ProgressionPanel = ({ data, userName }: ProgressionPanelProps) => {
  const { level, streak, xp, totalClasses, classesUntilNextLevel } = data;

  return (
    <div className="space-y-3">

      {/* NIVELL PRINCIPAL */}
      <div className={`p-5 rounded-2xl shadow-neo bg-gradient-to-br ${level.bgGradient} border border-white/50`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{level.emoji}</span>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Nivell actual
              </p>
              <h2 className={`text-2xl font-black ${level.color}`}>
                {level.name}
              </h2>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-black ${level.color}`}>
              {totalClasses}
            </div>
            <div className="text-xs text-muted-foreground">classes</div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3 italic">
          "{level.description}"
        </p>

        {/* Barra de progrés cap al següent nivell */}
        {classesUntilNextLevel !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progrés cap a {getNextLevelName(level.id)}</span>
              <span>{classesUntilNextLevel} classes per pujar</span>
            </div>
            <div className="w-full bg-white/50 rounded-full h-2.5 shadow-neo-inset">
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ${level.color.replace('text-', 'bg-')}`}
                style={{ width: `${calcLevelProgress(totalClasses, level)}%` }}
              />
            </div>
          </div>
        )}
        {classesUntilNextLevel === null && (
          <div className="text-center py-1">
            <span className="text-xs font-bold text-purple-600">
              ✦ Nivell màxim assolit ✦
            </span>
          </div>
        )}
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

      {/* Missatge motivacional dinàmic */}
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

// Helpers visuals
function getNextLevelName(currentLevelId: string): string {
  const levelNames: Record<string, string> = {
    principiant: 'Atleta',
    atleta: 'Competidora',
    competidora: 'Campiona',
    campiona: 'Èlit',
    elit: 'Llegenda',
  };
  return levelNames[currentLevelId] || '';
}

function calcLevelProgress(totalClasses: number, level: ProgressionData['level']): number {
  if (level.maxClasses === null) return 100;
  const range = level.maxClasses - level.minClasses + 1;
  const progress = totalClasses - level.minClasses;
  return Math.min(100, Math.round((progress / range) * 100));
}

export default ProgressionPanel;

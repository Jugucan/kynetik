// ============================================================
// PANEL VISUAL DE PROGRESSIÓ (Nivell + Ratxa + XP)
// ============================================================

import { useState, useRef } from 'react';
import { ProgressionData, LEVELS } from '@/types/progression';
import { getAdjectiu, getBenvingut } from '@/utils/genderHelpers';
import { Flame, Star, Zap, TrendingUp, ChevronLeft, ChevronRight, X, Info } from 'lucide-react';

interface ProgressionPanelProps {
  data: ProgressionData;
  userName?: string;
  gender?: string | null;
}

// ── Modal d'informació ───────────────────────────────────────
const InfoModal = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      className="bg-background rounded-2xl shadow-neo p-5 max-w-sm w-full space-y-3"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="text-sm text-muted-foreground space-y-2">{children}</div>
    </div>
  </div>
);

// ── Component principal ──────────────────────────────────────
const ProgressionPanel = ({ data, userName, gender }: ProgressionPanelProps) => {
  const { level, streak, xp, totalClasses, xpUntilNextLevel } = data;

  const currentLevelIndex = LEVELS.findIndex(l => l.id === level.id);
  const [visibleIndex, setVisibleIndex] = useState(currentLevelIndex);
  const [infoModal, setInfoModal] = useState<'streak' | 'xp' | null>(null);

  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 40) return;
    if (diff > 0 && visibleIndex < LEVELS.length - 1) setVisibleIndex(v => v + 1);
    if (diff < 0 && visibleIndex > 0) setVisibleIndex(v => v - 1);
    touchStartX.current = null;
  };

  const visibleLevel = LEVELS[visibleIndex];
  const isCurrentLevel = visibleIndex === currentLevelIndex;
  const isPastLevel = visibleIndex < currentLevelIndex;
  const isFutureLevel = visibleIndex > currentLevelIndex;
  const canGoLeft = visibleIndex > 0;
  const canGoRight = visibleIndex < LEVELS.length - 1;

  // Nom del nivell adaptat al gènere
  const levelName = (lvl: typeof visibleLevel) => {
    if (gender === 'Femení') return lvl.nameFemeni;
    if (gender === 'Masculí') return lvl.nameMasculi;
    return lvl.name;
  };

  // Progrés de XP dins del nivell visible
  const getLevelXPProgress = (idx: number): number => {
    const lvl = LEVELS[idx];
    if (xp.total < lvl.minXP) return 0;
    if (lvl.maxXP === null) return 100;
    if (xp.total > lvl.maxXP) return 100;
    return Math.min(100, Math.round(((xp.total - lvl.minXP) / (lvl.maxXP - lvl.minXP)) * 100));
  };

  const getXPInfo = (idx: number): string => {
    const lvl = LEVELS[idx];
    if (isPastLevel) return `${lvl.minXP} – ${lvl.maxXP} XP`;
    if (isCurrentLevel) {
      return xpUntilNextLevel !== null
        ? `Et falten ${xpUntilNextLevel} XP per pujar`
        : 'Nivell màxim assolit!';
    }
    return `Cal arribar a ${lvl.minXP} XP`;
  };

  return (
    <div className="space-y-3">

      {/* CARRUSEL DE NIVELLS */}
      <div className="relative">
        <button
          onClick={() => canGoLeft && setVisibleIndex(v => v - 1)}
          disabled={!canGoLeft}
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-neo transition-all ${canGoLeft ? 'bg-background hover:shadow-neo-sm text-foreground' : 'opacity-0 pointer-events-none'}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          className={`mx-4 p-4 rounded-2xl shadow-neo border transition-all duration-300 select-none ${
            isCurrentLevel
              ? `bg-gradient-to-br ${visibleLevel.bgGradient} border-white/50`
              : isPastLevel ? 'bg-muted/30 border-muted/50' : 'bg-muted/20 border-muted/40 opacity-70'
          }`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Etiqueta + punts */}
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isCurrentLevel ? 'bg-white/40 text-foreground' : isPastLevel ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
            }`}>
              {isCurrentLevel ? '📍 Nivell actual' : isPastLevel ? '✅ Superat' : '🔒 Per aconseguir'}
            </span>
            <div className="flex gap-1">
              {LEVELS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setVisibleIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === visibleIndex ? 'bg-primary scale-125' : idx <= currentLevelIndex ? 'bg-primary/40' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Contingut */}
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-4xl flex-shrink-0 ${isFutureLevel ? 'grayscale opacity-50' : ''}`}>
              {visibleLevel.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {visibleIndex + 1} de {LEVELS.length}
              </p>
              <h2 className={`text-xl font-black leading-tight ${isCurrentLevel ? visibleLevel.color : 'text-muted-foreground'}`}>
                {levelName(visibleLevel)}
              </h2>
            </div>
            <div className="text-right flex-shrink-0">
              {isCurrentLevel && (
                <>
                  <div className={`text-2xl font-black ${visibleLevel.color}`}>{xp.total}</div>
                  <div className="text-xs text-muted-foreground">XP</div>
                </>
              )}
              {isFutureLevel && (
                <>
                  <div className="text-2xl font-black text-muted-foreground">{visibleLevel.minXP}</div>
                  <div className="text-xs text-muted-foreground">XP</div>
                </>
              )}
            </div>
          </div>

          <p className={`text-xs mb-2 italic ${isCurrentLevel ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
            "{visibleLevel.description}"
          </p>
          <p className="text-xs text-muted-foreground mb-2">{getXPInfo(visibleIndex)}</p>

          <div className="w-full bg-white/40 rounded-full h-2 shadow-neo-inset">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${
                isCurrentLevel ? visibleLevel.color.replace('text-', 'bg-') : isPastLevel ? 'bg-green-500' : 'bg-muted-foreground/20'
              }`}
              style={{ width: `${getLevelXPProgress(visibleIndex)}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => canGoRight && setVisibleIndex(v => v + 1)}
          disabled={!canGoRight}
          className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-neo transition-all ${canGoRight ? 'bg-background hover:shadow-neo-sm text-foreground' : 'opacity-0 pointer-events-none'}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* RATXA + XP */}
      <div className="grid grid-cols-2 gap-3">
        <button
          className="p-4 rounded-2xl shadow-neo bg-background text-left w-full hover:shadow-neo-sm transition-all"
          onClick={() => setInfoModal('streak')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Flame className={`w-4 h-4 ${streak.current > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ratxa</span>
            </div>
            <Info className="w-3 h-3 text-muted-foreground/50" />
          </div>
          <div className={`text-4xl font-black mb-1 ${streak.current > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>
            {streak.current}<span className="text-lg font-normal ml-1">sem.</span>
          </div>
          {streak.isActiveThisWeek ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-600 font-medium">Activa aquesta setmana!</span>
            </div>
          ) : streak.current > 0 ? (
            <span className="text-xs text-amber-600 font-medium">⚠️ Vine per mantenir-la!</span>
          ) : (
            <span className="text-xs text-muted-foreground">Vine per començar!</span>
          )}
          <div className="mt-2 pt-2 border-t border-muted/30 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Millor: <span className="font-bold text-foreground">{streak.best} sem.</span>
            </span>
          </div>
        </button>

        <button
          className="p-4 rounded-2xl shadow-neo bg-background text-left w-full hover:shadow-neo-sm transition-all"
          onClick={() => setInfoModal('xp')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">XP · Niv. {xp.level}</span>
            </div>
            <Info className="w-3 h-3 text-muted-foreground/50" />
          </div>
          <div className="text-4xl font-black text-yellow-600 mb-1">
            {xp.total}<span className="text-sm font-normal ml-1 text-muted-foreground">XP</span>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-muted rounded-full h-2 shadow-neo-inset">
              <div className="bg-yellow-400 h-2 rounded-full transition-all duration-700" style={{ width: `${xp.progressPercent}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {xp.level < 10 ? `${xp.currentLevelXP} / ${xp.nextLevelXP} XP per niv. ${xp.level + 1}` : '🏆 Nivell XP màxim!'}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-muted/30 flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span className="text-xs text-muted-foreground">
              Total: <span className="font-bold text-yellow-600">{xp.available} XP</span>
            </span>
          </div>
        </button>
      </div>

      {/* Missatge motivacional */}
      <MotivationalMessage streak={streak} xp={xp} userName={userName} gender={gender} />

      {/* Modals */}
      {infoModal === 'streak' && (
        <InfoModal title="🔥 Ratxa setmanal" onClose={() => setInfoModal(null)}>
          <p>La <strong>ratxa</strong> compta quantes setmanes consecutives has assistit a almenys una classe.</p>
          <p>Si vens aquesta setmana i la que ve, la teva ratxa pujarà. Si en saltes una, es reinicia a zero.</p>
          <p>La <strong>millor ratxa</strong> és el teu rècord històric de setmanes consecutives.</p>
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
            <p className="text-orange-700 font-medium">💡 Una classe per setmana ja compta. La constància és més important que la intensitat!</p>
          </div>
        </InfoModal>
      )}

      {infoModal === 'xp' && (
        <InfoModal title="⭐ Punts d'experiència (XP)" onClose={() => setInfoModal(null)}>
          <p>Els <strong>XP</strong> mesuren el teu esforç acumulat. Mai baixen!</p>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Com guanyes XP:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>+10 XP</strong> per cada classe</li>
              <li><strong>+10 XP</strong> bonus si fas 2 classes en una setmana</li>
              <li><strong>+20 XP</strong> bonus si fas 3+ classes en una setmana</li>
              <li><strong>+30 XP</strong> bonus si fas 5+ classes en una setmana</li>
              <li><strong>+15 XP</strong> per mantenir la ratxa setmanal</li>
            </ul>
          </div>
          <p>El <strong>nivell XP</strong> puja a mesura que acumules punts. Hi ha 10 nivells en total.</p>
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <p className="text-yellow-700 font-medium">💡 Combina freqüència i constància per acumular XP molt més ràpid!</p>
          </div>
        </InfoModal>
      )}
    </div>
  );
};

// ── Missatge motivacional ────────────────────────────────────
const MotivationalMessage = ({
  streak, xp, userName, gender,
}: {
  streak: ProgressionData['streak'];
  xp: ProgressionData['xp'];
  userName?: string;
  gender?: string | null;
}) => {
  const name = userName ? `, ${userName.split(' ')[0]}` : '';
  const seguida = getAdjectiu(gender, 'seguida', 'seguit', 'seguint');
  const benvinguda = getBenvingut(gender);

  let message = '', emoji = '', colorClass = '';

  if (streak.current >= 10) {
    message = `${streak.current} setmanes ${seguida}${name}! Ets increïble.`;
    emoji = '🔥'; colorClass = 'text-orange-700 bg-orange-50 border-orange-200';
  } else if (streak.current >= 4) {
    message = `Un mes ${seguida}${name}! La constància és el teu superpower.`;
    emoji = '⚡'; colorClass = 'text-blue-700 bg-blue-50 border-blue-200';
  } else if (streak.current >= 2) {
    message = `Segueix així${name}! Estàs construint un gran hàbit.`;
    emoji = '💪'; colorClass = 'text-green-700 bg-green-50 border-green-200';
  } else if (streak.isActiveThisWeek) {
    message = `Bona setmana${name}! Torna la setmana que ve per fer ratxa.`;
    emoji = '🌟'; colorClass = 'text-purple-700 bg-purple-50 border-purple-200';
  } else if (streak.current === 0 && xp.total > 0) {
    message = `Tens ${xp.total} XP acumulats${name}. La flama sempre pot tornar!`;
    emoji = '✨'; colorClass = 'text-amber-700 bg-amber-50 border-amber-200';
  } else {
    message = `${benvinguda}${name}! Cada classe és un pas cap a la millor versió de tu.`;
    emoji = '🌱'; colorClass = 'text-green-700 bg-green-50 border-green-200';
  }

  return (
    <div className={`p-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${colorClass}`}>
      <span className="text-lg flex-shrink-0">{emoji}</span>
      <span>{message}</span>
    </div>
  );
};

export default ProgressionPanel;

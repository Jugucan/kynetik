import { useNavigate } from 'react-router-dom';
import { BadgeWithStatus, TIER_COLORS, UNIQUE_BADGE_STYLE, PERSONAL_BADGE_STYLE, getBadgeTexts } from '@/types/badges';
import { Lock, Info, Layers } from 'lucide-react';

interface BadgeCardProps {
  badge: BadgeWithStatus;
  gender?: string | null;
}

const BadgeCard = ({ badge, gender }: BadgeCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    sessionStorage.setItem('badgesScrollY', String(window.scrollY));
    navigate(`/badges/${badge.id}`);
  };

  const { name, description } = getBadgeTexts(badge, gender);
  const isEarned = badge.earned;
  const isUnavailable = badge.unavailable;
  const isMultiLevel = !!badge.group;
  const isPersonal = badge.category === 'personal';

  // Estil segons tipus
  const earnedStyle = isMultiLevel
    ? TIER_COLORS[badge.tier]
    : isPersonal
      ? PERSONAL_BADGE_STYLE
      : UNIQUE_BADGE_STYLE;

  // ── INSÍGNIA MULTI-NIVELL (medalla) ──────────────────────
  if (isMultiLevel) {
    return (
      <div
        onClick={handleClick}
        className={`
          relative p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer
          ${isEarned
            ? `bg-gradient-to-br ${earnedStyle.bg} ${earnedStyle.border} shadow-lg hover:shadow-xl hover:scale-105`
            : isUnavailable
              ? 'bg-muted/20 border-muted/30 opacity-40 shadow-neo-inset hover:opacity-60'
              : 'bg-muted/30 border-muted/50 opacity-60 shadow-neo-inset hover:opacity-80'
          }
        `}
      >
        {isEarned && (
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/10 to-transparent pointer-events-none rounded-2xl" />
        )}
        <div className="absolute top-2 left-2 z-10">
          <Layers className={`w-3 h-3 opacity-60 ${isEarned ? earnedStyle.text : 'text-muted-foreground'}`} />
        </div>
        <div className="absolute top-2 right-2 z-10">
          <Info className={`w-3.5 h-3.5 opacity-50 ${isEarned ? earnedStyle.text : 'text-muted-foreground'}`} />
        </div>
        <div className={`mx-auto mb-2 mt-1 w-14 h-14 rounded-full flex items-center justify-center relative z-10 ${isEarned ? 'bg-white/30 shadow-md' : 'bg-muted/40'}`}>
          <span className={`text-3xl ${isEarned ? 'drop-shadow-md' : 'grayscale'}`}>
            {isEarned ? badge.emoji : isUnavailable ? '🚫' : '🔒'}
          </span>
        </div>
        <h3 className={`font-bold text-sm text-center mb-1 leading-tight relative z-10 ${isEarned ? earnedStyle.text : 'text-muted-foreground'}`}>
          {name}
        </h3>
        {isEarned && (
          <div className="text-center relative z-10 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${earnedStyle.text} bg-white/30 backdrop-blur-sm`}>
              ✦ {TIER_COLORS[badge.tier].label} ✦
            </span>
          </div>
        )}
        {!isEarned && (
          <p className="text-xs text-center leading-tight mb-2 relative z-10 text-muted-foreground">
            {isUnavailable ? 'No disponible' : badge.requirement}
          </p>
        )}
        {!isEarned && !isUnavailable && badge.progress !== undefined && (
          <div className="space-y-1 relative z-10">
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="bg-primary/50 h-1.5 rounded-full transition-all duration-500" style={{ width: `${badge.progress}%` }} />
            </div>
            {badge.progressLabel && (
              <p className="text-xs text-center text-muted-foreground/70">{badge.progressLabel}</p>
            )}
          </div>
        )}
        {!isEarned && !isUnavailable && (
          <div className="absolute bottom-2 right-2">
            <Lock className="w-3 h-3 text-muted-foreground/50" />
          </div>
        )}
      </div>
    );
  }

  // ── INSÍGNIA PERSONAL (rècord) — violeta/porpra ──────────
  if (isPersonal) {
    return (
      <div
        onClick={handleClick}
        className={`
          relative p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer
          ${isEarned
            ? `bg-gradient-to-br ${PERSONAL_BADGE_STYLE.bg} ${PERSONAL_BADGE_STYLE.border} shadow-lg hover:shadow-xl hover:scale-105`
            : 'bg-muted/30 border-muted/50 opacity-60 shadow-neo-inset hover:opacity-80'
          }
        `}
      >
        {isEarned && (
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/10 to-transparent pointer-events-none rounded-2xl" />
        )}
        <div className="absolute top-2 right-2 z-10">
          <Info className={`w-3.5 h-3.5 opacity-50 ${isEarned ? PERSONAL_BADGE_STYLE.text : 'text-muted-foreground'}`} />
        </div>
        {/* Emoji amb forma de diamant (clip-path hexagonal) */}
        <div className={`text-4xl mb-2 text-center relative z-10 ${isEarned ? 'drop-shadow-md' : 'grayscale'}`}>
          {badge.emoji}
        </div>
        <h3 className={`font-bold text-sm text-center mb-1 leading-tight relative z-10 ${isEarned ? PERSONAL_BADGE_STYLE.text : 'text-muted-foreground'}`}>
          {name}
        </h3>
        {isEarned && badge.progressLabel && (
          <div className={`text-center font-black text-base relative z-10 ${PERSONAL_BADGE_STYLE.text}`}>
            {badge.progressLabel}
          </div>
        )}
        {isEarned && badge.earnedAt && (
          <p className={`text-xs text-center mt-1 relative z-10 ${PERSONAL_BADGE_STYLE.text} opacity-70`}>
            {badge.earnedAt}
          </p>
        )}
        {!isEarned && (
          <p className="text-xs text-center leading-tight relative z-10 text-muted-foreground">
            {badge.requirement}
          </p>
        )}
      </div>
    );
  }

  // ── INSÍGNIA ÚNICA (trofeu) — verd esmeralda ─────────────
  return (
    <div
      onClick={handleClick}
      className={`
        relative p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer
        ${isEarned
          ? `bg-gradient-to-br ${UNIQUE_BADGE_STYLE.bg} ${UNIQUE_BADGE_STYLE.border} shadow-lg hover:shadow-xl hover:scale-105`
          : isUnavailable
            ? 'bg-muted/20 border-muted/30 opacity-40 shadow-neo-inset hover:opacity-60'
            : 'bg-muted/30 border-muted/50 opacity-60 shadow-neo-inset hover:opacity-80'
        }
      `}
    >
      {isEarned && (
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/10 to-transparent pointer-events-none rounded-2xl" />
      )}
      <div className="absolute top-2 right-2 z-10">
        <Info className={`w-3.5 h-3.5 opacity-50 ${isEarned ? UNIQUE_BADGE_STYLE.text : 'text-muted-foreground'}`} />
      </div>
      <div className={`text-4xl mb-2 text-center relative z-10 ${isEarned ? 'drop-shadow-md' : 'grayscale'}`}>
        {isEarned ? badge.emoji : isUnavailable ? '🚫' : '🔒'}
      </div>
      <h3 className={`font-bold text-sm text-center mb-1 leading-tight relative z-10 ${isEarned ? UNIQUE_BADGE_STYLE.text : 'text-muted-foreground'}`}>
        {name}
      </h3>
      <p className={`text-xs text-center leading-tight mb-2 relative z-10 ${isEarned ? UNIQUE_BADGE_STYLE.text + ' opacity-80' : 'text-muted-foreground'}`}>
        {isUnavailable ? 'No disponible' : isEarned ? description : badge.requirement}
      </p>
      {!isEarned && !isUnavailable && badge.progress !== undefined && (
        <div className="space-y-1 relative z-10">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="bg-primary/50 h-1.5 rounded-full transition-all duration-500" style={{ width: `${badge.progress}%` }} />
          </div>
          {badge.progressLabel && (
            <p className="text-xs text-center text-muted-foreground/70">{badge.progressLabel}</p>
          )}
        </div>
      )}
      {!isEarned && !isUnavailable && (
        <div className="absolute top-2 left-2">
          <Lock className="w-3 h-3 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
};

export default BadgeCard;

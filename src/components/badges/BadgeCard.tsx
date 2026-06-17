import { useNavigate } from 'react-router-dom';
import { BadgeWithStatus, TIER_COLORS, getBadgeTexts } from '@/types/badges';
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
  const tierStyle = TIER_COLORS[badge.tier];
  const isEarned = badge.earned;
  const isUnavailable = badge.unavailable;
  const isMultiLevel = !!badge.group; // té nivells progressius

  // ── INSÍGNIA MULTI-NIVELL (medalla) ──────────────────────
  if (isMultiLevel) {
    return (
      <div
        onClick={handleClick}
        className={`
          relative p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer
          ${isEarned
            ? `bg-gradient-to-br ${tierStyle.bg} ${tierStyle.border} shadow-lg hover:shadow-xl hover:scale-105`
            : isUnavailable
              ? 'bg-muted/20 border-muted/30 opacity-40 shadow-neo-inset hover:opacity-60'
              : 'bg-muted/30 border-muted/50 opacity-60 shadow-neo-inset hover:opacity-80'
          }
        `}
      >
        {isEarned && (
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/10 to-transparent pointer-events-none rounded-2xl" />
        )}

        {/* Indicador multi-nivell (cantonada superior esquerra) */}
        <div className="absolute top-2 left-2 z-10">
          <Layers className={`w-3 h-3 opacity-60 ${isEarned ? tierStyle.text : 'text-muted-foreground'}`} />
        </div>

        {/* Icona info */}
        <div className="absolute top-2 right-2 z-10">
          <Info className={`w-3.5 h-3.5 opacity-50 ${isEarned ? tierStyle.text : 'text-muted-foreground'}`} />
        </div>

        {/* Emoji amb forma de medalla: cercle de fons */}
        <div className={`
          mx-auto mb-2 mt-1 w-14 h-14 rounded-full flex items-center justify-center relative z-10
          ${isEarned ? 'bg-white/30 shadow-md' : 'bg-muted/40'}
        `}>
          <span className={`text-3xl ${isEarned ? 'drop-shadow-md' : 'grayscale'}`}>
            {isEarned ? badge.emoji : isUnavailable ? '🚫' : '🔒'}
          </span>
        </div>

        {/* Nom */}
        <h3 className={`font-bold text-sm text-center mb-1 leading-tight relative z-10 ${isEarned ? tierStyle.text : 'text-muted-foreground'}`}>
          {name}
        </h3>

        {/* Tier label (medalla) */}
        {isEarned && (
          <div className="text-center relative z-10 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tierStyle.text} bg-white/30 backdrop-blur-sm`}>
              ✦ {tierStyle.label} ✦
            </span>
          </div>
        )}

        {/* Descripció / requisit */}
        {!isEarned && (
          <p className="text-xs text-center leading-tight mb-2 relative z-10 text-muted-foreground">
            {isUnavailable ? 'No disponible' : badge.requirement}
          </p>
        )}

        {/* Barra de progrés cap al proper nivell */}
        {!isEarned && !isUnavailable && badge.progress !== undefined && (
          <div className="space-y-1 relative z-10">
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary/50 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${badge.progress}%` }}
              />
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

  // ── INSÍGNIA ÚNICA (trofeu) ───────────────────────────────
  return (
    <div
      onClick={handleClick}
      className={`
        relative p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer
        ${isEarned
          ? `bg-gradient-to-br ${tierStyle.bg} ${tierStyle.border} shadow-lg hover:shadow-xl hover:scale-105`
          : isUnavailable
            ? 'bg-muted/20 border-muted/30 opacity-40 shadow-neo-inset hover:opacity-60'
            : 'bg-muted/30 border-muted/50 opacity-60 shadow-neo-inset hover:opacity-80'
        }
      `}
    >
      {isEarned && (
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/10 to-transparent pointer-events-none rounded-2xl" />
      )}

      {/* Icona info */}
      <div className="absolute top-2 right-2 z-10">
        <Info className={`w-3.5 h-3.5 opacity-50 ${isEarned ? tierStyle.text : 'text-muted-foreground'}`} />
      </div>

      {/* Emoji directe, sense cercle — forma de trofeu */}
      <div className={`text-4xl mb-2 text-center relative z-10 ${isEarned ? 'drop-shadow-md' : 'grayscale'}`}>
        {isEarned ? badge.emoji : isUnavailable ? '🚫' : '🔒'}
      </div>

      {/* Nom */}
      <h3 className={`font-bold text-sm text-center mb-1 leading-tight relative z-10 ${isEarned ? tierStyle.text : 'text-muted-foreground'}`}>
        {name}
      </h3>

      {/* Descripció curta */}
      <p className={`text-xs text-center leading-tight mb-2 relative z-10 ${isEarned ? tierStyle.text + ' opacity-80' : 'text-muted-foreground'}`}>
        {isUnavailable ? 'No disponible' : isEarned ? description : badge.requirement}
      </p>

      {/* Valor rècord personal */}
      {isEarned && badge.category === 'personal' && badge.progressLabel && (
        <div className={`text-center font-black text-base relative z-10 ${tierStyle.text}`}>
          {badge.progressLabel}
        </div>
      )}

      {/* Barra de progrés */}
      {!isEarned && !isUnavailable && badge.progress !== undefined && (
        <div className="space-y-1 relative z-10">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary/50 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${badge.progress}%` }}
            />
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

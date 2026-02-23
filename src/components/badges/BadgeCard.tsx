// ============================================================
// COMPONENT VISUAL D'UNA INSÍGNIA (guanyada o pendent)
// ============================================================

import { BadgeWithStatus, TIER_COLORS, getBadgeTexts } from '@/types/badges';
import { Lock } from 'lucide-react';

interface BadgeCardProps {
  badge: BadgeWithStatus;
  gender?: string | null;
}

const BadgeCard = ({ badge, gender }: BadgeCardProps) => {
  const { name, description } = getBadgeTexts(badge, gender);
  const tierStyle = TIER_COLORS[badge.tier];
  const isEarned = badge.earned;
  const isUnavailable = badge.unavailable;

  return (
    <div
      className={`
        relative p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden
        ${isEarned
          ? `bg-gradient-to-br ${tierStyle.bg} ${tierStyle.border} shadow-lg hover:shadow-xl hover:scale-105`
          : isUnavailable
            ? 'bg-muted/20 border-muted/30 opacity-40 shadow-neo-inset'
            : 'bg-muted/30 border-muted/50 opacity-60 shadow-neo-inset'
        }
      `}
    >
      {/* Efecte brillant per les guanyades */}
      {isEarned && (
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/10 to-transparent pointer-events-none rounded-2xl" />
      )}

      {/* Emoji gran */}
      <div className={`text-4xl mb-2 text-center relative z-10 transition-all ${isEarned ? 'drop-shadow-md' : 'grayscale'}`}>
        {isEarned ? badge.emoji : isUnavailable ? '🚫' : '🔒'}
      </div>

      {/* Nom */}
      <h3 className={`font-bold text-sm text-center mb-1 leading-tight relative z-10 ${isEarned ? tierStyle.text : 'text-muted-foreground'}`}>
        {name}
      </h3>

      <p className={`text-xs text-center leading-tight mb-3 relative z-10 ${isEarned ? tierStyle.text + ' opacity-80' : 'text-muted-foreground'}`}>
        {isUnavailable ? 'No disponible al teu gym' : isEarned ? description : badge.requirement}
      </p>

      {/* Barra de progrés (només per les pendents i no unavailable) */}
      {!isEarned && !isUnavailable && badge.progress !== undefined && (
        <div className="space-y-1 relative z-10">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary/50 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${badge.progress}%` }}
            />
          </div>
          {badge.progressLabel && (
            <p className="text-xs text-center text-muted-foreground/70">
              {badge.progressLabel}
            </p>
          )}
        </div>
      )}

      {/* Etiqueta de tier quan és guanyada */}
      {isEarned && badge.category === 'personal' && badge.progressLabel && (
        <div className="mt-2 text-center relative z-10">
          <span className={`text-lg font-black ${tierStyle.text}`}>
            {badge.progressLabel}
          </span>
        </div>
      )}

      {isEarned && badge.category !== 'personal' && (
        <div className="mt-2 text-center relative z-10">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tierStyle.text} bg-white/30 backdrop-blur-sm`}>
            ✦ {tierStyle.label} ✦
          </span>
        </div>
      )}

      {/* Indicador de bloqueig */}
      {!isEarned && !isUnavailable && (
        <div className="absolute top-2 right-2">
          <Lock className="w-3 h-3 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
};

export default BadgeCard;

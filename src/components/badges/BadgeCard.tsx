// ============================================================
// COMPONENT VISUAL D'UNA INSÍGNIA (guanyada o pendent)
// ============================================================

import { BadgeWithStatus, TIER_COLORS } from '@/types/badges';
import { Lock } from 'lucide-react';

interface BadgeCardProps {
  badge: BadgeWithStatus;
}

const BadgeCard = ({ badge }: BadgeCardProps) => {
  const tierStyle = TIER_COLORS[badge.tier];
  const isEarned = badge.earned;

  return (
    <div
      className={`
        relative p-4 rounded-2xl border-2 transition-all duration-300
        ${isEarned
          ? `bg-gradient-to-br ${tierStyle.bg} ${tierStyle.border} shadow-neo hover:shadow-neo-lg`
          : 'bg-muted/30 border-muted/50 opacity-60 shadow-neo-inset'
        }
      `}
    >
      {/* Emoji gran */}
      <div className={`text-4xl mb-2 text-center transition-all ${isEarned ? '' : 'grayscale'}`}>
        {isEarned ? badge.emoji : '🔒'}
      </div>

      {/* Nom */}
      <h3 className={`font-bold text-sm text-center mb-1 leading-tight ${isEarned ? tierStyle.text : 'text-muted-foreground'}`}>
        {badge.name}
      </h3>

      {/* Descripció */}
      <p className="text-xs text-center text-muted-foreground leading-tight mb-3">
        {isEarned ? badge.description : badge.requirement}
      </p>

      {/* Barra de progrés */}
      {!isEarned && badge.progress !== undefined && (
        <div className="space-y-1">
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
      {isEarned && (
        <div className={`mt-2 text-center`}>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tierStyle.text} bg-white/50`}>
            {tierStyle.label}
          </span>
        </div>
      )}

      {/* Indicador de bloqueig */}
      {!isEarned && (
        <div className="absolute top-2 right-2">
          <Lock className="w-3 h-3 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
};

export default BadgeCard;

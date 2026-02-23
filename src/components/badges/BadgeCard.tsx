import { useState } from 'react';
import { BadgeWithStatus, TIER_COLORS, getBadgeTexts } from '@/types/badges';
import { Lock, X, Info } from 'lucide-react';

interface BadgeCardProps {
  badge: BadgeWithStatus;
  gender?: string | null;
}

const BadgeCard = ({ badge, gender }: BadgeCardProps) => {
  const [showModal, setShowModal] = useState(false);
  const { name, description } = getBadgeTexts(badge, gender);
  const tierStyle = TIER_COLORS[badge.tier];
  const isEarned = badge.earned;
  const isUnavailable = badge.unavailable;
  const isPersonal = badge.category === 'personal';

  return (
    <>
      <div
        onClick={() => isPersonal && isEarned ? setShowModal(true) : undefined}
        className={`
          relative p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden
          ${isEarned
            ? `bg-gradient-to-br ${tierStyle.bg} ${tierStyle.border} shadow-lg hover:shadow-xl hover:scale-105`
            : isUnavailable
              ? 'bg-muted/20 border-muted/30 opacity-40 shadow-neo-inset'
              : 'bg-muted/30 border-muted/50 opacity-60 shadow-neo-inset'
          }
          ${isPersonal && isEarned ? 'cursor-pointer' : ''}
        `}
      >
        {isEarned && (
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/10 to-transparent pointer-events-none rounded-2xl" />
        )}

        <div className={`text-4xl mb-2 text-center relative z-10 transition-all ${isEarned ? 'drop-shadow-md' : 'grayscale'}`}>
          {isEarned ? badge.emoji : isUnavailable ? '🚫' : '🔒'}
        </div>

        <h3 className={`font-bold text-sm text-center mb-1 leading-tight relative z-10 ${isEarned ? tierStyle.text : 'text-muted-foreground'}`}>
          {name}
        </h3>

        <p className={`text-xs text-center leading-tight mb-3 relative z-10 ${isEarned ? tierStyle.text + ' opacity-80' : 'text-muted-foreground'}`}>
          {isUnavailable ? 'No disponible al teu gym' : isEarned ? description : badge.requirement}
        </p>

        {/* Valor del rècord personal */}
        {isPersonal && isEarned && badge.progressLabel && (
          <div className={`mt-1 text-center relative z-10 font-black text-base ${tierStyle.text}`}>
            {badge.progressLabel}
          </div>
        )}

        {isPersonal && isEarned && (
          <div className="absolute top-2 right-2 z-10">
            <Info className={`w-3.5 h-3.5 opacity-60 ${tierStyle.text}`} />
          </div>
        )}

        {/* Barra de progrés (només pendents i no unavailable) */}
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

        {/* Tier label (insígnies normals guanyades) */}
        {isEarned && !isPersonal && (
          <div className="mt-2 text-center relative z-10">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tierStyle.text} bg-white/30 backdrop-blur-sm`}>
              ✦ {tierStyle.label} ✦
            </span>
          </div>
        )}

        {!isEarned && !isUnavailable && (
          <div className="absolute top-2 right-2">
            <Lock className="w-3 h-3 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Modal de detall */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-background rounded-2xl shadow-neo p-5 max-w-xs w-full space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{badge.emoji}</span>
                <h3 className="font-bold text-base">{name}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            {badge.progressLabel && (
              <div className={`p-3 rounded-xl bg-gradient-to-br ${tierStyle.bg} text-center space-y-1`}>
                <div className={`text-2xl font-black ${tierStyle.text}`}>{badge.progressLabel}</div>
                {badge.earnedAt && (
                  <div className={`text-xs ${tierStyle.text} opacity-70`}>📅 {badge.earnedAt}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default BadgeCard;

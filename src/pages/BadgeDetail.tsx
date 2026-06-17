import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUserWithSessions } from '@/hooks/useUsers';
import { usePrograms } from '@/hooks/usePrograms';
import { calculateBadges } from '@/utils/badgeCalculations';
import { getBadgeTexts, TIER_COLORS, UNIQUE_BADGE_STYLE, TIER_ORDER, getBadgeGroupTiers, BadgeWithStatus } from '@/types/badges';
import { ChevronLeft, Lock, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

// ── COMPONENT: Vista d'un nivell dins el detall multi-nivell ─

interface TierRowProps {
  badge: BadgeWithStatus;
  gender?: string | null;
  isCurrentTier: boolean;
  isFutureTier: boolean;
  showProgress: boolean; // només al primer nivell no assolit
}

const TierRow = ({ badge, gender, isCurrentTier, showProgress }: TierRowProps) => {
  const { description } = getBadgeTexts(badge, gender);
  const tierStyle = TIER_COLORS[badge.tier];
  const isEarned = badge.earned;

  return (
    <div className={`
      relative rounded-2xl p-4 border-2 transition-all duration-300
      ${isCurrentTier
        ? `bg-gradient-to-br ${tierStyle.bg} ${tierStyle.border} shadow-lg`
        : isEarned
          ? `bg-gradient-to-br ${tierStyle.bg} ${tierStyle.border} opacity-70`
          : 'bg-muted/20 border-muted/30 opacity-50'
      }
    `}>
      {isEarned && (
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/10 to-transparent pointer-events-none rounded-2xl" />
      )}

      <div className="relative z-10 flex items-center gap-3">
        <div className={`text-3xl flex-shrink-0 ${!isEarned ? 'grayscale' : isCurrentTier ? 'drop-shadow-md' : ''}`}>
          {isEarned ? badge.emoji : '🔒'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isEarned ? `${tierStyle.text} bg-white/30` : 'text-muted-foreground bg-muted/50'}`}>
              ✦ {tierStyle.label} ✦
            </span>
            {isCurrentTier && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Nivell actual
              </span>
            )}
            {isEarned && badge.earnedAt && (
              <span className={`text-xs ${tierStyle.text} opacity-70`}>
                📅 {badge.earnedAt}
              </span>
            )}
          </div>
          <p className={`text-sm leading-snug ${isEarned ? tierStyle.text : 'text-muted-foreground'}`}>
            {isEarned ? description : badge.requirement}
          </p>
        </div>

        <div className="flex-shrink-0">
          {isEarned
            ? <CheckCircle2 className={`w-5 h-5 ${isCurrentTier ? tierStyle.text : tierStyle.text + ' opacity-50'}`} />
            : <Lock className="w-4 h-4 text-muted-foreground/40" />
          }
        </div>
      </div>

      {/* Barra de progrés — només al primer nivell no assolit */}
      {!isEarned && showProgress && badge.progress !== undefined && (
        <div className="relative z-10 mt-3 space-y-1">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary/60 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${badge.progress}%` }}
            />
          </div>
          {badge.progressLabel && (
            <p className="text-xs text-center text-muted-foreground/70">{badge.progressLabel}</p>
          )}
        </div>
      )}
    </div>
  );
};

// ── COMPONENT PRINCIPAL ──────────────────────────────────────

const BadgeDetail = () => {
  const { badgeId } = useParams<{ badgeId: string }>();
  const navigate = useNavigate();
  const { firestoreUserId, userProfile } = useAuth();
  const { user: currentUserData, loading: loadingUser } = useCurrentUserWithSessions(firestoreUserId);
  const { programs, loading: loadingPrograms } = usePrograms();

  const gender = userProfile?.gender;

  const programsArray = useMemo(() => Object.values(programs), [programs]);

  const totalAvailableCategories = useMemo(() => {
    const cats = new Set(programsArray.map((p: any) => p.category).filter(Boolean));
    return cats.size;
  }, [programsArray]);

  const programsForBadges = useMemo(() => {
    return programsArray.map((p: any) => ({ name: p.name, category: p.category || '' }));
  }, [programsArray]);

  const allBadgesWithStatus = useMemo(() => {
    if (!currentUserData) return [];
    return calculateBadges(
      { sessions: currentUserData.sessions || [], firstSession: currentUserData.firstSession },
      programsForBadges,
      totalAvailableCategories
    );
  }, [currentUserData, programsForBadges, totalAvailableCategories]);

  const badge = useMemo(
    () => allBadgesWithStatus.find(b => b.id === badgeId) || null,
    [allBadgesWithStatus, badgeId]
  );

  const groupTiers = useMemo(() => {
    if (!badge?.group) return null;
    const groupDefs = getBadgeGroupTiers(badge.group);
    return groupDefs.map(def => allBadgesWithStatus.find(b => b.id === def.id) || { ...def, earned: false });
  }, [badge, allBadgesWithStatus]);

  const currentTierIndex = useMemo(() => {
    if (!groupTiers) return -1;
    let highest = -1;
    groupTiers.forEach((t, i) => { if (t.earned) highest = i; });
    return highest;
  }, [groupTiers]);

  if (loadingUser || loadingPrograms) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!badge) {
    return (
      <div className="px-4 max-w-lg mx-auto text-center py-16">
        <p className="text-muted-foreground">Insígnia no trobada.</p>
        <button onClick={() => navigate('/badges')} className="mt-4 text-primary underline text-sm">
          Tornar a les insígnies
        </button>
      </div>
    );
  }

  const { name } = getBadgeTexts(badge, gender);
  const isUnavailable = badge.unavailable;

  // ── VISTA MULTI-NIVELL (grup Zepp) ────────────────────────
  if (groupTiers && groupTiers.length > 0) {
    const activeTier = currentTierIndex >= 0 ? groupTiers[currentTierIndex] : null;
    const activeTierStyle = activeTier ? TIER_COLORS[activeTier.tier] : TIER_COLORS['bronze'];
    const hasAny = currentTierIndex >= 0;

    return (
      <div className="px-4 max-w-lg mx-auto pb-12">
        <button
          onClick={() => navigate('/badges')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Tornar a les insígnies
        </button>

        <div className={`
          rounded-3xl p-8 text-center shadow-neo border-2 overflow-hidden relative mb-6
          ${hasAny
            ? `bg-gradient-to-br ${activeTierStyle.bg} ${activeTierStyle.border}`
            : 'bg-muted/30 border-muted/50'
          }
        `}>
          {hasAny && (
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/10 to-transparent pointer-events-none" />
          )}
          <div className={`text-8xl mb-4 relative z-10 ${!hasAny ? 'grayscale opacity-40' : 'drop-shadow-lg'}`}>
            {badge.emoji}
          </div>
          {hasAny && activeTier && (
            <div className="relative z-10 mb-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${activeTierStyle.text} bg-white/30 backdrop-blur-sm`}>
                ✦ {TIER_COLORS[activeTier.tier].label} ✦
              </span>
            </div>
          )}
          <h1 className={`text-3xl font-black mb-2 relative z-10 ${hasAny ? activeTierStyle.text : 'text-muted-foreground'}`}>
            {name}
          </h1>
          <p className={`text-sm relative z-10 ${hasAny ? activeTierStyle.text + ' opacity-80' : 'text-muted-foreground'}`}>
            {hasAny
              ? `${currentTierIndex + 1} de ${groupTiers.length} nivells assolits`
              : 'Encara no has assolit cap nivell'
            }
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide px-1 mb-2">
            Nivells
          </h2>
          {groupTiers.map((tierBadge, index) => (
            <TierRow
              key={tierBadge.id}
              badge={tierBadge as BadgeWithStatus}
              gender={gender}
              isCurrentTier={index === currentTierIndex}
              isFutureTier={index > currentTierIndex}
              showProgress={index === currentTierIndex + 1}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── VISTA ÚNICA (trofeu) — sense tier label, color verd ──
  const { description } = getBadgeTexts(badge, gender);
  const isEarned = badge.earned;
  const uniqueStyle = UNIQUE_BADGE_STYLE;

  return (
    <div className="px-4 max-w-lg mx-auto pb-12">
      <button
        onClick={() => navigate('/badges')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Tornar a les insígnies
      </button>

      {/* Targeta principal — color verd, sense tier label */}
      <div className={`
        rounded-3xl p-8 text-center shadow-neo border-2 overflow-hidden relative
        ${isEarned
          ? `bg-gradient-to-br ${uniqueStyle.bg} ${uniqueStyle.border}`
          : isUnavailable
            ? 'bg-muted/20 border-muted/30'
            : 'bg-muted/30 border-muted/50'
        }
      `}>
        {isEarned && (
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/10 to-transparent pointer-events-none" />
        )}

        <div className={`text-8xl mb-4 relative z-10 ${!isEarned ? 'grayscale opacity-50' : 'drop-shadow-lg'}`}>
          {isEarned ? badge.emoji : isUnavailable ? '🚫' : '🔒'}
        </div>

        <h1 className={`text-3xl font-black mb-2 relative z-10 ${isEarned ? uniqueStyle.text : 'text-muted-foreground'}`}>
          {name}
        </h1>

        {isEarned && badge.earnedAt && (
          <div className="relative z-10 mb-4">
            <span className={`text-sm font-medium px-3 py-1 rounded-full bg-white/30 ${uniqueStyle.text}`}>
              📅 {badge.earnedAt}
            </span>
          </div>
        )}

        {isEarned && badge.category === 'personal' && badge.progressLabel && (
          <div className={`text-5xl font-black mb-4 relative z-10 ${uniqueStyle.text}`}>
            {badge.progressLabel}
          </div>
        )}
      </div>

      {/* Bloc d'explicació */}
      <div className="mt-6 p-5 rounded-2xl shadow-neo bg-background space-y-4">
        <div>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-1">
            🎯 Objectiu
          </h2>
          <p className="text-base">
            {isEarned ? description : badge.requirement}
          </p>
        </div>

        {!isEarned && !isUnavailable && badge.progress !== undefined && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progrés actual</span>
              <span>{badge.progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-700"
                style={{ width: `${badge.progress}%` }}
              />
            </div>
            {badge.progressLabel && (
              <p className="text-sm text-muted-foreground mt-2 text-center">{badge.progressLabel}</p>
            )}
          </div>
        )}

        {isUnavailable && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Lock className="w-4 h-4" />
            <span>Aquesta insígnia no està disponible al teu gimnàs.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BadgeDetail;

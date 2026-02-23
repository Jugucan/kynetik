import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUserWithSessions } from '@/hooks/useUsers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePrograms } from '@/hooks/usePrograms';
import { calculateBadges } from '@/utils/badgeCalculations';
import { getBadgeTexts, TIER_COLORS } from '@/types/badges';
import { ChevronLeft, Lock } from 'lucide-react';
import { useMemo } from 'react';

const BadgeDetail = () => {
  const { badgeId } = useParams<{ badgeId: string }>();
  const navigate = useNavigate();
  const { firestoreUserId } = useAuth();
  const { userProfile } = useUserProfile();
  const { user: currentUserData, loading: loadingUser } = useCurrentUserWithSessions(firestoreUserId);
  const { programs, loading: loadingPrograms } = usePrograms();

  const programsArray = useMemo(() => Object.values(programs), [programs]);

  const totalAvailableCategories = useMemo(() => {
    const cats = new Set(programsArray.map((p: any) => p.category).filter(Boolean));
    return cats.size;
  }, [programsArray]);

  const programsForBadges = useMemo(() => {
    return programsArray.map((p: any) => ({ name: p.name, category: p.category || '' }));
  }, [programsArray]);

  const badge = useMemo(() => {
    if (!currentUserData) return null;
    const all = calculateBadges(
      { sessions: currentUserData.sessions || [], firstSession: currentUserData.firstSession },
      programsForBadges,
      totalAvailableCategories
    );
    return all.find(b => b.id === badgeId) || null;
  }, [currentUserData, programsForBadges, totalAvailableCategories, badgeId]);

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

  const gender = userProfile?.gender;
  const { name, description } = getBadgeTexts(badge, gender);
  const tierStyle = TIER_COLORS[badge.tier];
  const isEarned = badge.earned;
  const isUnavailable = badge.unavailable;

  return (
    <div className="px-4 max-w-lg mx-auto pb-12">

      {/* Botó tornar */}
      <button
        onClick={() => navigate('/badges')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Tornar a les insígnies
      </button>

      {/* Targeta principal */}
      <div className={`
        rounded-3xl p-8 text-center shadow-neo border-2 overflow-hidden relative
        ${isEarned
          ? `bg-gradient-to-br ${tierStyle.bg} ${tierStyle.border}`
          : isUnavailable
            ? 'bg-muted/20 border-muted/30'
            : 'bg-muted/30 border-muted/50'
        }
      `}>
        {isEarned && (
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/10 to-transparent pointer-events-none" />
        )}

        {/* Emoji gran */}
        <div className={`text-8xl mb-4 relative z-10 ${!isEarned ? 'grayscale opacity-50' : 'drop-shadow-lg'}`}>
          {isEarned ? badge.emoji : isUnavailable ? '🚫' : '🔒'}
        </div>

        {/* Tier */}
        {isEarned && (
          <div className="relative z-10 mb-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${tierStyle.text} bg-white/30 backdrop-blur-sm`}>
              ✦ {tierStyle.label} ✦
            </span>
          </div>
        )}

        {/* Nom */}
        <h1 className={`text-3xl font-black mb-2 relative z-10 ${isEarned ? tierStyle.text : 'text-muted-foreground'}`}>
          {name}
        </h1>

        {/* Data d'obtenció o rècord */}
        {isEarned && badge.earnedAt && (
          <div className="relative z-10 mb-4">
            <span className={`text-sm font-medium px-3 py-1 rounded-full bg-white/30 ${tierStyle.text}`}>
              📅 {badge.earnedAt}
            </span>
          </div>
        )}

        {/* Valor rècord personal */}
        {isEarned && badge.category === 'personal' && badge.progressLabel && (
          <div className={`text-5xl font-black mb-4 relative z-10 ${tierStyle.text}`}>
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

import { calculateBadges } from "@/utils/badgeCalculations";
import { calculateProgression } from "@/utils/progressionCalculations";
import { useMemo, useRef, useEffect } from "react";
import { useMemo } from "react";
import { Mail, Phone, Cake, MapPin, Award, Zap, Calendar, TrendingUp } from "lucide-react";
import { useCurrentUserWithSessions } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { calculateAdvancedStats, calculateYearlyTrend } from '@/utils/advancedStats';
import { getBenvingut } from "@/utils/genderHelpers";
import { useMotivationalPhrase } from '@/hooks/useMotivationalPhrase';
import { useAchievement } from "@/contexts/AchievementContext";

const UserIndex = () => {
  const { firestoreUserId } = useAuth();
  const { userProfile } = useUserProfile();
  const { user: currentUserData, loading } = useCurrentUserWithSessions(firestoreUserId);
  const { triggerAchievement } = useAchievement();
  const prevBadgeIds = useRef<Set<string> | null>(null);
const prevLevelId = useRef<string | null>(null);

useEffect(() => {
  if (loading || !currentUserData) return;
  const sessions = Array.isArray(currentUserData.sessions) ? currentUserData.sessions : [];
  if (sessions.length === 0) return;

  // Insígnies — comparació en memòria, zero lectures Firebase
  try {
    const badges = calculateBadges(
      { sessions, firstSession: currentUserData.firstSession },
      []
    );
    const earnedIds = new Set<string>(
      badges.filter((b) => b.earned && !b.unavailable).map((b) => b.id)
    );
    if (prevBadgeIds.current !== null) {
      for (const id of earnedIds) {
        if (!prevBadgeIds.current.has(id)) {
          const badge = badges.find((b) => b.id === id);
          triggerAchievement({
            type: "badge",
            title: badge?.name || "Nova Insígnia!",
            description: badge?.description || "",
            icon: badge?.emoji || "🏅",
          });
        }
      }
    }
    prevBadgeIds.current = earnedIds;
  } catch (e) {
    console.warn("Badge detection error:", e);
  }

  // Nivell — comparació en memòria, zero lectures Firebase
  try {
    const progression = calculateProgression(sessions);
    const currentLevelId = progression.level.id;
    if (prevLevelId.current !== null && currentLevelId !== prevLevelId.current) {
      triggerAchievement({
        type: "level",
        title: `${progression.level.emoji} ${progression.level.name}`,
        description: progression.level.description,
        icon: progression.level.emoji,
      });
    }
    prevLevelId.current = currentLevelId;
  } catch (e) {
    console.warn("Level detection error:", e);
  }

}, [currentUserData, loading]);

   const basicStats = useMemo(() => {
    if (!currentUserData || !currentUserData.sessions) {
      return { totalSessions: 0, uniquePrograms: 0, activePrograms: [], generalRanking: { rank: 0, total: 0, percentile: 0 } };
    }
    const sessions = Array.isArray(currentUserData.sessions) ? currentUserData.sessions : [];
    const allPrograms = new Set(sessions.map(s => s.activity));
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSessions = sessions.filter(s => new Date(s.date) >= thirtyDaysAgo);
    const programCount: { [program: string]: number } = {};
    recentSessions.forEach(s => { programCount[s.activity] = (programCount[s.activity] || 0) + 1; });
    const activePrograms = Object.entries(programCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name);
    const generalRanking = currentUserData.rankingCache?.totalSessions || { rank: 0, total: 0, percentile: 0 };
    return { totalSessions: sessions.length, uniquePrograms: allPrograms.size, activePrograms, generalRanking };
  }, [currentUserData]);

  const phraseStats = useMemo(() => {
    if (!currentUserData || !currentUserData.sessions) return null;
    const sessions = Array.isArray(currentUserData.sessions) ? currentUserData.sessions : [];
    const advancedStats = calculateAdvancedStats(currentUserData);
    const { trend: yearlyTrend } = calculateYearlyTrend(sessions);
    return {
      name: currentUserData.name || userProfile?.displayName || '',
      gender: currentUserData.gender || userProfile?.gender || null,
      totalSessions: sessions.length,
      autodiscipline: advancedStats.autodiscipline,
      autodisciplineLabel: advancedStats.autodisciplineLevel.label,
      daysSinceLastSession: currentUserData.daysSinceLastSession || 0,
      improvementTrend: advancedStats.improvementRecent.trend,
      activePrograms: basicStats.activePrograms,
      yearlyTrend,
      daysBetweenSessions: advancedStats.daysBetweenSessions,
      memberSinceYear: currentUserData.firstSession ? new Date(currentUserData.firstSession).getFullYear() : null
    };
  }, [currentUserData, userProfile, basicStats.activePrograms]);

  const { title, phrase, emoji, isLoading: phraseLoading } = useMotivationalPhrase(phraseStats);

  if (loading) {
    return (
      <div className="space-y-6 px-4 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold">{getBenvingut(userProfile?.gender)}!</h1>
        <div className="text-center py-8 text-muted-foreground">Carregant...</div>
      </div>
    );
  }

  if (!currentUserData) {
    return (
      <div className="space-y-6 px-4 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold">{getBenvingut(userProfile?.gender)}, {userProfile?.displayName}!</h1>
        <div className="p-8 rounded-xl shadow-neo bg-background text-center">
          <p className="text-muted-foreground">Encara no tens sessions registrades.</p>
          <p className="text-sm text-muted-foreground mt-2">Quan assisteixis a la teva primera classe, les teves estadístiques apareixeran aquí!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 max-w-7xl mx-auto pb-8">

      <div className="flex items-center gap-3">
        <img
          src={currentUserData.profileImageUrl || currentUserData.avatar}
          alt={currentUserData.name}
          className="w-12 h-12 rounded-full shadow-neo object-cover"
        />
        <div>
          <h1 className="text-2xl font-bold">{getBenvingut(userProfile?.gender)}, {userProfile?.displayName}! 👋</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline" className={currentUserData.center === "Arbúcies" ? "bg-blue-100" : "bg-green-100"}>
              <MapPin className="w-3 h-3 mr-1" />
              {currentUserData.center}
            </Badge>
            <Badge variant="outline">
              <Cake className="w-3 h-3 mr-1" />
              {currentUserData.age} anys
            </Badge>
          </div>
        </div>
      </div>

      {(phrase || phraseLoading) && (
        <div className="p-4 rounded-xl shadow-neo bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="text-2xl flex-shrink-0">{emoji}</div>
            <div className="flex-1 min-w-0">
              {phraseLoading ? (
                <div className="flex items-center gap-2 py-1">
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <>
                  {title && <h3 className="font-bold text-sm text-primary mb-1">{title}</h3>}
                  <p className="text-xs text-foreground leading-relaxed">{phrase}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-neo text-center hover:shadow-neo-lg transition-all">
          <Calendar className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-blue-700 mb-1">{basicStats.totalSessions}</div>
          <div className="text-xs text-blue-600 font-medium">Sessions Totals</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-neo text-center hover:shadow-neo-lg transition-all">
          <Award className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-green-700 mb-1">{basicStats.uniquePrograms}</div>
          <div className="text-xs text-green-600 font-medium">Programes Diferents</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-neo text-center hover:shadow-neo-lg transition-all">
          <TrendingUp className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-purple-700 mb-1">{currentUserData.daysSinceLastSession || 0}</div>
          <div className="text-xs text-purple-600 font-medium">Dies sense venir</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-neo text-center hover:shadow-neo-lg transition-all">
          <Calendar className="w-5 h-5 text-orange-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-orange-700 mb-1">
            {currentUserData.firstSession ? new Date(currentUserData.firstSession).getFullYear() : 'N/A'}
          </div>
          <div className="text-xs text-orange-600 font-medium">Membre des de</div>
        </div>
      </div>

      <Separator />

      <div className="p-4 rounded-xl shadow-neo bg-background">
        <h3 className="font-semibold text-sm mb-3 flex items-center">
          <Mail className="w-4 h-4 mr-2 text-primary" />
          La teva Informació
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-lg">
            <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="text-xs truncate">{currentUserData.email || 'No disponible'}</span>
          </div>
          <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-lg">
            <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="text-xs">{currentUserData.phone || 'No disponible'}</span>
          </div>
          <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-lg">
            <Cake className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="text-xs">{currentUserData.birthday}</span>
          </div>
        </div>
      </div>

      <Separator />

      <div className="p-4 rounded-xl shadow-neo bg-background">
        <h3 className="font-semibold text-sm mb-3 flex items-center">
          <Zap className="w-4 h-4 mr-2 text-primary" />
          La teva Posició Global
        </h3>
        <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-neo">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-indigo-600 mb-1 font-medium">Ranking General d'Assistència</div>
              {basicStats.generalRanking.rank > 0 ? (
                <div className="text-3xl font-bold text-indigo-700">#{basicStats.generalRanking.rank}</div>
              ) : (
                <div className="text-sm text-indigo-500">Pendent de càlcul</div>
              )}
            </div>
            {basicStats.generalRanking.total > 0 && (
              <div className="text-right">
                <div className="text-xs text-indigo-600 mb-1">de {basicStats.generalRanking.total} usuaris</div>
                <div className="text-xs text-indigo-500">Top {Math.round((basicStats.generalRanking.rank / basicStats.generalRanking.total) * 100)}%</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="p-4 rounded-xl shadow-neo bg-background">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg shadow-neo-inset bg-purple-500/10">
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Els teus Programes Actius</h2>
            <p className="text-xs text-muted-foreground">Últims 30 dies</p>
          </div>
        </div>
        {basicStats.activePrograms.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {basicStats.activePrograms.map((program, idx) => (
              <span key={idx} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold shadow-neo hover:shadow-neo-sm transition-all cursor-default text-sm">
                {program}
              </span>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-xl shadow-neo-inset bg-muted/30 text-center">
            <p className="text-muted-foreground text-xs">No tens sessions recents. Apunta't a una classe!</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default UserIndex;

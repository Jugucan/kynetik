import { useMemo } from 'react';
import { useCurrentUserWithSessions } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePrograms } from '@/hooks/usePrograms';
import { calculateBadges } from '@/utils/badgeCalculations';
import { calculateProgression } from '@/utils/progressionCalculations';
import BadgeGrid from '@/components/badges/BadgeGrid';
import ProgressionPanel from '@/components/progression/ProgressionPanel';
import { Trophy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const Badges = () => {
  const { firestoreUserId } = useAuth();
  const { userProfile } = useUserProfile();
  const { user: currentUserData, loading: loadingUser } = useCurrentUserWithSessions(firestoreUserId);
  const { programs, loading: loadingPrograms } = usePrograms();

  const programsArray = useMemo(() => Object.values(programs), [programs]);

  const totalAvailableCategories = useMemo(() => {
    const cats = new Set(
      programsArray.map((p: any) => p.category).filter(Boolean)
    );
    return cats.size;
  }, [programsArray]);

  const programsForBadges = useMemo(() => {
    return programsArray.map((p: any) => ({
      name: p.name,
      category: p.category || '',
    }));
  }, [programsArray]);

  const progression = useMemo(() => {
    if (!currentUserData?.sessions?.length) return null;
    return calculateProgression(currentUserData.sessions);
  }, [currentUserData]);

  const badges = useMemo(() => {
    if (!currentUserData) return [];
    return calculateBadges(
      {
        sessions: currentUserData.sessions || [],
        firstSession: currentUserData.firstSession,
      },
      programsForBadges,
      totalAvailableCategories
    );
  }, [currentUserData, programsForBadges, totalAvailableCategories]);

  const loading = loadingUser || loadingPrograms;

  if (loading) {
    return (
      <div className="space-y-6 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-7 h-7 text-primary" />
          Progrés i Insígnies
        </h1>
        <div className="text-center py-12 text-muted-foreground">
          Carregant el teu progrés...
        </div>
      </div>
    );
  }

  if (!currentUserData) {
    return (
      <div className="space-y-6 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-7 h-7 text-primary" />
          Progrés i Insígnies
        </h1>
        <div className="p-8 rounded-xl shadow-neo bg-background text-center">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-muted-foreground">Encara no tens sessions registrades.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Quan assisteixis a la teva primera classe, el teu progrés apareixerà aquí!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 max-w-4xl mx-auto pb-8">
      <div className="flex items-center gap-3">
        <Trophy className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Progrés i Insígnies</h1>
          <p className="text-sm text-muted-foreground">
            El teu camí esportiu, {userProfile?.displayName}!
          </p>
        </div>
      </div>

      {progression && (
        <ProgressionPanel
          data={progression}
          userName={userProfile?.displayName}
        />
      )}

      <Separator />

      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          🏅 Les teves Insígnies
        </h2>
        <BadgeGrid badges={badges} gender={userProfile?.gender} />
      </div>
    </div>
  );
};

export default Badges;

// ============================================================
// PÀGINA PRINCIPAL D'INSÍGNIES (vista usuari)
// ============================================================

import { useMemo } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { calculateBadges } from '@/utils/badgeCalculations';
import BadgeGrid from '@/components/badges/BadgeGrid';
import { Trophy } from 'lucide-react';

const Badges = () => {
  const { userProfile } = useUserProfile();
  const { users, loading } = useUsers();

  const currentUserData = users.find(u => u.email === userProfile?.email);

  const badges = useMemo(() => {
    if (!currentUserData) return [];
    return calculateBadges({
      sessions: currentUserData.sessions || [],
      firstSession: currentUserData.firstSession,
    });
  }, [currentUserData]);

  if (loading) {
    return (
      <div className="space-y-6 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="w-8 h-8 text-primary" />
          Insígnies
        </h1>
        <div className="text-center py-12 text-muted-foreground">Carregant les teves insígnies...</div>
      </div>
    );
  }

  if (!currentUserData) {
    return (
      <div className="space-y-6 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="w-8 h-8 text-primary" />
          Insígnies
        </h1>
        <div className="p-8 rounded-xl shadow-neo bg-background text-center">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-muted-foreground">Encara no tens sessions registrades.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Quan assisteixis a la teva primera classe, les teves insígnies apareixeran aquí!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 max-w-4xl mx-auto pb-8">
      <div className="flex items-center gap-3">
        <Trophy className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Les teves Insígnies</h1>
          <p className="text-sm text-muted-foreground">
            Completa reptes i desbloqueja recompenses, {userProfile?.displayName}!
          </p>
        </div>
      </div>

      <BadgeGrid badges={badges} />
    </div>
  );
};

export default Badges;

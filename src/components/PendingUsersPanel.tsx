import { usePendingUsers } from '@/hooks/usePendingUsers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { NeoCard } from '@/components/NeoCard';
import { UserCheck, UserX, Clock, Phone, Calendar } from 'lucide-react';

const formatBirthDate = (birthDate?: string): string => {
  if (!birthDate) return 'No especificada';
  // El format és YYYY-MM-DD (del input type="date")
  const [year, month, day] = birthDate.split('-');
  return `${day}/${month}/${year}`;
};

const formatRegistrationDate = (date: Date): string => {
  return date.toLocaleDateString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const PendingUsersPanel = () => {
  const { pendingUsers, loading, approveUser, rejectUser } = usePendingUsers();
  const { userProfile } = useUserProfile();

  // Només superadmin i admin poden veure aquest panell
  const canApprove = userProfile?.role === 'superadmin' || userProfile?.role === 'admin';
  if (!canApprove) return null;

  // Si no hi ha pendents i no està carregant, no mostrem res
  if (!loading && pendingUsers.length === 0) return null;

  return (
    <NeoCard className="border-2 border-yellow-300 bg-yellow-50/50">
      {/* Capçalera */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-yellow-100 border-2 border-yellow-300 flex items-center justify-center shadow-neo-inset">
          <Clock className="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Sol·licituds d'accés pendents
          </h2>
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Carregant...'
              : `${pendingUsers.length} sol·licitud${pendingUsers.length !== 1 ? 's' : ''} pendent${pendingUsers.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
      </div>

      {/* Llista de sol·licituds */}
      {loading ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Carregant sol·licituds...
        </div>
      ) : (
        <div className="space-y-3">
          {pendingUsers.map((user) => (
            <div
              key={user.uid}
              className="bg-background rounded-xl border-2 border-border shadow-neo p-4"
            >
              {/* Nom i email */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {user.displayName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <span className="text-xs text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-full px-2 py-0.5 whitespace-nowrap">
                  Pendent
                </span>
              </div>

              {/* Dades addicionals */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {user.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.birthDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatBirthDate(user.birthDate)}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                Sol·licitud rebuda: {formatRegistrationDate(user.createdAt)}
              </p>

              {/* Botons d'acció */}
              <div className="flex gap-2">
                <button
                  onClick={() => approveUser(user.uid)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-green-50 text-green-700 font-semibold rounded-lg border-2 border-green-200 shadow-neo hover:shadow-neo-sm hover:translate-y-0.5 transition-all text-sm"
                >
                  <UserCheck className="w-4 h-4" />
                  Aprovar
                </button>
                <button
                  onClick={() => rejectUser(user.uid)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-red-50 text-red-700 font-semibold rounded-lg border-2 border-red-200 shadow-neo hover:shadow-neo-sm hover:translate-y-0.5 transition-all text-sm"
                >
                  <UserX className="w-4 h-4" />
                  Rebutjar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </NeoCard>
  );
};

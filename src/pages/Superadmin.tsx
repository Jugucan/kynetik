import { Shield, Users, Building2, Clock, CheckCircle } from "lucide-react";
import { NeoCard } from "@/components/NeoCard";
import { usePendingUsers } from "@/hooks/usePendingUsers";

const Superadmin = () => {
  const { pendingUsers, loading, approveUser, rejectUser } = usePendingUsers();

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-neo-inset">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            Tauler de superadmin
          </h1>
        </div>
        <p className="text-muted-foreground">
          Gestió global de l'ecosistema Kynetik
        </p>
      </div>

      {/* Targetes de resum */}
      <div className="grid md:grid-cols-3 gap-6">

        <NeoCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center shadow-neo-inset">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sol·licituds pendents</p>
              <p className="text-2xl font-bold text-yellow-600">
                {loading ? '...' : pendingUsers.length}
              </p>
            </div>
          </div>
        </NeoCard>

        <NeoCard className="opacity-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-neo-inset">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gimnasos registrats</p>
              <p className="text-2xl font-bold text-primary">—</p>
              <p className="text-xs text-muted-foreground">Pròximament</p>
            </div>
          </div>
        </NeoCard>

        <NeoCard className="opacity-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shadow-neo-inset">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Usuaris totals</p>
              <p className="text-2xl font-bold text-accent">—</p>
              <p className="text-xs text-muted-foreground">Pròximament</p>
            </div>
          </div>
        </NeoCard>

      </div>

      {/* Sol·licituds d'accés */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Sol·licituds d'accés</h2>

        {loading ? (
          <NeoCard>
            <div className="text-center py-8 text-muted-foreground text-sm">
              Carregant sol·licituds...
            </div>
          </NeoCard>
        ) : pendingUsers.length === 0 ? (
          <NeoCard>
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-foreground font-semibold mb-1">Tot al dia!</p>
              <p className="text-muted-foreground text-sm">
                No hi ha cap sol·licitud pendent d'aprovació
              </p>
            </div>
          </NeoCard>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <NeoCard key={user.uid}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-semibold text-foreground">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <span className="text-xs text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-full px-2 py-0.5 whitespace-nowrap">
                    Pendent
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 text-sm text-muted-foreground">
                  {user.phone && (
                    <p>📞 {user.phone}</p>
                  )}
                  {user.birthDate && (
                    <p>🎂 {user.birthDate.split('-').reverse().join('/')}</p>
                  )}
                  <p className="col-span-2 text-xs">
                    Sol·licitud: {user.createdAt.toLocaleDateString('ca-ES', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => approveUser(user.uid)}
                    className="flex-1 py-2 px-3 bg-green-50 text-green-700 font-semibold rounded-lg border-2 border-green-200 shadow-neo hover:shadow-neo-sm hover:translate-y-0.5 transition-all text-sm"
                  >
                    ✓ Aprovar
                  </button>
                  <button
                    onClick={() => rejectUser(user.uid)}
                    className="flex-1 py-2 px-3 bg-red-50 text-red-700 font-semibold rounded-lg border-2 border-red-200 shadow-neo hover:shadow-neo-sm hover:translate-y-0.5 transition-all text-sm"
                  >
                    ✕ Rebutjar
                  </button>
                </div>
              </NeoCard>
            ))}
          </div>
        )}
      </div>

      {/* Seccions futures */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Pròximament</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <NeoCard className="opacity-50 border-dashed">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="font-semibold text-foreground">Gestió de gimnasos</p>
                <p className="text-sm text-muted-foreground">
                  Crear, editar i gestionar els gimnasos de l'ecosistema
                </p>
              </div>
            </div>
          </NeoCard>

          <NeoCard className="opacity-50 border-dashed">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="font-semibold text-foreground">Gestió d'usuaris global</p>
                <p className="text-sm text-muted-foreground">
                  Veure i gestionar tots els usuaris de tots els gimnasos
                </p>
              </div>
            </div>
          </NeoCard>
        </div>
      </div>

    </div>
  );
};

export default Superadmin;

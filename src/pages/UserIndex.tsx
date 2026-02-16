import { Calendar, TrendingUp, Award, Clock } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useUserProfile } from "@/hooks/useUserProfile";

const UserIndex = () => {
  const { userProfile } = useUserProfile();
  const { users, loading } = useUsers();

  if (loading) {
    return (
      <div className="space-y-6 px-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Benvinguda!</h1>
        </div>
        <div className="text-center py-8 text-muted-foreground">Carregant...</div>
      </div>
    );
  }

  // Trobar les dades de l'usuari actual
  const currentUserData = users.find(u => u.email === userProfile?.email);

  if (!currentUserData) {
    return (
      <div className="space-y-6 px-4 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold">Benvinguda, {userProfile?.displayName}!</h1>
        <div className="p-8 rounded-xl shadow-neo bg-background text-center">
          <p className="text-muted-foreground">Encara no tens sessions registrades.</p>
          <p className="text-sm text-muted-foreground mt-2">Quan assisteixis a la teva primera classe, les teves estadístiques apareixeran aquí!</p>
        </div>
      </div>
    );
  }

  // Calcular dades
  const userSessions = currentUserData.sessions || [];
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  
  // Sessions aquest mes
  const sessionsThisMonth = userSessions.filter(s => s.date.startsWith(currentMonth)).length;

  // Programes actius (últims 30 dies)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentSessions = userSessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= thirtyDaysAgo;
  });

  const programCount: { [program: string]: number } = {};
  recentSessions.forEach(s => {
    programCount[s.activity] = (programCount[s.activity] || 0) + 1;
  });

  const activePrograms = Object.entries(programCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  // Última sessió
  const lastSession = userSessions[userSessions.length - 1];
  const daysSinceLastSession = lastSession 
    ? Math.floor((now.getTime() - new Date(lastSession.date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Benvinguda, {userProfile?.displayName}! 👋</h1>
        <p className="text-muted-foreground mt-1">Aquí tens un resum de la teva activitat</p>
      </div>

      {/* Targetes principals amb estil neomòrfic */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Sessions aquest mes */}
        <div className="p-6 rounded-xl shadow-neo bg-gradient-to-br from-blue-500/10 to-blue-600/5 hover:shadow-neo-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-muted-foreground">Sessions aquest mes</p>
            <div className="p-3 rounded-xl shadow-neo-inset bg-blue-500/10">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <p className="text-4xl font-bold text-foreground mb-2">{sessionsThisMonth}</p>
          <p className="text-xs text-muted-foreground">
            {now.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Total sessions */}
        <div className="p-6 rounded-xl shadow-neo bg-gradient-to-br from-green-500/10 to-green-600/5 hover:shadow-neo-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-muted-foreground">Total sessions</p>
            <div className="p-3 rounded-xl shadow-neo-inset bg-green-500/10">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <p className="text-4xl font-bold text-foreground mb-2">{userSessions.length}</p>
          <p className="text-xs text-muted-foreground">
            Des de {new Date(currentUserData.firstSession).toLocaleDateString('ca-ES')}
          </p>
        </div>

        {/* Última sessió */}
        <div className="p-6 rounded-xl shadow-neo bg-gradient-to-br from-orange-500/10 to-orange-600/5 hover:shadow-neo-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-muted-foreground">Última sessió</p>
            <div className="p-3 rounded-xl shadow-neo-inset bg-orange-500/10">
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <p className="text-4xl font-bold text-foreground mb-2">
            {daysSinceLastSession === 0 ? 'Avui' : `Fa ${daysSinceLastSession}d`}
          </p>
          {lastSession && (
            <p className="text-xs text-muted-foreground">
              {lastSession.activity} - {new Date(lastSession.date).toLocaleDateString('ca-ES')}
            </p>
          )}
        </div>
      </div>

      {/* Programes actius */}
      <div className="p-6 rounded-xl shadow-neo bg-background">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg shadow-neo-inset bg-purple-500/10">
            <Award className="w-5 h-5 text-purple-500" />
          </div>
          <h2 className="text-xl font-semibold">Programes actius</h2>
        </div>
        {activePrograms.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {activePrograms.map((program, idx) => (
              <span 
                key={idx} 
                className="px-4 py-2 rounded-xl bg-primary/10 text-primary font-semibold shadow-neo hover:shadow-neo-sm transition-all cursor-default"
              >
                {program}
              </span>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl shadow-neo-inset bg-muted/30">
            <p className="text-muted-foreground text-sm text-center">
              No tens sessions recents. Apunta't a una classe!
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          📊 Programes dels últims 30 dies
        </p>
      </div>

      {/* Motivació */}
      <div className="p-6 rounded-xl shadow-neo bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
        <div className="flex items-start gap-3">
          <div className="text-3xl">💪</div>
          <div>
            <h3 className="font-bold text-lg mb-2 text-primary">Segueix així!</h3>
            <p className="text-sm text-foreground">
              {sessionsThisMonth >= 8 
                ? `Estàs tenint un mes increïble! Ja portes ${sessionsThisMonth} sessions! Ets imparable! 🔥`
                : sessionsThisMonth >= 4
                ? `Vas per bon camí! ${sessionsThisMonth} sessions aquest mes. Continua amb aquesta energia! ⚡`
                : "Recorda que la constància és clau. Apunta't a més sessions aquest mes! 🎯"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserIndex;

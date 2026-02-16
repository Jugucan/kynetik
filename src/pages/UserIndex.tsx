import { Calendar, TrendingUp, Award, Clock } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card } from "@/components/ui/card";

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
        <Card className="p-8 shadow-neo border-0 text-center">
          <p className="text-muted-foreground">Encara no tens sessions registrades.</p>
          <p className="text-sm text-muted-foreground mt-2">Quan assisteixis a la teva primera classe, les teves estadístiques apareixeran aquí!</p>
        </Card>
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

      {/* Targetes principals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Sessions aquest mes */}
        <Card className="p-6 shadow-neo border-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Sessions aquest mes</p>
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">{sessionsThisMonth}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {now.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })}
          </p>
        </Card>

        {/* Total sessions */}
        <Card className="p-6 shadow-neo border-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Total sessions</p>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">{userSessions.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Des de {new Date(currentUserData.firstSession).toLocaleDateString('ca-ES')}
          </p>
        </Card>

        {/* Última sessió */}
        <Card className="p-6 shadow-neo border-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Última sessió</p>
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            {daysSinceLastSession === 0 ? 'Avui' : `Fa ${daysSinceLastSession}d`}
          </p>
          {lastSession && (
            <p className="text-xs text-muted-foreground mt-1">
              {lastSession.activity} - {new Date(lastSession.date).toLocaleDateString('ca-ES')}
            </p>
          )}
        </Card>
      </div>

      {/* Programes actius */}
      <Card className="p-6 shadow-neo border-0">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-purple-500" />
          <h2 className="text-xl font-semibold">Programes actius</h2>
        </div>
        {activePrograms.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activePrograms.map((program, idx) => (
              <span 
                key={idx} 
                className="px-4 py-2 rounded-full bg-primary/10 text-primary font-medium shadow-neo-sm"
              >
                {program}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No tens sessions recents. Apunta't a una classe!
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Programes dels últims 30 dies
        </p>
      </Card>

      {/* Motivació */}
      <Card className="p-6 shadow-neo border-0 bg-gradient-to-br from-primary/5 to-primary/10">
        <h3 className="font-semibold mb-2">💪 Segueix així!</h3>
        <p className="text-sm text-muted-foreground">
          {sessionsThisMonth >= 8 
            ? "Estàs tenint un mes increïble! Ja portes " + sessionsThisMonth + " sessions!"
            : sessionsThisMonth >= 4
            ? "Vas per bon camí! Continua amb aquesta energia!"
            : "Recorda que la constància és clau. Apunta't a més sessions aquest mes!"}
        </p>
      </Card>
    </div>
  );
};

export default UserIndex;

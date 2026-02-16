import { UserCircle, BarChart3, TrendingUp, Calendar, Award } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card } from "@/components/ui/card";

const UserStats = () => {
  const { userProfile } = useUserProfile();
  const { users, loading } = useUsers();

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 max-w-7xl mx-auto overflow-x-hidden">
        <div className="flex items-center gap-3">
          <UserCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate">Les Meves Estadístiques</h1>
            <p className="text-sm text-muted-foreground">Vista d'usuària</p>
          </div>
        </div>
        <div className="text-center py-8 text-muted-foreground">Carregant estadístiques...</div>
      </div>
    );
  }

  const currentUserData = users.find(u => u.email === userProfile?.email);

  if (!currentUserData) {
    return (
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 max-w-7xl mx-auto overflow-x-hidden">
        <div className="flex items-center gap-3">
          <UserCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate">Les Meves Estadístiques</h1>
            <p className="text-sm text-muted-foreground">Vista d'usuària</p>
          </div>
        </div>
        <div className="p-8 rounded-xl shadow-neo bg-background text-center">
          <p className="text-muted-foreground mb-4">No s'han trobat dades del teu perfil com a usuària.</p>
          <p className="text-sm text-muted-foreground">Assegura't que el teu email ({userProfile?.email}) està registrat a la llista d'usuaris.</p>
        </div>
      </div>
    );
  }

  const userSessions = currentUserData.sessions || [];
  const totalSessions = userSessions.length;
  
  // Sessions recents (últims 30 dies)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSessions = userSessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= thirtyDaysAgo;
  }).length;

  // Programes únics
  const programsSet = new Set(userSessions.map(s => s.activity));
  const uniquePrograms = Array.from(programsSet);

  // Sessions per mes (últims 12 mesos)
  const monthlyData: { month: string; sessions: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' });
    const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    const sessionsCount = userSessions.filter(s => s.date.startsWith(yearMonth)).length;
    monthlyData.push({ month: monthName, sessions: sessionsCount });
  }

  // Mitjana mensual
  const avgMonthly = monthlyData.length > 0 ? (totalSessions / 12).toFixed(1) : '0';

  // Sessions per programa
  const programCount: { [program: string]: number } = {};
  userSessions.forEach(s => {
    programCount[s.activity] = (programCount[s.activity] || 0) + 1;
  });
  const programData = Object.entries(programCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="space-y-6 px-4 max-w-7xl mx-auto overflow-x-hidden pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 min-w-0">
          <UserCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate">Les Meves Estadístiques</h1>
            <p className="text-sm text-muted-foreground">La teva assistència i progressió</p>
          </div>
        </div>

        {/* Targetes principals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 shadow-neo border-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Classes totals</p>
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-foreground">{totalSessions}</p>
          </Card>

          <Card className="p-6 shadow-neo border-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Últims 30 dies</p>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-foreground">{recentSessions}</p>
          </Card>

          <Card className="p-6 shadow-neo border-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Programes diferents</p>
              <Award className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-foreground">{uniquePrograms.length}</p>
          </Card>

          <Card className="p-6 shadow-neo border-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Mitjana mensual</p>
              <Calendar className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-foreground">{avgMonthly}</p>
          </Card>
        </div>

        {/* Gràfica d'evolució - mateixa estètica que instructora */}
        <Card className="p-6 shadow-neo border-0">
          <h3 className="text-lg font-semibold mb-6">Evolució d'assistència</h3>
          <div className="space-y-2">
            {monthlyData.map((item, idx) => {
              const maxSessions = Math.max(...monthlyData.map(d => d.sessions), 1);
              const percentage = (item.sessions / maxSessions) * 100;
              
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium min-w-[100px]">{item.month}</span>
                    <span className="text-muted-foreground">{item.sessions} classes</span>
                  </div>
                  <div className="w-full h-8 bg-primary/10 rounded-lg overflow-hidden relative group">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-3"
                      style={{ width: `${percentage}%` }}
                    >
                      {item.sessions > 0 && (
                        <span className="text-xs font-semibold text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.sessions}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Programes */}
        <Card className="p-6 shadow-neo border-0">
          <h3 className="text-lg font-semibold mb-4">Classes per programa</h3>
          <div className="space-y-3">
            {programData.map((program, idx) => {
              const maxCount = programData[0]?.count || 1;
              const percentage = (program.count / maxCount) * 100;
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{program.name}</span>
                    <span className="text-sm text-muted-foreground">{program.count} classes</span>
                  </div>
                  <div className="w-full h-2 bg-primary/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Informació adicional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 shadow-neo border-0">
            <h3 className="text-lg font-semibold mb-3">Informació general</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Primera classe:</span>
                <span className="text-sm font-medium">
                  {currentUserData.firstSession ? new Date(currentUserData.firstSession).toLocaleDateString('ca-ES') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Última classe:</span>
                <span className="text-sm font-medium">
                  {currentUserData.lastSession ? new Date(currentUserData.lastSession).toLocaleDateString('ca-ES') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Dies des de última:</span>
                <span className="text-sm font-medium">
                  {currentUserData.daysSinceLastSession || 0} dies
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-neo border-0">
            <h3 className="text-lg font-semibold mb-3">Els teus programes</h3>
            <div className="flex flex-wrap gap-2">
              {uniquePrograms.map((program, idx) => (
                <span key={idx} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium shadow-neo-sm">
                  {program}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserStats;

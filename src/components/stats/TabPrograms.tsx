import { useState } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Award, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TabProgramsProps {
  stats: any;
  onUserClick: (user: any) => void;
}

export const TabPrograms = ({ stats, onUserClick }: TabProgramsProps) => {
  const [selectedProgram, setSelectedProgram] = useState<string>("");

  // Obtenir la llista de programes des de topUsersByProgram (que té els noms correctes)
  const availablePrograms = Object.keys(stats.topUsersByProgram).sort();

  // Actualitzar el programa seleccionat quan les dades estiguin disponibles
  if (selectedProgram === "" && availablePrograms.length > 0) {
    setSelectedProgram(availablePrograms[0]);
  }
  const [timeView, setTimeView] = useState<'12months' | 'allMonths' | 'years'>('12months');

  const topUsersForSelectedProgram = stats.topUsersByProgram[selectedProgram] || [];
  
  // DEBUG
  console.log('=== DEBUG TAB PROGRAMS ===');
  console.log('Selected program:', selectedProgram);
  console.log('Available programs in topUsersByProgram:', Object.keys(stats.topUsersByProgram));
  console.log('Available programs in programData:', stats.programData.map((p: any) => p.name));
  console.log('Top users for selected program:', topUsersForSelectedProgram);
  console.log('All topUsersByProgram:', stats.topUsersByProgram);
  console.log('==========================');

  // Seleccionar les dades segons la vista
  const getDataForView = () => {
    switch (timeView) {
      case '12months':
        return {
          data: stats.programAttendancesOverTime12,
          labels: stats.last12MonthsLabels,
          title: 'Últims 12 Mesos'
        };
      case 'allMonths':
        return {
          data: stats.programAttendancesOverTimeAll,
          labels: stats.allMonthsLabels,
          title: 'Tot l\'Historial (per mesos)'
        };
      case 'years':
        return {
          data: stats.programAttendancesByYear,
          labels: stats.allYearsSorted,
          title: 'Tot l\'Historial (per anys)'
        };
    }
  };

  const viewData = getDataForView();

  return (
    <div className="space-y-4">
      {/* Gràfica existent: Classes per Programa */}
      <NeoCard className="p-4 sm:p-6 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-primary flex-shrink-0" />
          <h3 className="text-lg sm:text-xl font-semibold">Classes per Programa</h3>
        </div>
        <Separator className="mb-4" />
        <div className="space-y-3">
          {stats.programData.map((prog: any) => {
            const percentage = (prog.count / stats.totalSessions) * 100;

            return (
              <div key={prog.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm gap-2">
                  <span className="font-medium truncate">{prog.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-muted-foreground text-xs">
                      {percentage.toFixed(1)}%
                    </span>
                    <Badge variant="outline">{prog.count}</Badge>
                  </div>
                </div>
                <div className="h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </NeoCard>

      {/* NOVA: Gràfica d'assistències per programa al llarg del temps */}
      <NeoCard className="p-4 sm:p-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-semibold">Evolució d'Assistències per Programa</h3>
          </div>
          
          <Select value={timeView} onValueChange={(value: any) => setTimeView(value)}>
            <SelectTrigger className="w-full sm:w-56 min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12months">Últims 12 mesos</SelectItem>
              <SelectItem value="allMonths">Tot l'historial (mesos)</SelectItem>
              <SelectItem value="years">Tot l'historial (anys)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Separator className="mb-4" />
        
        <div className="text-sm text-muted-foreground mb-4">
          {viewData.title} - Assistències totals per programa
        </div>

        <ScrollArea className="h-96">
          <div className="space-y-6">
            {viewData.data.map((programData: any) => {
              const maxValue = Math.max(...programData.data, 1);
              const totalAttendances = programData.data.reduce((sum: number, val: number) => sum + val, 0);
              
              return (
                <div key={programData.program} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{programData.program}</h4>
                    <Badge variant="outline" className="bg-primary/10">
                      Total: {totalAttendances}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {viewData.labels.map((label: string, idx: number) => {
                      const value = programData.data[idx];
                      const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

                      if (value === 0 && timeView === 'allMonths') return null;

                      return (
                        <div key={`${programData.program}-${label}`} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground min-w-[80px] flex-shrink-0">
                            {label}
                          </span>
                          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden min-w-0">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <Badge variant="outline" className="text-xs min-w-[35px] justify-center flex-shrink-0">
                            {value}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>

                  <Separator className="mt-4" />
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </NeoCard>

      {/* NOU: Ranking d'usuaris per programa */}
      <NeoCard className="p-4 sm:p-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-semibold">Top Usuaris per Programa</h3>
          </div>
          
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger className="w-full sm:w-64 min-w-0">
              <SelectValue placeholder="Selecciona un programa" />
            </SelectTrigger>
            <SelectContent>
              {availablePrograms.map((programName: string) => (
                <SelectItem key={programName} value={programName}>
                  {programName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Separator className="mb-4" />

        {(() => {
          console.log('Selected program:', selectedProgram);
          console.log('Top users for program:', topUsersForSelectedProgram);
          console.log('All programs available:', stats.topUsersByProgram);
          return null;
        })()}
        
        {topUsersForSelectedProgram.length > 0 ? (
          <div className="space-y-2">
            {topUsersForSelectedProgram.map((user: any, idx: number) => (
              <div
                key={user.id || user.name}
                onClick={() => onUserClick(user)}
                className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 transition-colors gap-2 min-w-0"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
                  <Badge
                    className={`${idx < 3 ? 'bg-yellow-500' : 'bg-muted'} flex-shrink-0 text-[10px] sm:text-xs px-2 py-1`}
                  >
                    #{idx + 1}
                  </Badge>
                  <span className="font-medium text-sm sm:text-base truncate block min-w-0">
                    {user.name}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="flex-shrink-0 whitespace-nowrap text-[10px] sm:text-xs px-2 py-1"
                >
                  <span className="hidden sm:inline">{user.sessionsInProgram} sessions</span>
                  <span className="sm:hidden">{user.sessionsInProgram}</span>
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hi ha dades per aquest programa
          </p>
        )}
      </NeoCard>
    </div>
  );
};

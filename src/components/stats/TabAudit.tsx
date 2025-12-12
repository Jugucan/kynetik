import { NeoCard } from "@/components/NeoCard";
import { AlertTriangle, Calendar, TrendingUp, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface TabAuditProps {
  stats: any;
}

const DAY_NAMES = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

export const TabAudit = ({ stats }: TabAuditProps) => {
  const [expandedPeriod, setExpandedPeriod] = useState<number | null>(null);
  
  const discrepancies = stats.calendarDiscrepancies || [];
  const periods = stats.schedulePeriods || [];
  const outliers = stats.outlierSessions || [];
  const missing = stats.missingSessions || [];

  // Funció per exportar a CSV
  const exportToCSV = () => {
    const csvRows: string[] = [];
    
    // Headers
    csvRows.push('Tipus,Data,Hora,Programa,Centre,Detalls');
    
    // Sessions que falten (pertanyen a períodes)
    missing.filter(m => m.belongsToPeriod).forEach(m => {
      csvRows.push(`Falta al calendari (patró),${m.date},${m.time},${m.program},${m.center},"${m.periodInfo || ''}"`);
    });
    
    // Sessions úniques
    outliers.forEach(o => {
      csvRows.push(`Sessió única,${o.date},${o.time},${o.program},${o.center},"${o.reason}"`);
    });
    
    // Discrepàncies
    discrepancies.forEach((d: any) => {
      csvRows.push(`Discrepància,${d.date},${d.time},${d.calendarProgram} vs ${d.gymProgram},${d.center},"Revisar calendari"`);
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_calendari_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Calcular estadístiques ràpides
  const totalMissing = missing.length;
  const missingInPeriods = missing.filter(m => m.belongsToPeriod).length;
  const totalIssues = discrepancies.length + totalMissing;

  return (
    <div className="space-y-6">
      {/* Resum d'estat */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NeoCard className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-900">{periods.length}</p>
              <p className="text-sm text-blue-600">Períodes detectats</p>
            </div>
          </div>
        </NeoCard>

        <NeoCard className="p-4 bg-gradient-to-br from-orange-50 to-red-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-orange-900">{totalIssues}</p>
              <p className="text-sm text-orange-600">Sessions a revisar</p>
            </div>
          </div>
        </NeoCard>

        <NeoCard className="p-4 bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-purple-900">{outliers.length}</p>
              <p className="text-sm text-purple-600">Sessions úniques</p>
            </div>
          </div>
        </NeoCard>
      </div>

      {/* Botó d'exportació */}
      {totalIssues > 0 && (
        <div className="flex justify-end">
          <Button 
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar Auditoria (CSV)
          </Button>
        </div>
      )}

      {/* SECCIÓ 1: Patrons d'horari detectats */}
      <NeoCard className="p-4 sm:p-6 min-w-0 bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-green-600 flex-shrink-0" />
          <h3 className="text-lg sm:text-xl font-semibold">Patrons d'Horari Detectats</h3>
        </div>
        <Separator className="mb-4" />
        
        <p className="text-sm text-muted-foreground mb-4">
          Aquests són els períodes amb horari regular detectats a partir de les assistències reals dels gimnasos.
        </p>

        {periods.length > 0 ? (
          <div className="space-y-3">
            {periods.map((period: any, idx: number) => {
              const isExpanded = expandedPeriod === idx;
              const hasSchedule = Object.keys(period.weeklySchedule).length > 0;
              
              return (
                <div key={idx} className="p-4 bg-white rounded-lg border-2 border-green-200">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedPeriod(isExpanded ? null : idx)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-green-100">
                          Període {idx + 1}
                        </Badge>
                        <span className="text-sm font-medium">
                          {period.startDate} - {period.endDate}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {period.totalSessions} sessions en aquest període
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      {isExpanded ? '▲' : '▼'}
                    </Button>
                  </div>

                  {isExpanded && hasSchedule && (
                    <div className="mt-4 space-y-2">
                      <Separator className="mb-3" />
                      <p className="text-sm font-semibold mb-2">Horari setmanal detectat:</p>
                      
                      {[1, 2, 3, 4, 5, 6, 0].map(dayNum => {
                        const sessions = period.weeklySchedule[dayNum] || [];
                        if (sessions.length === 0) return null;
                        
                        return (
                          <div key={dayNum} className="pl-4 py-2 border-l-2 border-green-300">
                            <p className="font-medium text-sm mb-1">{DAY_NAMES[dayNum]}</p>
                            <div className="space-y-1">
                              {sessions
                                .sort((a: any, b: any) => a.time.localeCompare(b.time))
                                .map((session: any, sIdx: number) => (
                                  <div key={sIdx} className="flex items-center gap-2 text-xs">
                                    <Badge variant="secondary" className="font-mono text-xs">
                                      {session.time}
                                    </Badge>
                                    <span className="font-semibold">{session.program}</span>
                                    <span className="text-muted-foreground">({session.center})</span>
                                    <span className="text-muted-foreground ml-auto">
                                      {session.count}x
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No s'han detectat períodes d'horari regular
          </div>
        )}
      </NeoCard>

      {/* SECCIÓ 2: Sessions que falten al calendari */}
      {missing.length > 0 && (
        <NeoCard className="p-4 sm:p-6 min-w-0 bg-gradient-to-br from-red-50 to-rose-50">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-semibold">Sessions que Falten al Calendari</h3>
          </div>
          <Separator className="mb-4" />
          
          <p className="text-sm text-muted-foreground mb-4">
            Aquestes sessions han tingut assistències reals però no estan al teu calendari. 
            {missingInPeriods > 0 && ` ${missingInPeriods} pertanyen a patrons regulars.`}
          </p>

          <Badge variant="outline" className="bg-red-100 mb-4">
            {missing.length} sessions faltants
          </Badge>

          <ScrollArea className="h-96">
            <div className="space-y-3">
              {/* Primer: Sessions que pertanyen a períodes */}
              {missing.filter(m => m.belongsToPeriod).length > 0 && (
                <>
                  <p className="text-sm font-semibold text-red-700 mb-2">
                    ⚠️ Falten en patrons regulars:
                  </p>
                  {missing.filter(m => m.belongsToPeriod).map((sess: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border-2 border-red-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{sess.date}</span>
                        <Badge variant="outline">{sess.center}</Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="font-mono">
                          {sess.time}
                        </Badge>
                        <span className="font-bold text-red-700">{sess.program}</span>
                      </div>

                      {sess.periodInfo && (
                        <p className="text-xs text-muted-foreground">
                          📅 {sess.periodInfo}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {sess.attendances} assistències registrades
                      </p>
                    </div>
                  ))}
                </>
              )}

              {/* Després: Sessions úniques que també falten */}
              {missing.filter(m => !m.belongsToPeriod).length > 0 && (
                <>
                  <Separator className="my-4" />
                  <p className="text-sm font-semibold text-red-700 mb-2">
                    Sessions úniques que també falten:
                  </p>
                  {missing.filter(m => !m.belongsToPeriod).map((sess: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border border-red-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{sess.date}</span>
                        <Badge variant="outline">{sess.center}</Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {sess.time}
                        </Badge>
                        <span className="font-bold">{sess.program}</span>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {sess.attendances} assistències
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </NeoCard>
      )}

      {/* SECCIÓ 3: Sessions úniques (outliers) */}
      {outliers.length > 0 && (
        <NeoCard className="p-4 sm:p-6 min-w-0 bg-gradient-to-br from-purple-50 to-violet-50">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-semibold">Sessions Úniques / Substitucions</h3>
          </div>
          <Separator className="mb-4" />
          
          <p className="text-sm text-muted-foreground mb-4">
            Sessions que no encaixen en cap patró regular. Poden ser substitucions, activitats especials o sessions esporàdiques.
          </p>

          <Badge variant="outline" className="bg-purple-100 mb-4">
            {outliers.length} sessions úniques
          </Badge>

          <ScrollArea className="h-96">
            <div className="space-y-2">
              {outliers.map((outlier: any, idx: number) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{outlier.date}</span>
                    <Badge variant="outline">{outlier.center}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="font-mono">
                      {outlier.time}
                    </Badge>
                    <span className="font-bold">{outlier.program}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-600 italic">{outlier.reason}</span>
                    <span className="text-muted-foreground">{outlier.attendances} assist.</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </NeoCard>
      )}

      {/* SECCIÓ 4: Discrepàncies calendari vs gimnàs (ja existent) */}
      <NeoCard className="p-4 sm:p-6 min-w-0 bg-gradient-to-br from-yellow-50 to-orange-50">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <h3 className="text-lg sm:text-xl font-semibold">Discrepàncies: Calendari vs Gimnàs</h3>
        </div>
        <Separator className="mb-4" />
        
        <p className="text-sm text-muted-foreground mb-4">
          Aquestes sessions tenen un programa diferent al teu calendari comparat amb el que diu el gimnàs. 
          Revisa el teu calendari per assegurar-te que els horaris són correctes.
        </p>

        {discrepancies.length > 0 ? (
          <>
            <Badge variant="outline" className="bg-orange-100 mb-4">
              {discrepancies.length} discrepàncies trobades
            </Badge>

            <ScrollArea className="h-96">
              <div className="space-y-3">
                {discrepancies.map((disc: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-orange-200">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{disc.date}</span>
                        <Badge variant="outline">{disc.center}</Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Hora: {disc.time.replace(/\s+/g, ' ').replace(/\n/g, '')}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="p-2 bg-red-50 rounded border border-red-200">
                          <p className="text-xs text-red-600 font-medium">Gimnàs diu:</p>
                          <p className="text-sm font-bold text-red-700">{disc.gymProgram}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs text-blue-600 font-medium">El teu calendari:</p>
                          <p className="text-sm font-bold text-blue-700">{disc.calendarProgram}</p>
                        </div>
                      </div>

                      {disc.count > 1 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Afecta {disc.count} assistències
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
            <p className="text-green-600 font-medium">✅ No hi ha discrepàncies!</p>
            <p className="text-sm text-muted-foreground mt-2">
              El teu calendari coincideix perfectament amb les dades del gimnàs.
            </p>
          </div>
        )}
      </NeoCard>

      {/* Missatge final positiu si tot està bé */}
      {totalIssues === 0 && periods.length > 0 && (
        <NeoCard className="p-6 bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300">
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-green-800 mb-2">
              Perfecte! El teu calendari està complet 🎉
            </h3>
            <p className="text-sm text-green-700">
              S'han detectat {periods.length} períodes d'horari i no hi ha cap sessió pendent de revisar.
            </p>
          </div>
        </NeoCard>
      )}
    </div>
  );
};

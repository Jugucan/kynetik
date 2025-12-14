import { NeoCard } from "@/components/NeoCard";
import { AlertTriangle, Upload, Calendar, TrendingUp, CheckCircle2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface TabAuditProps {
  stats: any;
}

interface ScheduleData {
  exportDate: string;
  totalSessions: number;
  dateRange: {
    start: string;
    end: string;
  };
  analysis?: {
    seasons?: Array<{
      startDate: string;
      endDate: string;
      classes: Array<{
        dayOfWeek: string;
        startTime: string;
        endTime?: string;
        activity: string;
        center: string;
        totalOccurrences: number;
      }>;
    }>;
    recurring?: Array<{
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      activity: string;
      center: string;
      firstDate: string;
      lastDate: string;
      totalOccurrences: number;
    }>;
    sporadic?: Array<{
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      activity: string;
      center: string;
      firstDate: string;
      lastDate: string;
      totalOccurrences: number;
    }>;
  };
}

const DAY_NAMES_MAP: Record<string, string> = {
  'dilluns': 'Dilluns',
  'dimarts': 'Dimarts',
  'dimecres': 'Dimecres',
  'dijous': 'Dijous',
  'divendres': 'Divendres',
  'dissabte': 'Dissabte',
  'diumenge': 'Diumenge'
};

const DAY_ORDER = ['dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte', 'diumenge'];

export const TabAudit = ({ stats }: TabAuditProps) => {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const discrepancies = stats.calendarDiscrepancies || [];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setScheduleData(json);
      } catch (err) {
        setError('Error llegint el fitxer JSON. Verifica que el format sigui correcte.');
        console.error('Error parsing JSON:', err);
      }
    };
    reader.onerror = () => {
      setError('Error carregant el fitxer.');
    };
    reader.readAsText(file);
  };

  const clearData = () => {
    setScheduleData(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Càrrega de fitxer JSON */}
      <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <h3 className="text-lg sm:text-xl font-semibold">Horaris Extrets del Gimnàs</h3>
        </div>
        <Separator className="mb-4" />
        
        <p className="text-sm text-muted-foreground mb-4">
          Puja el fitxer JSON amb els horaris extrets del gimnàs per visualitzar les temporades i sessions.
        </p>

        {!scheduleData ? (
          <div className="flex flex-col items-center gap-4">
            <label htmlFor="json-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Upload className="w-4 h-4" />
                <span>Seleccionar fitxer JSON</span>
              </div>
              <input
                id="json-upload"
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
              <div>
                <p className="font-semibold text-sm">Fitxer carregat correctament ✅</p>
                <p className="text-xs text-muted-foreground">
                  {scheduleData.totalSessions} sessions del {scheduleData.dateRange.start} al {scheduleData.dateRange.end}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={clearData}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {scheduleData.analysis?.seasons && (
              <div className="text-sm text-muted-foreground">
                📅 {scheduleData.analysis.seasons.length} temporades detectades
              </div>
            )}
          </div>
        )}
      </NeoCard>

      {/* SECCIÓ 1: Temporades (Seasons) */}
      {scheduleData?.analysis?.seasons && scheduleData.analysis.seasons.length > 0 && (
        <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-green-600 flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-semibold">Temporades d'Horari</h3>
          </div>
          <Separator className="mb-4" />
          
          <p className="text-sm text-muted-foreground mb-4">
            Períodes detectats amb l'horari setmanal de cada etapa.
          </p>

          <div className="space-y-3">
            {scheduleData.analysis.seasons.map((season, idx) => {
              const isExpanded = expandedSeason === idx;
              
              // Agrupar classes per dia de la setmana
              const classesByDay = season.classes.reduce((acc, cls) => {
                const day = cls.dayOfWeek.toLowerCase();
                if (!acc[day]) acc[day] = [];
                acc[day].push(cls);
                return acc;
              }, {} as Record<string, typeof season.classes>);

              return (
                <div key={idx} className="p-4 bg-white rounded-lg border-2 border-green-200">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedSeason(isExpanded ? null : idx)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-green-100">
                          Temporada {idx + 1}
                        </Badge>
                        <span className="text-sm font-medium">
                          {season.startDate} - {season.endDate}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {season.classes.length} classes diferents
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      {isExpanded ? '▲' : '▼'}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-2">
                      <Separator className="mb-3" />
                      <p className="text-sm font-semibold mb-2">Horari setmanal:</p>
                      
                      {DAY_ORDER.map(dayKey => {
                        const classes = classesByDay[dayKey];
                        if (!classes || classes.length === 0) return null;
                        
                        return (
                          <div key={dayKey} className="pl-4 py-2 border-l-2 border-green-300">
                            <p className="font-medium text-sm mb-1">{DAY_NAMES_MAP[dayKey]}</p>
                            <div className="space-y-1">
                              {classes
                                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                .map((cls, cIdx) => (
                                  <div key={cIdx} className="flex items-center gap-2 text-xs">
                                    <Badge variant="secondary" className="font-mono text-xs">
                                      {cls.startTime}
                                      {cls.endTime && ` - ${cls.endTime}`}
                                    </Badge>
                                    <span className="font-semibold">{cls.activity}</span>
                                    <span className="text-muted-foreground">({cls.center})</span>
                                    <span className="text-muted-foreground ml-auto">
                                      {cls.totalOccurrences}x
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
        </NeoCard>
      )}

      {/* SECCIÓ 2: Classes Recurrents */}
      {scheduleData?.analysis?.recurring && scheduleData.analysis.recurring.length > 0 && (
        <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-cyan-50">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-semibold">Classes Recurrents</h3>
          </div>
          <Separator className="mb-4" />
          
          <p className="text-sm text-muted-foreground mb-4">
            Classes amb horari fix que es repeteixen regularment.
          </p>

          <Badge variant="outline" className="bg-blue-100 mb-4">
            {scheduleData.analysis.recurring.length} classes recurrents
          </Badge>

          <ScrollArea className="h-96">
            <div className="space-y-2">
              {scheduleData.analysis.recurring.map((cls, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{DAY_NAMES_MAP[cls.dayOfWeek.toLowerCase()]}</span>
                    <Badge variant="outline">{cls.center}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="font-mono">
                      {cls.startTime} - {cls.endTime}
                    </Badge>
                    <span className="font-bold text-blue-700">{cls.activity}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{cls.firstDate} → {cls.lastDate}</span>
                    <span>{cls.totalOccurrences} sessions</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </NeoCard>
      )}

      {/* SECCIÓ 3: Classes Puntuals */}
      {scheduleData?.analysis?.sporadic && scheduleData.analysis.sporadic.length > 0 && (
        <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-violet-50">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-semibold">Classes Puntuals / Substitucions</h3>
          </div>
          <Separator className="mb-4" />
          
          <p className="text-sm text-muted-foreground mb-4">
            Sessions puntuals, Cross Training, substitucions i activitats temporals.
          </p>

          <Badge variant="outline" className="bg-purple-100 mb-4">
            {scheduleData.analysis.sporadic.length} sessions puntuals
          </Badge>

          <ScrollArea className="h-96">
            <div className="space-y-2">
              {scheduleData.analysis.sporadic.map((cls, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{DAY_NAMES_MAP[cls.dayOfWeek.toLowerCase()]}</span>
                    <Badge variant="outline">{cls.center}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="font-mono">
                      {cls.startTime} - {cls.endTime}
                    </Badge>
                    <span className="font-bold">{cls.activity}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{cls.firstDate} → {cls.lastDate}</span>
                    <span className="text-purple-600 italic">{cls.totalOccurrences} vegades</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </NeoCard>
      )}

      {/* SECCIÓ 4: Discrepàncies calendari vs gimnàs (JA EXISTENT) */}
      <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-yellow-50 to-orange-50">
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
    </div>
  );
};

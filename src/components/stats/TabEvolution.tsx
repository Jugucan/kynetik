import { useState } from "react";
import { NeoCard } from "@/components/NeoCard";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfoButton } from "./InfoButton";

interface TabEvolutionProps {
  stats: any;
}

export const TabEvolution = ({ stats }: TabEvolutionProps) => {
  const [attendanceView, setAttendanceView] = useState<'year' | 'monthlyAverage'>('year');

  return (
    <div className="space-y-4">
      <NeoCard className="p-4 sm:p-6 min-w-0">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-lg sm:text-xl font-semibold">Tendència General</h3>
          {stats.trend === 'up' && (
            <Badge className="bg-green-500">
              <TrendingUp className="w-4 h-4 mr-1" />
              Creixement
            </Badge>
          )}
          {stats.trend === 'down' && (
            <Badge className="bg-red-500">
              <TrendingDown className="w-4 h-4 mr-1" />
              Decreixement
            </Badge>
          )}
          {stats.trend === 'stable' && (
            <Badge variant="outline">Estable</Badge>
          )}
        </div>
        <Separator className="mb-4" />

        <div className="space-y-3">
          <h4 className="font-medium text-sm sm:text-base">Classes Realitzades per Any</h4>
          {stats.yearlyData.map((yearData: any) => {
            const maxCount = Math.max(...stats.yearlyData.map((y: any) => y.count));
            const percentage = (yearData.count / maxCount) * 100;

            return (
              <div key={yearData.year} className="space-y-2">
                <div className="flex items-center justify-between text-sm gap-2">
                  <span className="font-medium">{yearData.year}</span>
                  <Badge variant="outline">{yearData.count} classes</Badge>
                </div>
                <div className="h-8 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all flex items-center justify-end pr-2"
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage > 20 && (
                      <span className="text-xs text-white font-medium">
                        {yearData.count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </NeoCard>

      <NeoCard className="p-4 sm:p-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <h3 className="text-lg sm:text-xl font-semibold">
            {attendanceView === 'year' ? 'Total Assistències per Any' : 'Mitjana Mensual d\'Assistències'}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-muted/40 rounded-full p-1 flex items-center gap-1">
              <button
                onClick={() => setAttendanceView('year')}
                className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition ${attendanceView === 'year' ? 'bg-white shadow' : 'bg-transparent'}`}
              >
                Per any
              </button>
              <button
                onClick={() => setAttendanceView('monthlyAverage')}
                className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition ${attendanceView === 'monthlyAverage' ? 'bg-white shadow' : 'bg-transparent'}`}
              >
                Mitjana mensual
              </button>
            </div>
            <InfoButton
              title="Visió assistències"
              description="Canvia entre la vista per anys (totals) i la vista de la mitjana mensual per veure patrons estacionals al llarg dels mesos."
            />
          </div>
        </div>
        <Separator className="mb-4" />
        <div className="space-y-3">
          {attendanceView === 'year' ? (
            stats.yearlyAttendanceData.map((yearData: any) => {
              const maxCount = Math.max(...stats.yearlyAttendanceData.map((y: any) => y.count));
              const percentage = (yearData.count / maxCount) * 100;

              return (
                <div key={yearData.year} className="space-y-2">
                  <div className="flex items-center justify-between text-sm gap-2">
                    <span className="font-medium">{yearData.year}</span>
                    <Badge variant="outline" className="bg-blue-50">{yearData.count} assistències</Badge>
                  </div>
                  <div className="h-8 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all flex items-center justify-end pr-2"
                      style={{ width: `${percentage}%` }}
                    >
                      {percentage > 20 && (
                        <span className="text-xs text-white font-medium">
                          {yearData.count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="space-y-2">
              {stats.monthlyAverages.map((m: any) => {
                const maxAvg = Math.max(...stats.monthlyAverages.map((mm: any) => mm.avg));
                const pct = maxAvg > 0 ? (m.avg / maxAvg) * 100 : 0;
                return (
                  <div key={m.month} className="space-y-2">
                    <div className="flex items-center justify-between text-sm gap-2">
                      <span className="font-medium">{m.month}</span>
                      <Badge variant="outline" className="bg-blue-50">{m.avg}</Badge>
                    </div>
                    <div className="h-8 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all flex items-center justify-end pr-2"
                        style={{ width: `${pct}%` }}
                      >
                        {pct > 20 && (
                          <span className="text-xs text-white font-medium">
                            {m.avg}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </NeoCard>

      <NeoCard className="p-4 sm:p-6 min-w-0">
        <h3 className="text-lg sm:text-xl font-semibold mb-4">Últims 12 Mesos</h3>
        <Separator className="mb-4" />
        <ScrollArea className="h-80">
          <div className="space-y-4">
            {stats.monthlyData.map((month: any) => {
              const maxClasses = Math.max(...stats.monthlyData.map((m: any) => m.classes));
              const maxAttendances = Math.max(...stats.monthlyData.map((m: any) => m.attendances));
              const classesPercentage = maxClasses > 0 ? (month.classes / maxClasses) * 100 : 0;
              const attendancesPercentage = maxAttendances > 0 ? (month.attendances / maxAttendances) * 100 : 0;

              return (
                <div key={month.month} className="space-y-2">
                  <span className="text-xs sm:text-sm font-medium block">{month.month}</span>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xs text-muted-foreground min-w-[56px] sm:min-w-[90px] flex-shrink-0">Classes:</span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden min-w-0">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${classesPercentage}%` }}
                      />
                    </div>
                    <Badge variant="outline" className="text-xs min-w-[38px] justify-center flex-shrink-0">{month.classes}</Badge>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xs text-muted-foreground min-w-[56px] sm:min-w-[90px] flex-shrink-0">Assistències:</span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden min-w-0">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${attendancesPercentage}%` }}
                      />
                    </div>
                    <Badge variant="outline" className="text-xs bg-blue-50 min-w-[38px] justify-center flex-shrink-0">{month.attendances}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="flex gap-4 text-xs text-muted-foreground border-t pt-3 mt-3 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500 flex-shrink-0"></div>
            <span>Classes fetes</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500 flex-shrink-0"></div>
            <span>Total assistències</span>
          </div>
        </div>
      </NeoCard>
    </div>
  );
};

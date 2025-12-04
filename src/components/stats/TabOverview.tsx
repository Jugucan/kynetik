import { NeoCard } from "@/components/NeoCard";
import { Users, TrendingUp, Calendar, Percent, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { InfoButton } from "./InfoButton";

interface TabOverviewProps {
  stats: any;
}

export const TabOverview = ({ stats }: TabOverviewProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 w-full">
        <NeoCard className="p-3 sm:p-6 bg-gradient-to-br from-pink-50 to-pink-100 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-pink-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-pink-700 truncate">{stats.totalAttendances}</p>
                <p className="text-xs sm:text-sm text-pink-600">Total assistències</p>
              </div>
            </div>
            <InfoButton
              title="Total assistències"
              description="Nombre total de vegades que els usuaris han assistit a les teves classes. Un mateix usuari pot comptar múltiples vegades."
            />
          </div>
        </NeoCard>

        <NeoCard className="p-3 sm:p-6 bg-gradient-to-br from-indigo-50 to-indigo-100">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-indigo-700 truncate">{stats.avgAttendancesPerYear}</p>
                <p className="text-xs sm:text-sm text-indigo-600">Mitjana assist./any</p>
              </div>
            </div>
            <InfoButton
              title="Mitjana d'assistències per any"
              description="Mitjana d'assistències que reps cada any. Es calcula dividint el total d'assistències entre el nombre d'anys amb dades."
            />
          </div>
        </NeoCard>

        <NeoCard className="p-3 sm:p-6 bg-gradient-to-br from-teal-50 to-teal-100">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-teal-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-teal-700 truncate">{stats.mostPopularDay?.[0] || 'N/A'}</p>
                <p className="text-xs sm:text-sm text-teal-600">Dia més actiu</p>
              </div>
            </div>
            <InfoButton
              title="Dia més actiu"
              description={`El dia de la setmana en què fas més classes.\n\n${stats.mostPopularDay ? `Total de classes els ${stats.mostPopularDay[0]}: ${stats.mostPopularDay[1]}` : 'Sense dades'}`}
            />
          </div>
        </NeoCard>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 w-full">
        <NeoCard className="p-3 min-w-0">
          <div className="flex items-center justify-between mb-1 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Percent className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-muted-foreground truncate">Taxa de retenció</p>
            </div>
            <InfoButton
              title="Taxa de retenció"
              description={`Percentatge d'usuaris que han vingut més d'una vegada a les teves classes. Indica la fidelitat dels teus alumnes.\n\n📊 ${stats.recurrentUsers} de ${stats.totalUsers} usuaris han repetit.`}
            />
          </div>
          <p className="text-xl sm:text-2xl font-bold">{stats.retentionRate}%</p>
        </NeoCard>

        <NeoCard className="p-3 min-w-0">
          <div className="flex items-center justify-between mb-1 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-xs text-muted-foreground truncate">Creixement mensual</p>
            </div>
            <InfoButton
              title="Creixement mensual"
              description="Comparació del nombre de classes entre el mes actual i l'anterior. Un valor positiu indica que has fet més classes aquest mes que l'anterior."
            />
          </div>
          <p className="text-xl sm:text-2xl font-bold">{stats.monthlyGrowth}%</p>
        </NeoCard>

        <NeoCard className="p-3 min-w-0">
          <div className="flex items-center justify-between mb-1 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <p className="text-xs text-muted-foreground truncate">Franja preferida</p>
            </div>
            <InfoButton
              title="Franja horària preferida"
              description="La franja horària on fas més classes:\n• Matí: abans de les 12h\n• Tarda: de 12h a 18h\n• Vespre: després de les 18h"
            />
          </div>
          <p className="text-base sm:text-lg font-bold">{stats.preferredTimeSlot}</p>
        </NeoCard>
      </div>
    </div>
  );
};

import { NeoCard } from "@/components/NeoCard";
import { Users, Calendar, Target, UserCheck } from "lucide-react";
import { InfoButton } from "./InfoButton";

interface StatsCardsProps {
  totalUsers: number;
  totalSessions: number;
  avgAttendees: string;
  activeUsers: number;
}

export const StatsCards = ({ totalUsers, totalSessions, avgAttendees, activeUsers }: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
      <NeoCard className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 min-w-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-1">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <InfoButton
              title="Usuaris únics"
              description="Total de persones diferents que han vingut a les teves classes des del començament."
            />
          </div>
          <div>
            <p className="text-xl sm:text-3xl font-bold text-blue-700">{totalUsers}</p>
            <p className="text-xs sm:text-sm text-blue-600">Usuaris únics</p>
          </div>
        </div>
      </NeoCard>

      <NeoCard className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 min-w-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-1">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
            <InfoButton
              title="Classes fetes"
              description="Total de classes que has impartit segons el teu calendari. No inclou dies festius, vacances, tancaments dels gimnasos ni sessions eliminades."
            />
          </div>
          <div>
            <p className="text-xl sm:text-3xl font-bold text-green-700">{totalSessions}</p>
            <p className="text-xs sm:text-sm text-green-600">Classes fetes</p>
          </div>
        </div>
      </NeoCard>

      <NeoCard className="p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100 min-w-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-1">
            <Target className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
            <InfoButton
              title="Assistents per classe"
              description="Mitjana de persones que assisteixen a cada una de les teves classes. Es calcula dividint el total d'assistències entre el total de classes."
            />
          </div>
          <div>
            <p className="text-xl sm:text-3xl font-bold text-purple-700">{avgAttendees}</p>
            <p className="text-[10px] sm:text-sm text-purple-600 leading-tight break-words">Assistents/classe</p>
          </div>
        </div>
      </NeoCard>

      <NeoCard className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100 min-w-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-1">
            <UserCheck className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 flex-shrink-0" />
            <InfoButton
              title="Usuaris actius"
              description="Nombre d'usuaris que han assistit almenys una vegada a les teves classes en els últims 30 dies."
            />
          </div>
          <div>
            <p className="text-xl sm:text-3xl font-bold text-orange-700">{activeUsers}</p>
            <p className="text-xs sm:text-sm text-orange-600">Actius (30d)</p>
          </div>
        </div>
      </NeoCard>
    </div>
  );
};

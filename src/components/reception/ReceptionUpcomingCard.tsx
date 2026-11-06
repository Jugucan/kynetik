// src/components/reception/ReceptionUpcomingCard.tsx
// Vista prèvia dels propers 14 dies de recepció, ja tenint en compte canvis, vacances, festius i tancaments.

import { useMemo } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Badge } from "@/components/ui/badge";
import { getReceptionStatusForDate, formatMinutes } from "@/utils/receptionHelpers";
import type { SettingsData } from "@/contexts/AppDataContext";
import type { ReceptionScheduleData, ReceptionOffReason } from "@/types/reception";

interface ReceptionUpcomingCardProps {
  data: ReceptionScheduleData;
  settings: SettingsData;
  centerId: string;
  days?: number;
}

const OFF_LABELS: Record<ReceptionOffReason, string> = {
  absent: "No hi vaig",
  vacation: "Vacances",
  holiday: "Festiu",
  closure: "Centre tancat",
  "no-shift": "Sense torn",
  "no-template": "Sense horari de recepció",
};

export const ReceptionUpcomingCard = ({ data, settings, centerId, days = 14 }: ReceptionUpcomingCardProps) => {
  const rows = useMemo(() => {
    const result: { date: Date; status: ReturnType<typeof getReceptionStatusForDate> }[] = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    for (let i = 0; i < days; i++) {
      result.push({ date: new Date(cursor), status: getReceptionStatusForDate(cursor, data, settings, centerId) });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [data, settings, centerId, days]);

  return (
    <NeoCard className="p-4 sm:p-6 min-w-0">
      <h2 className="text-xl font-semibold mb-1">Propers {days} dies</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Així et quedarà la recepció, tenint en compte canvis, vacances, festius i tancaments d'Arbúcies.
      </p>
      <div className="space-y-1">
        {rows.map(({ date, status }) => (
          <div key={date.toISOString()} className="flex items-center justify-between gap-2 border-b py-2 min-w-0">
            <span className="text-sm capitalize flex-shrink-0">
              {date.toLocaleDateString("ca-ES", { weekday: "short", day: "numeric", month: "short" })}
            </span>
            {status.kind === "shift" ? (
              <div className="flex items-center gap-2 justify-end flex-wrap">
                <span className="text-sm font-medium">
                  {status.start} – {status.end}
                </span>
                <span className="text-xs text-muted-foreground">({formatMinutes(status.minutes)})</span>
                {status.source === "override" && (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    Canvi
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                {OFF_LABELS[status.reason]}
                {status.note ? ` · ${status.note}` : ""}
              </span>
            )}
          </div>
        ))}
      </div>
    </NeoCard>
  );
};

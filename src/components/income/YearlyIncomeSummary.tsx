// src/components/income/YearlyIncomeSummary.tsx
// Resum anual d'ingressos i hores per centre, a l'estil del teu Excel de seguiment.
// No fa cap lectura nova a Firebase: tot es calcula en memòria a partir de dades ja carregades.

import { useState, useMemo, Fragment } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Clock, Wallet, TrendingUp, Coins } from "lucide-react";
import type { Schedule, SettingsData, Center } from "@/contexts/AppDataContext";
import type { EffectiveSession } from "@/utils/sessionHelpers";
import type { PayrollEntry } from "@/types/income";
import { getPeriodsForYear, countEffectiveSessionsInPeriod } from "@/utils/incomeHelpers";

interface YearlyIncomeSummaryProps {
  schedules: Schedule[];
  settings: SettingsData;
  customSessions: Record<string, EffectiveSession[]>;
  activeCenters: Center[];
  getCenterByLegacyId: (legacyId: "Arbucies" | "SantHilari") => Center | undefined;
  payrolls: PayrollEntry[];
}

const formatEuro = (value: number) =>
  new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(value);

const formatEuroHora = (value: number) =>
  isFinite(value) && value > 0 ? `${value.toFixed(2)} €/h` : "-";

// Mateixa paleta que fas servir a Configuració → Centres
const CENTER_COLOR_CLASS: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  pink: "bg-pink-500",
  yellow: "bg-yellow-500",
  indigo: "bg-indigo-500",
};

export const YearlyIncomeSummary = ({
  schedules,
  settings,
  customSessions,
  activeCenters,
  getCenterByLegacyId,
  payrolls,
}: YearlyIncomeSummaryProps) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const yearPeriods = useMemo(() => getPeriodsForYear(selectedYear), [selectedYear]);

  const monthlyBreakdown = useMemo(() => {
    return yearPeriods.map((period) => {
      const hoursByCenter = countEffectiveSessionsInPeriod(
        schedules,
        settings,
        customSessions,
        period.start,
        period.end,
        getCenterByLegacyId
      );

      const byCenter: Record<string, { hores: number; pagat: number; euroHora: number }> = {};
      let totalHores = 0;
      let totalPagat = 0;

      activeCenters.forEach((center) => {
        const hores = hoursByCenter[center.id] || 0;
        const pagat = payrolls
          .filter((p) => p.periodStart === period.start && p.centerId === center.id)
          .reduce((sum, e) => sum + e.amount, 0);
        const euroHora = hores > 0 ? pagat / hores : 0;
        byCenter[center.id] = { hores, pagat, euroHora };
        totalHores += hores;
        totalPagat += pagat;
      });

      const totalEuroHora = totalHores > 0 ? totalPagat / totalHores : 0;

      return { period, byCenter, totalHores, totalPagat, totalEuroHora };
    });
  }, [yearPeriods, schedules, settings, customSessions, activeCenters, getCenterByLegacyId, payrolls]);

  const yearTotals = useMemo(() => {
    // Només comptem els mesos amb almenys una nòmina introduïda,
    // per no falsejar les mitjanes amb mesos futurs que encara no s'han cobrat.
    const monthsWithData = monthlyBreakdown.filter((m) => m.totalPagat > 0);
    const totalHores = monthsWithData.reduce((sum, m) => sum + m.totalHores, 0);
    const totalPagat = monthsWithData.reduce((sum, m) => sum + m.totalPagat, 0);
    const mitjanaMensual = monthsWithData.length > 0 ? totalPagat / monthsWithData.length : 0;
    const euroHoraMitjana = totalHores > 0 ? totalPagat / totalHores : 0;
    return { totalHores, totalPagat, mitjanaMensual, euroHoraMitjana };
  }, [monthlyBreakdown]);

  return (
    <div className="space-y-4">
      <NeoCard className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedYear((y) => y - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <p className="font-bold text-xl">{selectedYear}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedYear((y) => y + 1)}
            disabled={selectedYear >= new Date().getFullYear()}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </NeoCard>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <NeoCard className="p-3 sm:p-4 bg-gradient-to-br from-teal-50 to-teal-100 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <p className="text-xs text-teal-700 truncate">Total hores</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-teal-800">{yearTotals.totalHores}</p>
        </NeoCard>
        <NeoCard className="p-3 sm:p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <p className="text-xs text-indigo-700 truncate">Total cobrat</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-indigo-800">{formatEuro(yearTotals.totalPagat)}</p>
        </NeoCard>
        <NeoCard className="p-3 sm:p-4 bg-gradient-to-br from-pink-50 to-pink-100 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-pink-600 flex-shrink-0" />
            <p className="text-xs text-pink-700 truncate">Mitjana mensual</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-pink-800">{formatEuro(yearTotals.mitjanaMensual)}</p>
        </NeoCard>
        <NeoCard className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <p className="text-xs text-orange-700 truncate">€/h mitjana</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-orange-800">
            {formatEuroHora(yearTotals.euroHoraMitjana)}
          </p>
        </NeoCard>
      </div>

      <div>
        <h3 className="text-lg sm:text-xl font-semibold mb-4 px-1">Detall mensual {selectedYear}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {monthlyBreakdown.map((row) => {
            const hasData = row.totalPagat > 0;
            return (
              <NeoCard
                key={row.period.start}
                className={`p-4 min-w-0 ${!hasData ? "opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-base">{row.period.monthLabel}</h4>
                  {hasData ? (
                    <Badge className="bg-indigo-500 hover:bg-indigo-500 text-white">
                      {formatEuro(row.totalPagat)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Sense dades
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {activeCenters.map((center) => {
                    const data = row.byCenter[center.id];
                    const pct = row.totalPagat > 0 ? (data.pagat / row.totalPagat) * 100 : 0;
                    return (
                      <div key={center.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                CENTER_COLOR_CLASS[center.color] || "bg-indigo-500"
                              }`}
                            />
                            <span className="font-medium truncate">{center.name}</span>
                          </div>
                          <span className="text-muted-foreground flex-shrink-0">
                            {data.hores}h · {formatEuroHora(data.euroHora)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                CENTER_COLOR_CLASS[center.color] || "bg-indigo-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-16 text-right flex-shrink-0">
                            {formatEuro(data.pagat)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator className="my-3" />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{row.totalHores} h totals</span>
                  <span>{formatEuroHora(row.totalEuroHora)}</span>
                </div>
              </NeoCard>
            );
          })}
        </div>
      </div>
    </div>
  );
};

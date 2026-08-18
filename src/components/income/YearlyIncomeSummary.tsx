// src/components/income/YearlyIncomeSummary.tsx
// Resum anual d'ingressos i hores per centre, a l'estil del teu Excel de seguiment.
// No fa cap lectura nova a Firebase: tot es calcula en memòria a partir de dades ja carregades.

import { useState, useMemo, Fragment } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

      <NeoCard className="p-4 sm:p-6 min-w-0">
        <h3 className="text-lg sm:text-xl font-semibold mb-4">Detall mensual {selectedYear}</h3>
        <Separator className="mb-4" />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                {activeCenters.map((center) => (
                  <TableHead key={center.id} colSpan={3} className="text-center border-l">
                    {center.name}
                  </TableHead>
                ))}
                <TableHead colSpan={3} className="text-center border-l">
                  Total
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead></TableHead>
                {activeCenters.map((center) => (
                  <Fragment key={center.id}>
                    <TableHead className="text-xs text-right border-l">Hores</TableHead>
                    <TableHead className="text-xs text-right">Pagat</TableHead>
                    <TableHead className="text-xs text-right">€/h</TableHead>
                  </Fragment>
                ))}
                <TableHead className="text-xs text-right border-l">Hores</TableHead>
                <TableHead className="text-xs text-right">Pagat</TableHead>
                <TableHead className="text-xs text-right">€/h</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyBreakdown.map((row) => (
                <TableRow key={row.period.start}>
                  <TableCell className="font-medium">{row.period.monthLabel}</TableCell>
                  {activeCenters.map((center) => {
                    const data = row.byCenter[center.id];
                    return (
                      <Fragment key={center.id}>
                        <TableCell className="text-right border-l">{data.hores}</TableCell>
                        <TableCell className="text-right">{formatEuro(data.pagat)}</TableCell>
                        <TableCell className="text-right">{formatEuroHora(data.euroHora)}</TableCell>
                      </Fragment>
                    );
                  })}
                  <TableCell className="text-right border-l font-medium">{row.totalHores}</TableCell>
                  <TableCell className="text-right font-medium">{formatEuro(row.totalPagat)}</TableCell>
                  <TableCell className="text-right font-medium">{formatEuroHora(row.totalEuroHora)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </NeoCard>
    </div>
  );
};

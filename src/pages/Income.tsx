// src/pages/Income.tsx
import { useState, useMemo, useEffect } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Euro, Trash2, TrendingUp } from "lucide-react";
import { useCenters } from "@/hooks/useCenters";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useSchedules } from "@/hooks/useSchedules";
import { useSettings } from "@/hooks/useSettings";
import { usePayrolls } from "@/hooks/usePayrolls";
import { useAuth } from "@/contexts/AuthContext";
import {
  getRecentPeriods,
  countEffectiveSessionsInPeriod,
} from "@/utils/incomeHelpers";
import type { EffectiveSession } from "@/utils/sessionHelpers";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YearlyIncomeSummary } from "@/components/income/YearlyIncomeSummary";

const formatEuro = (value: number) =>
  new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(value);

// Mateixa paleta que fas servir a Configuració → Centres (CenterManagement.tsx)
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

const CENTER_COLOR_HEX: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  purple: "#a855f7",
  orange: "#f97316",
  red: "#ef4444",
  pink: "#ec4899",
  yellow: "#eab308",
  indigo: "#6366f1",
};

const Income = () => {
  const { currentUser } = useAuth();
  const { activeCenters, getCenterByLegacyId } = useCenters();
  const { schedules } = useSchedules();
  const settings = useSettings(); // useSettings() ja retorna vacations, closuresByCenter, etc. directament (no dins d'un objecte "settings")
  const { payrolls, loading, addPayroll, deletePayroll } = usePayrolls();

    const [customSessions, setCustomSessions] = useState<Record<string, EffectiveSession[]>>({});

  useEffect(() => {
    const loadCustomSessions = async () => {
      const snap = await getDoc(doc(db, "settings", "customSessions"));
      if (snap.exists()) {
        const data = snap.data();
        const sessionsMap: Record<string, EffectiveSession[]> = {};
        Object.entries(data).forEach(([dateKey, sessions]) => {
          if (Array.isArray(sessions)) sessionsMap[dateKey] = sessions as EffectiveSession[];
        });
        setCustomSessions(sessionsMap);
      }
    };
    loadCustomSessions();
  }, []);
  const periods = useMemo(() => getRecentPeriods(60), []);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
  const selectedPeriod = periods[selectedPeriodIndex];

  const [selectedCenterId, setSelectedCenterId] = useState<string>(activeCenters[0]?.id || "");
  const [amountInput, setAmountInput] = useState("");
  const [saving, setSaving] = useState(false);

  const sessionCounts = useMemo(() => {
    if (!selectedPeriod) return {};
    return countEffectiveSessionsInPeriod(
      schedules,
      settings,
      customSessions,
      selectedPeriod.start,
      selectedPeriod.end,
      getCenterByLegacyId
    );
  }, [schedules, settings, customSessions, selectedPeriod, getCenterByLegacyId]);

  const entriesForPeriod = useMemo(
    () => payrolls.filter((p) => selectedPeriod && p.periodStart === selectedPeriod.start),
    [payrolls, selectedPeriod]
  );

  const totalForPeriod = entriesForPeriod.reduce((sum, e) => sum + e.amount, 0);

  const handleAdd = async () => {
    const amount = parseFloat(amountInput.replace(",", "."));
    if (!selectedCenterId || isNaN(amount) || amount <= 0 || !selectedPeriod || !currentUser) return;
    setSaving(true);
    try {
      await addPayroll({
        instructorId: currentUser.uid,
        centerId: selectedCenterId,
        periodStart: selectedPeriod.start,
        periodEnd: selectedPeriod.end,
        amount,
      });
      setAmountInput("");
    } finally {
      setSaving(false);
    }
  };

  const chartData = useMemo(() => {
    return [...periods].reverse().map((period) => {
      const periodEntries = payrolls.filter((p) => p.periodStart === period.start);
      const row: Record<string, any> = { periode: period.shortLabel };
      let total = 0;
      activeCenters.forEach((center) => {
        const centerTotal = periodEntries
          .filter((e) => e.centerId === center.id)
          .reduce((sum, e) => sum + e.amount, 0);
        row[center.id] = centerTotal;
        total += centerTotal;
      });
      row.total = total;
      return row;
    });
  }, [periods, payrolls, activeCenters]);

  const [evolutionView, setEvolutionView] = useState<"recent12" | "all" | "years">("recent12");

  const yearlyChartData = useMemo(() => {
    const byYear: Record<string, any> = {};
    [...periods].reverse().forEach((period) => {
      const year = period.end.split("-")[0];
      if (!byYear[year]) {
        const row: Record<string, any> = { periode: year, total: 0 };
        activeCenters.forEach((c) => (row[c.id] = 0));
        byYear[year] = row;
      }
      const periodEntries = payrolls.filter((p) => p.periodStart === period.start);
      activeCenters.forEach((center) => {
        const centerTotal = periodEntries
          .filter((e) => e.centerId === center.id)
          .reduce((sum, e) => sum + e.amount, 0);
        byYear[year][center.id] += centerTotal;
        byYear[year].total += centerTotal;
      });
    });
    return Object.values(byYear).sort((a: any, b: any) => a.periode.localeCompare(b.periode));
  }, [periods, payrolls, activeCenters]);

  const displayedChartData = useMemo(() => {
    if (evolutionView === "years") return yearlyChartData;
    if (evolutionView === "all") return chartData;
    return chartData.slice(-12); // últims 12 períodes
  }, [evolutionView, chartData, yearlyChartData]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Euro className="w-6 h-6" />
          Els meus ingressos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registre de nòmines per centre i període (del 26 al 25 de cada mes).
        </p>
      </div>

      <Tabs defaultValue="current" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="current">Període actual</TabsTrigger>
          <TabsTrigger value="yearly">Resum anual</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
      
      <NeoCard className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPeriodIndex((i) => Math.min(i + 1, periods.length - 1))}
            disabled={selectedPeriodIndex >= periods.length - 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <p className="font-bold text-xl">{selectedPeriod?.monthLabel}</p>
            <p className="text-xs text-muted-foreground">({selectedPeriod?.rangeLabel})</p>
            {selectedPeriodIndex === 0 && (
              <Badge variant="outline" className="mt-1">Període actual</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPeriodIndex((i) => Math.max(i - 1, 0))}
            disabled={selectedPeriodIndex === 0}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </NeoCard>

      <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <h3 className="text-lg font-semibold mb-1">Classes fetes aquest període (referència)</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Calculat automàticament a partir del Calendari: reflecteix baixes, substitucions
          i qualsevol modificació que hi hagis fet.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {activeCenters.map((center) => (
            <div key={center.id} className="p-3 bg-white rounded-lg border">
              <p className="text-sm text-muted-foreground">{center.name}</p>
              <p className="text-2xl font-bold">{sessionCounts[center.id] || 0}</p>
              <p className="text-xs text-muted-foreground">classes</p>
            </div>
          ))}
        </div>
      </NeoCard>   

      <NeoCard className="p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Afegir nòmina d'aquest període</h3>
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <Label>Centre</Label>
            <Select value={selectedCenterId} onValueChange={setSelectedCenterId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona centre" />
              </SelectTrigger>
              <SelectContent>
                {activeCenters.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Import (€)</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
          </div>
          <Button onClick={handleAdd} disabled={saving || !amountInput}>
            {saving ? "Guardant..." : "Guardar nòmina"}
          </Button>
        </div>
      </NeoCard>

      <NeoCard className="p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Nòmines d'aquest període</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregant...</p>
        ) : entriesForPeriod.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Encara no hi ha cap nòmina registrada per aquest període.
          </p>
        ) : (
          <div className="space-y-2">
            {entriesForPeriod.map((entry) => {
              const center = activeCenters.find((c) => c.id === entry.centerId);
              return (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <p className="font-medium text-sm">{center?.name || entry.centerId}</p>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatEuro(entry.amount)}</span>
                    <Button variant="ghost" size="sm" onClick={() => deletePayroll(entry.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <Separator className="my-2" />
            <div className="flex items-center justify-between font-bold text-lg">
              <span>Total del període</span>
              <span>{formatEuro(totalForPeriod)}</span>
            </div>
          </div>
        )}
      </NeoCard>

      <NeoCard className="p-4 sm:p-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <h3 className="text-lg sm:text-xl font-semibold">Evolució dels ingressos</h3>
          </div>
          <Select value={evolutionView} onValueChange={(value: any) => setEvolutionView(value)}>
            <SelectTrigger className="w-full sm:w-56 min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent12">Últims 12 períodes</SelectItem>
              <SelectItem value="all">Tot l'historial</SelectItem>
              <SelectItem value="years">Per anys</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator className="mb-4" />

        {/* Vista ESCRIPTORI: gràfica de barres apilades, amb scroll horitzontal si hi ha molts períodes */}
        <div className="hidden sm:block overflow-x-auto">
          <div
            className="h-64"
            style={{ minWidth: `${Math.max(displayedChartData.length * 60, 400)}px` }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayedChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periode" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: number) => formatEuro(value as number)} />
                {activeCenters.map((center) => (
                  <Bar
                    key={center.id}
                    dataKey={center.id}
                    stackId="income"
                    name={center.name}
                    fill={CENTER_COLOR_HEX[center.color] || "#6366f1"}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vista MÒBIL: llista dins d'un contenidor amb scroll, com a "Les Meves Estadístiques" */}
        <div className="block sm:hidden">
          <ScrollArea className="h-80">
            <div className="space-y-3 pr-3">
              {(() => {
                const maxTotal = Math.max(...displayedChartData.map((c: any) => c.total), 1);
                return displayedChartData.map((item: any) => {
                  const barWidthPct = (item.total / maxTotal) * 100;
                  return (
                    <div key={item.periode} className="space-y-2">
                      <div className="flex items-center justify-between text-sm gap-2">
                        <span className="font-medium">{item.periode}</span>
                        <Badge variant="outline" className="bg-indigo-50">
                          {formatEuro(item.total)}
                        </Badge>
                      </div>
                      <div className="h-8 bg-muted rounded-full overflow-hidden">
                        <div className="h-full flex" style={{ width: `${barWidthPct}%` }}>
                          {activeCenters.map((center) => {
                            const value = item[center.id] || 0;
                            const centerPct = item.total > 0 ? (value / item.total) * 100 : 0;
                            if (centerPct === 0) return null;
                            return (
                              <div
                                key={center.id}
                                className={CENTER_COLOR_CLASS[center.color] || "bg-indigo-500"}
                                style={{ width: `${centerPct}%` }}
                                title={`${center.name}: ${formatEuro(value)}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </ScrollArea>
        </div>

        {/* Llegenda de colors per centre */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-3 mt-4">
          {activeCenters.map((center) => (
            <div key={center.id} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${CENTER_COLOR_CLASS[center.color] || "bg-indigo-500"} flex-shrink-0`}></div>
              <span>{center.name}</span>
            </div>
          ))}
        </div>
      </NeoCard>
        </TabsContent>

        <TabsContent value="yearly">
          <YearlyIncomeSummary
            schedules={schedules}
            settings={settings}
            customSessions={customSessions}
            activeCenters={activeCenters}
            getCenterByLegacyId={getCenterByLegacyId}
            payrolls={payrolls}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Income;

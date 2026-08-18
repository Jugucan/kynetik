// src/pages/Income.tsx
import { useState, useMemo } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { useSchedules } from "@/hooks/useSchedules";
import { useSettings } from "@/hooks/useSettings";
import { usePayrolls } from "@/hooks/usePayrolls";
import { useAuth } from "@/contexts/AuthContext";
import {
  getRecentPeriods,
  countSessionsInPeriod,
} from "@/utils/incomeHelpers";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const formatEuro = (value: number) =>
  new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" }).format(value);

const Income = () => {
  const { firestoreUserId } = useAuth();
  const { activeCenters, getCenterByLegacyId } = useCenters();
  const { schedules } = useSchedules();
  const { settings } = useSettings();
  const { payrolls, loading, addPayroll, deletePayroll } = usePayrolls();

  const periods = useMemo(() => getRecentPeriods(12), []);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
  const selectedPeriod = periods[selectedPeriodIndex];

  const [selectedCenterId, setSelectedCenterId] = useState<string>(activeCenters[0]?.id || "");
  const [amountInput, setAmountInput] = useState("");
  const [saving, setSaving] = useState(false);

  const sessionCounts = useMemo(() => {
    if (!selectedPeriod) return {};
    return countSessionsInPeriod(
      schedules,
      settings,
      selectedPeriod.start,
      selectedPeriod.end,
      getCenterByLegacyId
    );
  }, [schedules, settings, selectedPeriod, getCenterByLegacyId]);

  const entriesForPeriod = useMemo(
    () => payrolls.filter((p) => selectedPeriod && p.periodStart === selectedPeriod.start),
    [payrolls, selectedPeriod]
  );

  const totalForPeriod = entriesForPeriod.reduce((sum, e) => sum + e.amount, 0);

  const handleAdd = async () => {
    const amount = parseFloat(amountInput.replace(",", "."));
    if (!selectedCenterId || isNaN(amount) || amount <= 0 || !selectedPeriod || !firestoreUserId) return;
    setSaving(true);
    try {
      await addPayroll({
        instructorId: firestoreUserId,
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
      const total = payrolls
        .filter((p) => p.periodStart === period.start)
        .reduce((sum, e) => sum + e.amount, 0);
      return { periode: period.label.split(" - ")[0], total };
    });
  }, [periods, payrolls]);

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
            <p className="font-semibold text-lg">{selectedPeriod?.label}</p>
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
          Calculat automàticament a partir del teu horari habitual. No inclou substitucions
          puntuals fetes des del Calendari.
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

      <NeoCard className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Evolució dels ingressos</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="periode" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value: number) => formatEuro(value as number)} />
              <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </NeoCard>
    </div>
  );
};

export default Income;

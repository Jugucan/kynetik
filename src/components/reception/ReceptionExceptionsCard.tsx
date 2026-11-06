// src/components/reception/ReceptionExceptionsCard.tsx
// Canvis i absències de recepció per a un dia concret (malaltia, permís, ampliació d'horari, etc.).

import { useState, useMemo } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { dateToKey } from "@/utils/statsHelpers";
import { parseDateKey, shiftMinutes, formatMinutes } from "@/utils/receptionHelpers";
import type { ReceptionOverride, ReceptionOverrideType } from "@/types/reception";

interface ReceptionExceptionsCardProps {
  overrides: Record<string, ReceptionOverride>;
  onSet: (dateKey: string, override: ReceptionOverride) => Promise<void>;
  onRemove: (dateKey: string) => Promise<void>;
}

const formatDateLabel = (dateKey: string) =>
  parseDateKey(dateKey).toLocaleDateString("ca-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export const ReceptionExceptionsCard = ({ overrides, onSet, onRemove }: ReceptionExceptionsCardProps) => {
  const todayKey = dateToKey(new Date());

  const [date, setDate] = useState(todayKey);
  const [type, setType] = useState<ReceptionOverrideType>("custom");
  const [start, setStart] = useState("14:00");
  const [end, setEnd] = useState("20:00");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upcoming = useMemo(
    () =>
      Object.entries(overrides)
        .filter(([dateKey]) => dateKey >= todayKey)
        .sort(([a], [b]) => a.localeCompare(b)),
    [overrides, todayKey]
  );

  const handleAdd = async () => {
    setError(null);
    if (!date) {
      setError("Tria una data.");
      return;
    }
    if (type === "custom" && (!start || !end || end <= start)) {
      setError("L'hora de final ha de ser posterior a la d'inici.");
      return;
    }
    setSaving(true);
    try {
      await onSet(date, type === "absent" ? { type, note } : { type, start, end, note });
      setNote("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <NeoCard className="p-4 sm:p-6 min-w-0">
      <h2 className="text-xl font-semibold mb-1">Canvis i absències</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Per a un dia concret: no hi vas (malaltia, permís...), hi vas amb un horari diferent, o hi vas un
        dia que normalment no toca. Si ja hi havia un canvi aquell dia, es substitueix.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <Label>Dia</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Què passa</Label>
          <Select value={type} onValueChange={(value) => setType(value as ReceptionOverrideType)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Horari diferent / hi vaig aquest dia</SelectItem>
              <SelectItem value="absent">No hi vaig</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {type === "custom" && (
          <>
            <div>
              <Label>Hora d'inici</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Hora de final</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1" />
            </div>
          </>
        )}

        <div className="sm:col-span-2">
          <Label>Nota (opcional)</Label>
          <Input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: cobreixo una companya"
            className="mt-1"
          />
        </div>
      </div>

      <Button onClick={handleAdd} disabled={saving} className="w-full sm:w-auto">
        <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
        {saving ? "Guardant..." : "Afegir canvi"}
      </Button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2">Canvis programats</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hi ha cap canvi programat.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(([dateKey, override]) => (
              <div
                key={dateKey}
                className="flex items-center justify-between gap-2 p-3 bg-white rounded-lg border min-w-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize">{formatDateLabel(dateKey)}</p>
                  <p className="text-xs text-muted-foreground">
                    {override.type === "absent"
                      ? "No hi vaig"
                      : `${override.start} – ${override.end} (${formatMinutes(
                          shiftMinutes(override.start || "00:00", override.end || "00:00")
                        )})`}
                    {override.note ? ` · ${override.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className={override.type === "absent" ? "border-red-300 text-red-700" : "border-amber-300 text-amber-700"}>
                    {override.type === "absent" ? "Absència" : "Canvi"}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => onRemove(dateKey)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </NeoCard>
  );
};

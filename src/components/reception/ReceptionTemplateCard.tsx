// src/components/reception/ReceptionTemplateCard.tsx
// Editor de la plantilla setmanal de recepció (el teu horari fix de cada setmana).

import { useState, useEffect } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import type { ReceptionShift } from "@/types/reception";

interface ReceptionTemplateCardProps {
  weekly: Record<string, ReceptionShift>;
  onSave: (weekly: Record<string, ReceptionShift>) => Promise<void>;
}

interface DayRow {
  enabled: boolean;
  start: string;
  end: string;
}

const DAY_NAMES = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte", "Diumenge"];

// Horari habitual de recepció: només s'usa com a valor inicial la primera vegada, abans de desar res.
const INITIAL_DEFAULTS: Record<string, ReceptionShift> = {
  "1": { start: "14:15", end: "22:00" },
  "2": { start: "14:15", end: "22:00" },
  "3": { start: "14:15", end: "22:00" },
  "4": { start: "14:15", end: "22:00" },
  "5": { start: "14:00", end: "18:00" },
};

const buildRows = (weekly: Record<string, ReceptionShift>): Record<string, DayRow> => {
  const source = Object.keys(weekly).length > 0 ? weekly : INITIAL_DEFAULTS;
  const rows: Record<string, DayRow> = {};
  for (let day = 1; day <= 7; day++) {
    const shift = source[String(day)];
    rows[String(day)] = shift
      ? { enabled: true, start: shift.start, end: shift.end }
      : { enabled: false, start: "14:00", end: "18:00" };
  }
  return rows;
};

export const ReceptionTemplateCard = ({ weekly, onSave }: ReceptionTemplateCardProps) => {
  const [rows, setRows] = useState<Record<string, DayRow>>(() => buildRows(weekly));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(buildRows(weekly));
  }, [weekly]);

  const updateRow = (day: string, changes: Partial<DayRow>) => {
    setRows((prev) => ({ ...prev, [day]: { ...prev[day], ...changes } }));
  };

  const handleSave = async () => {
    setError(null);
    const result: Record<string, ReceptionShift> = {};
    for (let day = 1; day <= 7; day++) {
      const row = rows[String(day)];
      if (!row.enabled) continue;
      if (!row.start || !row.end || row.end <= row.start) {
        setError(`${DAY_NAMES[day - 1]}: l'hora de final ha de ser posterior a la d'inici.`);
        return;
      }
      result[String(day)] = { start: row.start, end: row.end };
    }
    setSaving(true);
    try {
      await onSave(result);
    } finally {
      setSaving(false);
    }
  };

  return (
    <NeoCard className="p-4 sm:p-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
        <h2 className="text-xl font-semibold">Plantilla setmanal de recepció</h2>
        <Button size="sm" onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2 flex-shrink-0" />
          ) : (
            <Save className="h-4 w-4 mr-2 flex-shrink-0" />
          )}
          Desar plantilla
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        El teu horari habitual de cada setmana. Els canvis d'un dia concret els afegeixes a "Canvis i
        absències", sense tocar aquesta plantilla.
      </p>

      <div className="space-y-2">
        {DAY_NAMES.map((dayName, idx) => {
          const day = String(idx + 1);
          const row = rows[day];
          return (
            <div key={day} className="p-3 rounded-xl shadow-neo-inset min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Switch checked={row.enabled} onCheckedChange={(checked) => updateRow(day, { enabled: checked })} />
                  <span className="font-medium text-sm sm:text-base w-24">{dayName}</span>
                </div>
                {row.enabled ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={row.start}
                      onChange={(e) => updateRow(day, { start: e.target.value })}
                      className="shadow-neo-inset border-0 text-sm w-28"
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      value={row.end}
                      onChange={(e) => updateRow(day, { end: e.target.value })}
                      className="shadow-neo-inset border-0 text-sm w-28"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">No hi vaig</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </NeoCard>
  );
};

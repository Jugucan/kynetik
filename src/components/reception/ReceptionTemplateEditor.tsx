// src/components/reception/ReceptionTemplateEditor.tsx
// Formulari per crear o editar una versió de l'horari de recepció (nom, dates i dies de la setmana).

import { useState } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, X } from "lucide-react";
import type { ReceptionShift, ReceptionTemplate } from "@/types/reception";

interface ReceptionTemplateEditorProps {
  template: ReceptionTemplate;
  isNew: boolean;
  existingTemplates: ReceptionTemplate[];
  onSave: (template: ReceptionTemplate) => Promise<void>;
  onCancel: () => void;
}

interface DayRow {
  enabled: boolean;
  start: string;
  end: string;
}

const DAY_NAMES = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte", "Diumenge"];

const buildRows = (weekly: Record<string, ReceptionShift>): Record<string, DayRow> => {
  const rows: Record<string, DayRow> = {};
  for (let day = 1; day <= 7; day++) {
    const shift = weekly[String(day)];
    rows[String(day)] = shift
      ? { enabled: true, start: shift.start, end: shift.end }
      : { enabled: false, start: "14:00", end: "18:00" };
  }
  return rows;
};

export const ReceptionTemplateEditor = ({
  template,
  isNew,
  existingTemplates,
  onSave,
  onCancel,
}: ReceptionTemplateEditorProps) => {
  const [name, setName] = useState(template.name);
  const [startDate, setStartDate] = useState(template.startDate);
  const [endDate, setEndDate] = useState(template.endDate || "");
  const [rows, setRows] = useState<Record<string, DayRow>>(() => buildRows(template.weekly));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (day: string, changes: Partial<DayRow>) => {
    setRows((prev) => ({ ...prev, [day]: { ...prev[day], ...changes } }));
  };

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Posa-li un nom a l'horari (ex: Horari habitual, Horari d'estiu).");
      return;
    }
    if (!startDate) {
      setError("Cal indicar la data d'inici.");
      return;
    }
    if (endDate && endDate < startDate) {
      setError("La data de fi no pot ser anterior a la d'inici.");
      return;
    }
    if (existingTemplates.some((t) => t.id !== template.id && t.startDate === startDate)) {
      setError("Ja hi ha un altre horari que comença aquest mateix dia. Tria una altra data d'inici.");
      return;
    }

    const weekly: Record<string, ReceptionShift> = {};
    for (let day = 1; day <= 7; day++) {
      const row = rows[String(day)];
      if (!row.enabled) continue;
      if (!row.start || !row.end || row.end <= row.start) {
        setError(`${DAY_NAMES[day - 1]}: l'hora de final ha de ser posterior a la d'inici.`);
        return;
      }
      weekly[String(day)] = { start: row.start, end: row.end };
    }

    setSaving(true);
    try {
      await onSave({ ...template, name: name.trim(), startDate, endDate: endDate || null, weekly });
    } finally {
      setSaving(false);
    }
  };

  return (
    <NeoCard className="p-4 sm:p-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold">{isNew ? "Nou horari de recepció" : "Editar horari de recepció"}</h3>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={onCancel} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2 flex-shrink-0" />
            Cancel·lar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2 flex-shrink-0" />
            ) : (
              <Save className="h-4 w-4 mr-2 flex-shrink-0" />
            )}
            Desar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
        <div>
          <Label>Nom</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Horari d'estiu" className="mt-1" />
        </div>
        <div>
          <Label>Vigent des del</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Fins al (opcional)</Label>
          <div className="flex gap-1 mt-1">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            {endDate && (
              <Button variant="ghost" size="sm" onClick={() => setEndDate("")} title="Treure la data de fi">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Sense data de fi, serà el teu nou horari de referència i l'anterior es tancarà sol el dia abans. Amb data de
        fi (estiu, Nadal...), passada aquesta data tornarà l'horari anterior.
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

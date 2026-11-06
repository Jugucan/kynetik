// src/components/reception/ReceptionDaySection.tsx
// Secció de recepció dins la finestra d'un dia del Calendari: veure el torn i fer-hi canvis puntuals.

import { useState } from "react";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { dateToKey } from "@/utils/statsHelpers";
import { formatMinutes, RECEPTION_OFF_LABELS } from "@/utils/receptionHelpers";
import type { ReceptionDayStatus, ReceptionOverride } from "@/types/reception";

interface ReceptionDaySectionProps {
  date: Date;
  status: ReceptionDayStatus;
  override?: ReceptionOverride;
  onSet: (dateKey: string, override: ReceptionOverride) => Promise<void>;
  onRemove: (dateKey: string) => Promise<void>;
}

export const ReceptionDaySection = ({ date, status, override, onSet, onRemove }: ReceptionDaySectionProps) => {
  const dateKey = dateToKey(date);
  const [mode, setMode] = useState<"idle" | "change" | "absent">("idle");
  const [start, setStart] = useState(status.kind === "shift" ? status.start : "14:00");
  const [end, setEnd] = useState(status.kind === "shift" ? status.end : "18:00");
  const [note, setNote] = useState(override?.note || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setSaving(true);
    try {
      await action();
      setMode("idle");
    } catch (e) {
      console.error(e);
      setError("No s'ha pogut desar. Torna-ho a provar.");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyChange = () => {
    if (!start || !end || end <= start) {
      setError("L'hora de final ha de ser posterior a la d'inici.");
      return;
    }
    run(() => onSet(dateKey, { type: "custom", start, end, note }));
  };

  const handleAbsent = () => run(() => onSet(dateKey, { type: "absent", note }));
  const handleRestore = () => run(() => onRemove(dateKey));

  return (
    <div className="rounded-xl shadow-neo-inset p-3 space-y-3 min-w-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-sky-600 flex-shrink-0" />
          <span className="font-semibold text-sm">Recepció</span>
        </div>
        {override && (
          <Badge
            variant="outline"
            className={override.type === "absent" ? "border-red-300 text-red-700" : "border-amber-300 text-amber-700"}
          >
            {override.type === "absent" ? "Absència" : "Canvi"}
          </Badge>
        )}
      </div>

      <p className="text-sm">
        {status.kind === "shift" ? (
          <>
            <span className="font-medium">
              {status.start} – {status.end}
            </span>{" "}
            <span className="text-muted-foreground">({formatMinutes(status.minutes)})</span>
          </>
        ) : (
          <span className="text-muted-foreground">{RECEPTION_OFF_LABELS[status.reason]}</span>
        )}
        {override?.note ? <span className="text-muted-foreground"> · {override.note}</span> : null}
      </p>

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setMode("change")}>
            {status.kind === "shift" ? "Canviar horari" : "Afegir torn"}
          </Button>
          {status.kind === "shift" && (
            <Button size="sm" variant="outline" onClick={() => setMode("absent")}>
              No hi vaig
            </Button>
          )}
          {override && (
            <Button size="sm" variant="ghost" onClick={handleRestore} disabled={saving}>
              Restaurar horari habitual
            </Button>
          )}
        </div>
      )}

      {mode !== "idle" && (
        <div className="space-y-2">
          {mode === "change" && (
            <div className="flex items-center gap-2">
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-28" />
              <span className="text-muted-foreground">–</span>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-28" />
            </div>
          )}
          <Input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota (opcional)"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>
              Cancel·lar
            </Button>
            <Button size="sm" onClick={mode === "change" ? handleApplyChange : handleAbsent} disabled={saving}>
              {saving ? "Guardant..." : mode === "change" ? "Aplicar" : "Marcar absència"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};

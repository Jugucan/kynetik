// src/components/reception/ReceptionTemplateCard.tsx
// Llista de versions de l'horari de recepció (habitual, estiu, Nadal...) amb les seves dates de vigència.

import { useState } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Trash2 } from "lucide-react";
import { ReceptionTemplateEditor } from "@/components/reception/ReceptionTemplateEditor";
import { dateToKey } from "@/utils/statsHelpers";
import { applyTemplateSave, getTemplateForDate, parseDateKey } from "@/utils/receptionHelpers";
import type { ReceptionShift, ReceptionTemplate } from "@/types/reception";

interface ReceptionTemplateCardProps {
  templates: ReceptionTemplate[];
  onSave: (templates: ReceptionTemplate[]) => Promise<void>;
}

// Horari habitual de recepció: només s'usa com a valor inicial del primer horari que creïs.
const INITIAL_DEFAULTS: Record<string, ReceptionShift> = {
  "1": { start: "14:15", end: "22:00" },
  "2": { start: "14:15", end: "22:00" },
  "3": { start: "14:15", end: "22:00" },
  "4": { start: "14:15", end: "22:00" },
  "5": { start: "14:00", end: "18:00" },
};

const DAY_SHORT = ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"];

const formatDate = (key: string) => parseDateKey(key).toLocaleDateString("ca-ES");

export const ReceptionTemplateCard = ({ templates, onSave }: ReceptionTemplateCardProps) => {
  const todayKey = dateToKey(new Date());
  const inForce = getTemplateForDate(templates, todayKey);
  const sorted = [...templates].sort((a, b) => b.startDate.localeCompare(a.startDate));

  const [editing, setEditing] = useState<ReceptionTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);

  const startNew = () => {
    setEditing({
      id: `rt_${Date.now()}`,
      name: templates.length === 0 ? "Horari habitual" : "Horari nou",
      startDate: todayKey,
      endDate: null,
      weekly: templates.length === 0 ? INITIAL_DEFAULTS : {},
    });
    setIsNew(true);
  };

  const startCopy = (source: ReceptionTemplate) => {
    setEditing({
      id: `rt_${Date.now()}`,
      name: `${source.name} (còpia)`,
      startDate: todayKey,
      endDate: null,
      weekly: { ...source.weekly },
    });
    setIsNew(true);
  };

  const startEdit = (template: ReceptionTemplate) => {
    setEditing({ ...template });
    setIsNew(false);
  };

  const handleSave = async (template: ReceptionTemplate) => {
    await onSave(applyTemplateSave(templates, template));
    setEditing(null);
  };

  const handleDelete = async (template: ReceptionTemplate) => {
    if (!confirm(`Segur que vols eliminar l'horari "${template.name}"?`)) return;
    await onSave(templates.filter((t) => t.id !== template.id));
  };

  const statusBadge = (t: ReceptionTemplate) => {
    if (inForce?.id === t.id) {
      return <Badge className="bg-green-500 hover:bg-green-500 text-white">En vigor</Badge>;
    }
    if (t.startDate > todayKey) {
      return <Badge variant="outline" className="border-blue-300 text-blue-700">Futur</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">Anterior</Badge>;
  };

  return (
    <div className="space-y-4">
      <NeoCard className="p-4 sm:p-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
          <h2 className="text-xl font-semibold">Horaris de recepció</h2>
          <Button size="sm" variant="outline" onClick={startNew} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
            Nou horari
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Cada horari té la seva data d'inici i de fi (habitual, estiu, Nadal...). Els canvis d'un dia concret
          els afegeixes a "Canvis i absències", sense tocar l'horari.
        </p>

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Encara no tens cap horari de recepció. Clica "Nou horari" per crear el primer.
          </p>
        ) : (
          <div className="space-y-3">
            {sorted.map((t) => (
              <div key={t.id} className="p-3 rounded-xl shadow-neo-inset min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{t.name}</p>
                      {statusBadge(t)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Des del {formatDate(t.startDate)}
                      {t.endDate ? ` fins al ${formatDate(t.endDate)}` : " · sense data de fi"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {DAY_SHORT.map((label, idx) => {
                        const shift = t.weekly[String(idx + 1)];
                        return shift ? `${label} ${shift.start}–${shift.end}` : null;
                      })
                        .filter(Boolean)
                        .join(" · ") || "Cap dia"}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => startEdit(t)}>
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => startCopy(t)} title="Copiar">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t)} title="Eliminar">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </NeoCard>

      {editing && (
        <ReceptionTemplateEditor
          key={editing.id}
          template={editing}
          isNew={isNew}
          existingTemplates={templates}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
};

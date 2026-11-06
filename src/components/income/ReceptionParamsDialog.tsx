// src/components/income/ReceptionParamsDialog.tsx
// Formulari per configurar els paràmetres de nòmina de Recepció (independent de dirigides).

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings2 } from "lucide-react";
import type { ReceptionParams } from "@/types/income";

interface ReceptionParamsDialogProps {
  year: number;
  currentParams: ReceptionParams | undefined;
  onSave: (year: number, values: Omit<ReceptionParams, "id" | "instructorId" | "year" | "createdAt">) => Promise<void>;
}

const DEFAULT_VALUES = {
  souBase: "",
  pagaEstiu: "",
  pagaNadal: "",
  pagaBeneficis: "",
  contingenciesComunes: "",
  atur: "",
  formacioProfessional: "",
  mecanismeEquitat: "",
  irpf: "",
};

export const ReceptionParamsDialog = ({ year, currentParams, onSave }: ReceptionParamsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(
        currentParams
          ? {
              souBase: String(currentParams.souBase),
              pagaEstiu: String(currentParams.pagaEstiu),
              pagaNadal: String(currentParams.pagaNadal),
              pagaBeneficis: String(currentParams.pagaBeneficis),
              contingenciesComunes: String(currentParams.contingenciesComunes),
              atur: String(currentParams.atur),
              formacioProfessional: String(currentParams.formacioProfessional),
              mecanismeEquitat: String(currentParams.mecanismeEquitat),
              irpf: String(currentParams.irpf),
            }
          : DEFAULT_VALUES
      );
    }
  }, [open, currentParams]);

  const handleChange = (field: keyof typeof DEFAULT_VALUES, raw: string) => {
    if (raw === "" || /^-?[0-9]*[.,]?[0-9]*$/.test(raw)) {
      setValues((prev) => ({ ...prev, [field]: raw }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const numericValues = Object.fromEntries(
        Object.entries(values).map(([key, raw]) => {
          const num = parseFloat(String(raw).replace(",", "."));
          return [key, isNaN(num) ? 0 : num];
        })
      ) as Omit<ReceptionParams, "id" | "instructorId" | "year" | "createdAt">;

      await onSave(year, numericValues);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const FIELDS: { key: keyof typeof DEFAULT_VALUES; label: string }[] = [
    { key: "souBase", label: "Sou base recepció (€/mes)" },
    { key: "pagaEstiu", label: "Paga extra d'estiu (€/mes)" },
    { key: "pagaNadal", label: "Paga extra de Nadal (€/mes)" },
    { key: "pagaBeneficis", label: "Paga extra de beneficis (€/mes)" },
  ];

  const DEDUCTION_FIELDS: { key: keyof typeof DEFAULT_VALUES; label: string }[] = [
    { key: "contingenciesComunes", label: "Contingències comunes" },
    { key: "atur", label: "Atur" },
    { key: "formacioProfessional", label: "Formació professional" },
    { key: "mecanismeEquitat", label: "Mecanisme d'equitat" },
    { key: "irpf", label: "IRPF" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          <Settings2 className="w-4 h-4 mr-1 flex-shrink-0" />
          Configurar previsió recepció {year}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paràmetres de Recepció · {year}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Imports ja ajustats a les teves hores setmanals de recepció (ex: 35h). Si les hores
            canvien, actualitza aquí els imports corresponents.
          </p>

          <p className="text-sm font-semibold pt-2">Conceptes fixos mensuals (bruts)</p>
          {FIELDS.map((f) => (
            <div key={f.key} className="grid grid-cols-2 items-center gap-2">
              <Label className="text-sm">{f.label}</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={values[f.key]}
                placeholder="0"
                onChange={(e) => handleChange(f.key, e.target.value)}
              />
            </div>
          ))}

          <Separator className="my-2" />

          <p className="text-sm font-semibold">Retencions (%)</p>
          {DEDUCTION_FIELDS.map((f) => (
            <div key={f.key} className="grid grid-cols-2 items-center gap-2">
              <Label className="text-sm">{f.label}</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={values[f.key]}
                  placeholder="0"
                  onChange={(e) => handleChange(f.key, e.target.value)}
                />
                <span className="text-xs text-muted-foreground w-6 flex-shrink-0">%</span>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel·lar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardant..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// src/components/income/PayrollParamsDialog.tsx
// Formulari (en finestra emergent) per configurar els paràmetres de nòmina d'un any concret.

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
import type { PayrollParams } from "@/types/income";

interface PayrollParamsDialogProps {
  year: number;
  currentParams: PayrollParams | undefined;
  onSave: (year: number, values: Omit<PayrollParams, "id" | "instructorId" | "year" | "createdAt">) => Promise<void>;
}

const DEFAULT_VALUES = {
  souBase: 0,
  pagaEstiu: 0,
  pagaNadal: 0,
  pagaBeneficis: 0,
  substitutoriCalcat: 0,
  incentiuEuroHora: 0,
  contingenciesComunes: 0,
  atur: 0,
  formacioProfessional: 0,
  mecanismeEquitat: 0,
  irpf: 0,
};

export const PayrollParamsDialog = ({ year, currentParams, onSave }: PayrollParamsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(
        currentParams
          ? {
              souBase: currentParams.souBase,
              pagaEstiu: currentParams.pagaEstiu,
              pagaNadal: currentParams.pagaNadal,
              pagaBeneficis: currentParams.pagaBeneficis,
              substitutoriCalcat: currentParams.substitutoriCalcat,
              incentiuEuroHora: currentParams.incentiuEuroHora,
              contingenciesComunes: currentParams.contingenciesComunes,
              atur: currentParams.atur,
              formacioProfessional: currentParams.formacioProfessional,
              mecanismeEquitat: currentParams.mecanismeEquitat,
              irpf: currentParams.irpf,
            }
          : DEFAULT_VALUES
      );
    }
  }, [open, currentParams]);

  const handleChange = (field: keyof typeof DEFAULT_VALUES, raw: string) => {
    const num = parseFloat(raw.replace(",", "."));
    setValues((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(year, values);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const FIELDS: { key: keyof typeof DEFAULT_VALUES; label: string; suffix: string }[] = [
    { key: "souBase", label: "Sou base", suffix: "€/mes" },
    { key: "pagaEstiu", label: "Paga extra d'estiu", suffix: "€/mes" },
    { key: "pagaNadal", label: "Paga extra de Nadal", suffix: "€/mes" },
    { key: "pagaBeneficis", label: "Paga extra de beneficis", suffix: "€/mes" },
    { key: "substitutoriCalcat", label: "Substitutori calçat", suffix: "€/mes" },
    { key: "incentiuEuroHora", label: "Incentius (per defecte)", suffix: "€/h" },
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
        <Button variant="outline" size="sm">
          <Settings2 className="w-4 h-4 mr-1" />
          Configurar previsió {year}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paràmetres de nòmina · {year}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Aquests imports serveixen per calcular la previsió del net dels mesos encara sense
            nòmina real introduïda. Poden variar cada any.
          </p>

          <p className="text-sm font-semibold pt-2">Conceptes fixos mensuals (bruts)</p>
          {FIELDS.map((f) => (
            <div key={f.key} className="grid grid-cols-2 items-center gap-2">
              <Label className="text-sm">{f.label}</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={values[f.key] === 0 ? "" : String(values[f.key])}
                  placeholder="0"
                  onChange={(e) => handleChange(f.key, e.target.value)}
                />
                <span className="text-xs text-muted-foreground w-14 flex-shrink-0">{f.suffix}</span>
              </div>
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
                  value={values[f.key] === 0 ? "" : String(values[f.key])}
                  placeholder="0"
                  onChange={(e) => handleChange(f.key, e.target.value)}
                />
                <span className="text-xs text-muted-foreground w-14 flex-shrink-0">%</span>
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

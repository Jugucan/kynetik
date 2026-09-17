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
import type { Center } from "@/contexts/AppDataContext";

interface PayrollParamsDialogProps {
  year: number;
  currentParams: PayrollParams | undefined;
  activeCenters: Center[];
  onSave: (year: number, values: Omit<PayrollParams, "id" | "instructorId" | "year" | "createdAt">) => Promise<void>;
}

const DEFAULT_VALUES = {
  souBase: "",
  pagaEstiu: "",
  pagaNadal: "",
  pagaBeneficis: "",
  substitutoriCalcat: "",
  incentiuEuroHora: "",
  contingenciesComunes: "",
  atur: "",
  formacioProfessional: "",
  mecanismeEquitat: "",
  irpf: "",
};

export const PayrollParamsDialog = ({ year, currentParams, activeCenters, onSave }: PayrollParamsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
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
              substitutoriCalcat: String(currentParams.substitutoriCalcat),
              incentiuEuroHora: String(currentParams.incentiuEuroHora),
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

    useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      const equalShare = activeCenters.length > 0 ? (100 / activeCenters.length).toFixed(2) : "0";
      activeCenters.forEach((c) => {
        const saved = currentParams?.centerSplitPct?.[c.id];
        initial[c.id] = saved !== undefined ? String(saved) : equalShare;
      });
      setSplitValues(initial);
    }
  }, [open, currentParams, activeCenters]);

  const handleChange = (field: keyof typeof DEFAULT_VALUES, raw: string) => {
    // Deixem el text tal qual mentre s'escriu (permet la coma decimal a mig escriure).
    // Només acceptem dígits, coma, punt i el signe negatiu.
    if (raw === "" || /^-?[0-9]*[.,]?[0-9]*$/.test(raw)) {
      setValues((prev) => ({ ...prev, [field]: raw }));
    }
  };

    const handleSplitChange = (centerId: string, raw: string) => {
    if (raw === "" || /^-?[0-9]*[.,]?[0-9]*$/.test(raw)) {
      setSplitValues((prev) => ({ ...prev, [centerId]: raw }));
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
      ) as Omit<PayrollParams, "id" | "instructorId" | "year" | "createdAt" | "centerSplitPct">;

      const centerSplitPct: Record<string, number> = {};
      activeCenters.forEach((c) => {
        const num = parseFloat(String(splitValues[c.id] || "0").replace(",", "."));
        centerSplitPct[c.id] = isNaN(num) ? 0 : num;
      });

      await onSave(year, { ...numericValues, centerSplitPct });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const splitTotal = activeCenters.reduce(
    (sum, c) => sum + (parseFloat(String(splitValues[c.id] || "0").replace(",", ".")) || 0),
    0
  );

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
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          <Settings2 className="w-4 h-4 mr-1 flex-shrink-0" />
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
                  value={values[f.key]}
                  placeholder="0"
                  onChange={(e) => handleChange(f.key, e.target.value)}
                />
                <span className="text-xs text-muted-foreground w-14 flex-shrink-0">{f.suffix}</span>
              </div>
            </div>
          ))}

                    <Separator className="my-2" />

          <p className="text-sm font-semibold">Repartiment entre centres (%)</p>
          <p className="text-xs text-muted-foreground">
            Quan rebis un import conjunt sense desglossar, es repartirà amb aquest percentatge.
          </p>
          {activeCenters.map((center) => (
            <div key={center.id} className="grid grid-cols-2 items-center gap-2">
              <Label className="text-sm">{center.name}</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={splitValues[center.id] || ""}
                  placeholder="0"
                  onChange={(e) => handleSplitChange(center.id, e.target.value)}
                />
                <span className="text-xs text-muted-foreground w-14 flex-shrink-0">%</span>
              </div>
            </div>
          ))}
          <p className={`text-xs ${Math.abs(splitTotal - 100) < 0.5 ? "text-muted-foreground" : "text-amber-600"}`}>
            Suma: {splitTotal.toFixed(2)}% {Math.abs(splitTotal - 100) >= 0.5 && "(hauria de sumar 100%)"}
          </p>

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

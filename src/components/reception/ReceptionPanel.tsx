// src/components/reception/ReceptionPanel.tsx
// Secció d'horari de recepció a la pàgina d'Horaris: plantilla, canvis/absències i propers dies.

import { Loader2 } from "lucide-react";
import { useReceptionSchedule } from "@/hooks/useReceptionSchedule";
import { useSettings } from "@/hooks/useSettings";
import { useCenters } from "@/hooks/useCenters";
import { ReceptionTemplateCard } from "@/components/reception/ReceptionTemplateCard";
import { ReceptionExceptionsCard } from "@/components/reception/ReceptionExceptionsCard";
import { ReceptionUpcomingCard } from "@/components/reception/ReceptionUpcomingCard";

export const ReceptionPanel = () => {
  const { data, loading, saveTemplates, setOverride, removeOverride } = useReceptionSchedule();
  const settings = useSettings();
  const { getCenterByLegacyId } = useCenters();

  // La recepció és a Arbúcies: els seus tancaments són els que afecten l'horari
  const centerId = getCenterByLegacyId("Arbucies")?.id ?? "arbucies";

  if (loading) {
    return (
      <div className="flex justify-center items-center h-24">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregant horari de recepció...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Recepció</h1>
        <p className="text-muted-foreground">Horari de recepció, independent de les classes dirigides</p>
      </div>
      <ReceptionUpcomingCard data={data} settings={settings} centerId={centerId} />
      <ReceptionExceptionsCard overrides={data.overrides} onSet={setOverride} onRemove={removeOverride} />
      <ReceptionTemplateCard templates={data.templates} onSave={saveTemplates} />
    </div>
  );
};

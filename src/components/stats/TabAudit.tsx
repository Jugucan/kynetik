import { NeoCard } from "@/components/NeoCard";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TabAuditProps {
  stats: any;
}

export const TabAudit = ({ stats }: TabAuditProps) => {
  const discrepancies = stats.calendarDiscrepancies || [];

  return (
    <div className="space-y-4">
      <NeoCard className="p-4 sm:p-6 min-w-0 bg-gradient-to-br from-yellow-50 to-orange-50">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <h3 className="text-lg sm:text-xl font-semibold">Discrepàncies: Calendari vs Gimnàs</h3>
        </div>
        <Separator className="mb-4" />
        
        <p className="text-sm text-muted-foreground mb-4">
          Aquestes sessions tenen un programa diferent al teu calendari comparat amb el que diu el gimnàs. 
          Revisa el teu calendari per assegurar-te que els horaris són correctes.
        </p>

        {discrepancies.length > 0 ? (
          <>
            <Badge variant="outline" className="bg-orange-100 mb-4">
              {discrepancies.length} discrepàncies trobades
            </Badge>

            <ScrollArea className="h-96">
              <div className="space-y-3">
                {discrepancies.map((disc: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-orange-200">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{disc.date}</span>
                        <Badge variant="outline">{disc.center}</Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Hora: {disc.time.replace(/\s+/g, ' ').replace(/\n/g, '')}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="p-2 bg-red-50 rounded border border-red-200">
                          <p className="text-xs text-red-600 font-medium">Gimnàs diu:</p>
                          <p className="text-sm font-bold text-red-700">{disc.gymProgram}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs text-blue-600 font-medium">El teu calendari:</p>
                          <p className="text-sm font-bold text-blue-700">{disc.calendarProgram}</p>
                        </div>
                      </div>

                      {disc.count > 1 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Afecta {disc.count} assistències
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-green-600 font-medium">✅ No hi ha discrepàncies!</p>
            <p className="text-sm text-muted-foreground mt-2">
              El teu calendari coincideix perfectament amb les dades del gimnàs.
            </p>
          </div>
        )}
      </NeoCard>
    </div>
  );
};

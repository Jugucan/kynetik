import { NeoCard } from "@/components/NeoCard";
import { MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface TabCentersProps {
  stats: any;
}

export const TabCenters = ({ stats }: TabCentersProps) => {
  return (
    <div className="space-y-4">
      <NeoCard className="p-4 sm:p-6 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
          <h3 className="text-lg sm:text-xl font-semibold">Distribució per Centre</h3>
        </div>
        <Separator className="mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {Object.entries(stats.centerCount).map(([center, count]) => {
            const totalAllCenters = Object.values(stats.centerCount).reduce((a: any, b: any) => a + b, 0);
            const percentage = (count as number / totalAllCenters) * 100;

            return (
              <div key={center} className="p-4 sm:p-6 bg-muted/30 rounded-lg text-center min-w-0">
                <p className="text-3xl sm:text-4xl font-bold mb-2">{count as number}</p>
                <p className="text-sm font-medium mb-3 truncate">{center}</p>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${center === 'Arbúcies' ? 'bg-blue-500' : 'bg-green-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {percentage.toFixed(1)}% del total
                </p>
              </div>
            );
          })}
        </div>
      </NeoCard>
    </div>
  );
};

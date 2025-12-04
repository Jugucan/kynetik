import { NeoCard } from "@/components/NeoCard";
import { Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface TabProgramsProps {
  stats: any;
}

export const TabPrograms = ({ stats }: TabProgramsProps) => {
  return (
    <div className="space-y-4">
      <NeoCard className="p-4 sm:p-6 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-primary flex-shrink-0" />
          <h3 className="text-lg sm:text-xl font-semibold">Classes per Programa</h3>
        </div>
        <Separator className="mb-4" />
        <div className="space-y-3">
          {stats.programData.map((prog: any) => {
            const percentage = (prog.count / stats.totalSessions) * 100;

            return (
              <div key={prog.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm gap-2">
                  <span className="font-medium truncate">{prog.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-muted-foreground text-xs">
                      {percentage.toFixed(1)}%
                    </span>
                    <Badge variant="outline">{prog.count}</Badge>
                  </div>
                </div>
                <div className="h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </NeoCard>
    </div>
  );
};

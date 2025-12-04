import { NeoCard } from "@/components/NeoCard";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface TabWeekdaysProps {
  stats: any;
}

export const TabWeekdays = ({ stats }: TabWeekdaysProps) => {
  return (
    <div className="space-y-4">
      <NeoCard className="p-4 sm:p-6 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
          <h3 className="text-lg sm:text-xl font-semibold">Classes per Dia de la Setmana</h3>
        </div>
        <Separator className="mb-4" />
        <div className="space-y-3">
          {stats.classesByWeekday.map((dayData: any) => {
            const maxCount = Math.max(...stats.classesByWeekday.map((d: any) => d.count));
            const percentage = maxCount > 0 ? (dayData.count / maxCount) * 100 : 0;

            return (
              <div key={dayData.day} className="space-y-2">
                <div className="flex items-center justify-between text-sm gap-2">
                  <span className="font-medium">{dayData.day}</span>
                  <Badge variant="outline">{dayData.count} classes</Badge>
                </div>
                <div className="h-8 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all flex items-center justify-end pr-2"
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage > 20 && (
                      <span className="text-xs text-white font-medium">
                        {dayData.count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Total classes:</strong> {stats.classesByWeekday.reduce((sum: number, d: any) => sum + d.count, 0)}
          </p>
        </div>
      </NeoCard>
    </div>
  );
};

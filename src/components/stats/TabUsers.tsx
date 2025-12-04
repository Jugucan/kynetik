import { NeoCard } from "@/components/NeoCard";
import { Award, UserX, ArrowUpDown, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface TabUsersProps {
  stats: any;
  inactiveSortOrder: 'asc' | 'desc';
  setInactiveSortOrder: (order: 'asc' | 'desc') => void;
  onUserClick: (user: any) => void;
}

export const TabUsers = ({ stats, inactiveSortOrder, setInactiveSortOrder, onUserClick }: TabUsersProps) => {
  return (
    <div className="space-y-4">
      <NeoCard className="p-4 sm:p-6 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <h3 className="text-base sm:text-xl font-semibold">Top 10 Usuaris Fidels</h3>
        </div>
        <Separator className="mb-4" />
        <div className="space-y-2 overflow-x-hidden">
          {stats.topUsers.map((user: any, idx: number) => (
            <div
              key={user.id}
              onClick={() => onUserClick(user)}
              className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 transition-colors gap-2 min-w-0 max-w-full"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
                <Badge
                  className={`${idx < 3 ? 'bg-yellow-500' : 'bg-muted'} flex-shrink-0 text-[10px] sm:text-xs px-2 py-1`}
                >
                  #{idx + 1}
                </Badge>
                <span className="font-medium text-sm sm:text-base truncate block min-w-0">
                  {user.name}
                </span>
              </div>
              <Badge
                variant="outline"
                className="flex-shrink-0 whitespace-nowrap text-[10px] sm:text-xs px-2 py-1"
              >
                <span className="hidden sm:inline">{user.totalSessions || 0} sessions</span>
                <span className="sm:hidden">{user.totalSessions || 0}</span>
              </Badge>
            </div>
          ))}
        </div>
      </NeoCard>

      <NeoCard className="p-4 sm:p-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-600 flex-shrink-0" />
            <h3 className="text-base sm:text-xl font-semibold">Usuaris Inactius (+60d)</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInactiveSortOrder(inactiveSortOrder === 'desc' ? 'asc' : 'desc')}
            className="gap-2 w-full sm:w-auto text-xs sm:text-sm"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline">{inactiveSortOrder === 'desc' ? 'Més dies' : 'Menys dies'}</span>
            <span className="sm:hidden">{inactiveSortOrder === 'desc' ? '▼ Dies' : '▲ Dies'}</span>
          </Button>
        </div>
        <Separator className="mb-4" />
        {stats.inactiveUsers.length > 0 ? (
          <ScrollArea className="h-64 overflow-x-hidden">
            <div className="space-y-2 overflow-x-hidden">
              {stats.inactiveUsers.map((user: any) => (
                <div
                  key={user.id}
                  onClick={() => onUserClick(user)}
                  className="flex items-center justify-between p-2 bg-red-50 rounded cursor-pointer hover:bg-red-100 transition-colors gap-2 min-w-0 max-w-full"
                >
                  <span className="font-medium text-sm truncate block min-w-0 flex-1 overflow-hidden">
                    {user.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-white flex-shrink-0 whitespace-nowrap text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1"
                  >
                    <Clock className="w-3 h-3 mr-0.5 sm:mr-1" />
                    <span className="hidden sm:inline">{user.daysSinceLastSession} dies</span>
                    <span className="inline sm:hidden">{user.daysSinceLastSession}d</span>
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hi ha usuaris inactius!
          </p>
        )}
      </NeoCard>
    </div>
  );
};

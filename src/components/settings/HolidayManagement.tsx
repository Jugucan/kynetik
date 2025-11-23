import { useState, useEffect, useRef } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Calendar as CalendarIcon, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ca } from "date-fns/locale";
import { DateWithReason } from "@/utils/dateHelpers";

interface HolidayManagementProps {
  workYear: { start: Date; end: Date };
  officialHolidays: DateWithReason[];
  onRegenerateHolidays: () => void;
  onRemoveHoliday: (date: Date) => void;
  onEditHolidayReason: (date: Date, reason: string) => void;
}

const HolidayReasonInput = ({ 
  date, 
  reason, 
  onEditHolidayReason 
}: { 
  date: Date; 
  reason: string; 
  onEditHolidayReason: (date: Date, reason: string) => void;
}) => {
  const [currentReasonValue, setCurrentReasonValue] = useState(reason);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => { setCurrentReasonValue(reason); }, [reason]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newReason = e.target.value;
    setCurrentReasonValue(newReason);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => { 
      onEditHolidayReason(date, newReason); 
    }, 1000);
  };
  
  useEffect(() => { 
    return () => { 
      if (timeoutRef.current) clearTimeout(timeoutRef.current); 
    }; 
  }, []);

  return (
    <Input
      type="text"
      value={currentReasonValue}
      onChange={handleChange}
      placeholder="Nom del festiu"
      className="h-6 text-xs p-1 mt-1 shadow-neo-inset border-0 bg-transparent placeholder:text-accent-600/70"
    />
  );
};

export const HolidayManagement = ({
  workYear,
  officialHolidays,
  onRegenerateHolidays,
  onRemoveHoliday,
  onEditHolidayReason,
}: HolidayManagementProps) => {
  return (
    <NeoCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-semibold">Festius oficials</h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRegenerateHolidays}
          className="shadow-neo hover:shadow-neo-sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Regenerar festius
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Període: {format(workYear.start, "dd/MM/yyyy")} - {format(workYear.end, "dd/MM/yyyy")} ({officialHolidays.length} festius)
      </p>
      
      {officialHolidays.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {officialHolidays.sort((a, b) => a.date.getTime() - b.date.getTime()).map((holiday) => (
            <div 
              key={holiday.date.getTime()} 
              className="flex flex-col p-3 rounded-xl shadow-neo-inset bg-accent-500/10"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-accent-700">
                  {format(holiday.date, "dd MMM yyyy", { locale: ca })}
                </span>
                <X 
                  className="h-3 w-3 ml-2 text-red-500 hover:text-red-700 cursor-pointer transition-colors"
                  onClick={() => onRemoveHoliday(holiday.date)}
                  title="Eliminar festiu"
                />
              </div>
              <HolidayReasonInput 
                date={holiday.date} 
                reason={holiday.reason}
                onEditHolidayReason={onEditHolidayReason}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          No hi ha festius configurats. Prem "Regenerar festius" per crear-los automàticament.
        </p>
      )}
    </NeoCard>
  );
};

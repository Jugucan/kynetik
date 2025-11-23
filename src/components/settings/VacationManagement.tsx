import { NeoCard } from "@/components/NeoCard";
import { Calendar as CalendarIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ca } from "date-fns/locale";
import { Center } from "@/hooks/useCenters";
import { DateWithReason } from "@/utils/dateHelpers";

interface VacationManagementProps {
  workYear: { start: Date; end: Date };
  activeCenters: Center[];
  vacationDates: DateWithReason[];
  usedDaysByCenter: Record<string, number>;
  isPopoverOpen: boolean;
  isEditingVacation: boolean;
  isSaving: boolean;
  onDateSelect: (dates: Date[] | undefined) => void;
  onPopoverChange: (open: boolean) => void;
  getDatesOnly: (dates: DateWithReason[]) => Date[];
  renderDateList: (dates: DateWithReason[]) => React.ReactNode;
}

export const VacationManagement = ({
  workYear,
  activeCenters,
  vacationDates,
  usedDaysByCenter,
  isPopoverOpen,
  isEditingVacation,
  isSaving,
  onDateSelect,
  onPopoverChange,
  getDatesOnly,
  renderDateList,
}: VacationManagementProps) => {
  return (
    <NeoCard>
      <div className="flex items-center gap-2 mb-4">
        <CalendarIcon className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Dies de vacances generals</h2>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Període laboral: {format(workYear.start, "dd/MM/yyyy")} - {format(workYear.end, "dd/MM/yyyy")}
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {activeCenters.map(center => (
          <div key={center.id} className="p-3 rounded-lg shadow-neo-inset">
            <h4 className="font-medium">{center.name}</h4>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">Disponibles:</span>
              <span className="font-bold">{center.availableVacationDays}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Utilitzats:</span>
              <span className="font-bold text-primary">{usedDaysByCenter[center.id] || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Restants:</span>
              <span className={`font-bold ${(center.availableVacationDays - (usedDaysByCenter[center.id] || 0)) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                {center.availableVacationDays - (usedDaysByCenter[center.id] || 0)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Label>Seleccionar període de vacances generals</Label>
        <Popover 
          open={isPopoverOpen && isEditingVacation} 
          onOpenChange={onPopoverChange}
        >
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start" disabled={isSaving}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              Afegir vacances
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Selecciona les dates. Prem "Tancar" quan acabis.</p>
              <Calendar
                mode="multiple"
                selected={getDatesOnly(vacationDates)}
                onSelect={onDateSelect}
                locale={ca}
                className="rounded-md border shadow-neo"
              />
              <Button onClick={() => onPopoverChange(false)} className="w-full" size="sm">
                Tancar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        {renderDateList(vacationDates)}
      </div>
    </NeoCard>
  );
};

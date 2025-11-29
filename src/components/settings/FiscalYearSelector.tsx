import { NeoCard } from "@/components/NeoCard";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FiscalYearSelectorProps {
  selectedFiscalYear: number;
  availableFiscalYears: number[];
  onYearChange: (year: number) => void;
}

export const FiscalYearSelector = ({ 
  selectedFiscalYear, 
  availableFiscalYears, 
  onYearChange 
}: FiscalYearSelectorProps) => {
  return (
    <NeoCard className="p-4 bg-gray-50 border-gray-200 min-w-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 min-w-0">
        <Label htmlFor="fiscal-year-select" className="whitespace-nowrap font-semibold text-base sm:text-lg flex-shrink-0">
          Any Fiscal (Feb-Gen)
        </Label>
        <Select 
          value={String(selectedFiscalYear)} 
          onValueChange={(value) => onYearChange(Number(value))}
        >
          <SelectTrigger id="fiscal-year-select" className="w-full sm:w-[180px] shadow-neo-inset border-0">
            <SelectValue placeholder="Selecciona any" />
          </SelectTrigger>
          <SelectContent>
            {availableFiscalYears.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year} - {year + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        Mostrant dades des de l'1 de Febrer de <strong>{selectedFiscalYear}</strong> fins al 31 de Gener de <strong>{selectedFiscalYear + 1}</strong>.
      </p>
    </NeoCard>
  );
};

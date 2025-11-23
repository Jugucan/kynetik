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
    <NeoCard className="p-4 bg-gray-50 border-gray-200">
      <div className="flex items-center space-x-4">
        <Label htmlFor="fiscal-year-select" className="whitespace-nowrap font-semibold text-lg">
          Any Fiscal (Feb-Gen)
        </Label>
        <Select 
          value={String(selectedFiscalYear)} 
          onValueChange={(value) => onYearChange(Number(value))}
        >
          <SelectTrigger id="fiscal-year-select" className="w-[180px] shadow-neo">
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

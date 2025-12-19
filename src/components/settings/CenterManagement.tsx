import { useState } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Building2, Plus, Save, Power, PowerOff, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ca } from "date-fns/locale";
import { Center, LocalHoliday, YearlyConfig } from "@/hooks/useCenters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DateWithReason } from "@/utils/dateHelpers";

interface CenterManagementProps {
  centers: Center[];
  closuresByCenter: Record<string, DateWithReason[]>;
  usedDaysByCenter: Record<string, number>;
  expandedCenters: Record<string, boolean>;
  currentEditingCenter: string | null;
  isPopoverOpen: boolean;
  isSaving: boolean;
  selectedFiscalYear: number; // 🆕 Any fiscal seleccionat
  onAddCenter: (center: Omit<Center, 'id' | 'createdAt'>) => Promise<void>;
  onDeactivateCenter: (centerId: string) => Promise<void>;
  onReactivateCenter: (centerId: string) => Promise<void>;
  onDeleteCenter: (centerId: string) => Promise<void>;
  onUpdateCenter: (centerId: string, updates: Partial<Center>) => Promise<void>;
  onUpdateCenterYearlyConfig: (centerId: string, fiscalYear: number, config: YearlyConfig) => Promise<void>; // 🆕
  onToggleExpanded: (centerId: string) => void;
  onDateSelect: (dates: Date[] | undefined, centerId: string) => void;
  onPopoverChange: (open: boolean, centerId: string | null) => void;
  getDatesOnly: (dates: DateWithReason[]) => Date[];
  renderDateList: (dates: DateWithReason[], centerId: string) => React.ReactNode;
  getCenterConfig: (centerId: string, fiscalYear: number) => YearlyConfig; // 🆕
}

export const CenterManagement = ({
  centers,
  closuresByCenter,
  usedDaysByCenter,
  expandedCenters,
  currentEditingCenter,
  isPopoverOpen,
  isSaving,
  selectedFiscalYear, // 🆕
  onAddCenter,
  onDeactivateCenter,
  onReactivateCenter,
  onDeleteCenter,
  onUpdateCenter,
  onUpdateCenterYearlyConfig, // 🆕
  onToggleExpanded,
  onDateSelect,
  onPopoverChange,
  getDatesOnly,
  renderDateList,
  getCenterConfig, // 🆕
}: CenterManagementProps) => {
  const [showAddCenter, setShowAddCenter] = useState(false);
  const [newCenterName, setNewCenterName] = useState('');
  const [newCenterWorkDays, setNewCenterWorkDays] = useState<number[]>([]);
  const [newCenterVacationDays, setNewCenterVacationDays] = useState(20);
  const [centerToDeactivate, setCenterToDeactivate] = useState<Center | null>(null);
  const [centerToDelete, setCenterToDelete] = useState<Center | null>(null);

  const dayNamesList = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte", "Diumenge"];

  const handleAddCenter = async () => {
    if (!newCenterName.trim()) return;
    
    await onAddCenter({
      name: newCenterName.trim(),
      isActive: true,
      localHolidays: [],
      defaultConfig: {
        workDays: newCenterWorkDays,
        availableVacationDays: newCenterVacationDays,
      },
      yearlyConfigs: {},
    });
    
    setNewCenterName('');
    setNewCenterWorkDays([]);
    setNewCenterVacationDays(20);
    setShowAddCenter(false);
  };

  const handleDeactivate = async () => {
    if (!centerToDeactivate) return;
    await onDeactivateCenter(centerToDeactivate.id);
    setCenterToDeactivate(null);
  };

  const handleDelete = async () => {
    if (!centerToDelete) return;
    await onDeleteCenter(centerToDelete.id);
    setCenterToDelete(null);
  };

  // 🆕 Gestionar canvis en dies laborables per l'any actual
  const handleWorkDaysChange = async (centerId: string, newWorkDays: number[]) => {
    await onUpdateCenterYearlyConfig(centerId, selectedFiscalYear, {
      ...getCenterConfig(centerId, selectedFiscalYear),
      workDays: newWorkDays,
    });
  };

  // 🆕 Gestionar canvis en dies de vacances per l'any actual
  const handleVacationDaysChange = async (centerId: string, newVacationDays: number) => {
    await onUpdateCenterYearlyConfig(centerId, selectedFiscalYear, {
      ...getCenterConfig(centerId, selectedFiscalYear),
      availableVacationDays: newVacationDays,
    });
  };

  return (
    <>
      <NeoCard className="min-w-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Centres</h2>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddCenter(!showAddCenter)}
            className="shadow-neo hover:shadow-neo-sm w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Afegir centre
          </Button>
        </div>

        {showAddCenter && (
          <div className="p-4 mb-4 rounded-xl shadow-neo-inset bg-green-50 min-w-0">
            <h3 className="font-semibold mb-3">Nou centre</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-center-name">Nom del centre</Label>
                <Input
                  id="new-center-name"
                  value={newCenterName}
                  onChange={(e) => setNewCenterName(e.target.value)}
                  placeholder="Ex: Girona"
                  className="mt-1 shadow-neo-inset border-0"
                />
              </div>
              <div>
                <Label>Dies laborables</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {dayNamesList.map((name, index) => {
                    const dayIndex = index + 1;
                    return (
                      <label key={dayIndex} className="flex items-center gap-1 cursor-pointer text-sm">
                        <input 
                          type="checkbox" 
                          checked={newCenterWorkDays.includes(dayIndex)} 
                          onChange={() => {
                            setNewCenterWorkDays(prev => 
                              prev.includes(dayIndex) 
                                ? prev.filter(d => d !== dayIndex)
                                : [...prev, dayIndex].sort((a, b) => a - b)
                            );
                          }}
                          className="rounded" 
                        />
                        <span>{name.slice(0, 3)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label htmlFor="new-center-vacation">Dies de vacances disponibles</Label>
                <Input
                  id="new-center-vacation"
                  type="number"
                  value={newCenterVacationDays}
                  onChange={(e) => setNewCenterVacationDays(parseInt(e.target.value) || 0)}
                  className="mt-1 shadow-neo-inset border-0 w-24"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button onClick={handleAddCenter} disabled={!newCenterName.trim()} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  Crear centre
                </Button>
                <Button variant="outline" onClick={() => setShowAddCenter(false)} className="w-full sm:w-auto">
                  Cancel·lar
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 w-full">
          {centers.map((center) => {
            // 🆕 Obtenir configuració per l'any seleccionat
            const config = getCenterConfig(center.id, selectedFiscalYear);
            
            return (
              <div 
                key={center.id} 
                className={`p-3 sm:p-4 rounded-xl shadow-neo ${center.isActive ? 'bg-white' : 'bg-gray-100 opacity-75'} min-w-0`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    {center.isActive && (
                      <button
                        onClick={() => onToggleExpanded(center.id)}
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        {expandedCenters[center.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{center.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {center.isActive ? (
                          <>Dies: {config.workDays.map(d => dayNamesList[d-1]?.slice(0,2)).join(', ')} • {config.availableVacationDays} dies vacances</>
                        ) : (
                          <span className="text-orange-600">Desactivat el {center.deactivatedAt}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    {center.isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCenterToDeactivate(center);
                        }}
                        className="text-orange-600 hover:text-orange-700 w-full sm:w-auto"
                      >
                        <PowerOff className="h-4 w-4 mr-1" />
                        Desactivar
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReactivateCenter(center.id);
                          }}
                          className="text-green-600 hover:text-green-700 w-full sm:w-auto"
                        >
                          <Power className="h-4 w-4 mr-1" />
                          Reactivar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCenterToDelete(center);
                          }}
                          className="text-red-600 hover:text-red-700 w-full sm:w-auto"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {expandedCenters[center.id] && center.isActive && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {/* 🆕 Avís sobre configuració per any */}
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>📅 Configuració per l'any {selectedFiscalYear}-{selectedFiscalYear + 1}</strong>
                        <br />
                        Els canvis que facis aquí només afectaran aquest any fiscal.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      <div>
                        <Label>Dies laborables</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {dayNamesList.map((name, index) => {
                            const dayIndex = index + 1;
                            return (
                              <label key={dayIndex} className="flex items-center gap-1 cursor-pointer text-sm">
                                <input 
                                  type="checkbox" 
                                  checked={config.workDays.includes(dayIndex)} 
                                  onChange={() => {
                                    const currentDays = config.workDays;
                                    const newDays = currentDays.includes(dayIndex)
                                      ? currentDays.filter(d => d !== dayIndex)
                                      : [...currentDays, dayIndex].sort((a, b) => a - b);
                                    handleWorkDaysChange(center.id, newDays);
                                  }}
                                  className="rounded" 
                                />
                                <span>{name.slice(0, 3)}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <Label>Dies vacances disponibles</Label>
                        <Input
                          type="number"
                          value={config.availableVacationDays}
                          onChange={(e) => handleVacationDaysChange(center.id, parseInt(e.target.value) || 0)}
                          className="mt-1 shadow-neo-inset border-0 w-24"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Utilitzats: {usedDaysByCenter[center.id] || 0} dies
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Dies de tancament</Label>
                      <Popover 
                        open={isPopoverOpen && currentEditingCenter === center.id} 
                        onOpenChange={(open) => onPopoverChange(open, center.id)}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start" disabled={isSaving}>
                            <Plus className="mr-2 h-4 w-4" />
                            Afegir dies de tancament
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3" align="start">
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">Selecciona les dates. Prem "Tancar" quan acabis.</p>
                            <Calendar
                              mode="multiple"
                              selected={getDatesOnly(closuresByCenter[center.id] || [])}
                              onSelect={(dates) => onDateSelect(dates, center.id)}
                              locale={ca}
                              className="rounded-md border shadow-neo"
                            />
                            <Button onClick={() => onPopoverChange(false, null)} className="w-full" size="sm">
                              Tancar
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                      {renderDateList(closuresByCenter[center.id] || [], center.id)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </NeoCard>

      <AlertDialog open={!!centerToDeactivate} onOpenChange={() => setCenterToDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar centre "{centerToDeactivate?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              El centre es desactivarà però <strong>totes les dades històriques es conservaran</strong>.
              No podràs afegir noves vacances ni tancaments a aquest centre mentre estigui desactivat.
              Podràs reactivar-lo en qualsevol moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-orange-600 hover:bg-orange-700">
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!centerToDelete} onOpenChange={() => setCenterToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Eliminar centre "{centerToDelete?.name}" permanentment?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p><strong className="text-red-600">Aquesta acció NO es pot desfer!</strong></p>
              <p>S'eliminarà el centre i totes les seves configuracions.</p>
              <p>Les dades històriques es mantindran a la base de dades.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar permanentment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

import { useState, useMemo } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Clock, Plus, Copy, Save, Trash2, Calendar as CalendarIcon, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSchedules, Schedule, ScheduleSession, CenterType } from "@/hooks/useSchedules";
import { programColors } from "@/lib/programColors";

const Schedules = () => {
  const { schedules, loading, saveSchedules, getActiveSchedule, createNewSchedule, deactivateSchedule } = useSchedules();
  
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const activeSchedule = useMemo(() => getActiveSchedule(), [schedules]);
  const inactiveSchedules = useMemo(() => schedules.filter(s => !s.isActive).sort((a, b) => b.startDate.localeCompare(a.startDate)), [schedules]);

  const dayNames = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte", "Diumenge"];

  const handleCreateNew = (copyFromActive: boolean = false) => {
    const newSchedule = createNewSchedule(copyFromActive && activeSchedule ? activeSchedule : undefined);
    setEditingSchedule(newSchedule);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule({ ...schedule });
  };

  const handleSaveSchedule = async () => {
    if (!editingSchedule) return;

    setIsSaving(true);

    // Si és un horari nou (no existeix a la llista)
    const existingIndex = schedules.findIndex(s => s.id === editingSchedule.id);
    let updatedSchedules: Schedule[];

    if (existingIndex === -1) {
      // Horari nou: afegir a la llista
      updatedSchedules = [...schedules, editingSchedule];
    } else {
      // Horari existent: actualitzar
      updatedSchedules = schedules.map(s => s.id === editingSchedule.id ? editingSchedule : s);
    }

    await saveSchedules(updatedSchedules);
    setEditingSchedule(null);
    setIsSaving(false);
  };

  const handleActivateSchedule = async (scheduleId: string) => {
    // Desactivar l'horari actual
    if (activeSchedule) {
      deactivateSchedule(activeSchedule.id);
    }

    // Activar el nou horari
    const updatedSchedules = schedules.map(s =>
      s.id === scheduleId ? { ...s, isActive: true, endDate: null } : s
    );

    await saveSchedules(updatedSchedules);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Estàs segur que vols eliminar aquest horari?")) return;
    
    const updatedSchedules = schedules.filter(s => s.id !== scheduleId);
    await saveSchedules(updatedSchedules);
  };

  const handleAddSession = (dayIndex: number) => {
    if (!editingSchedule) return;

    const newSession: ScheduleSession = {
      time: "09:00",
      program: "BP",
      center: "Arbucies",
    };

    const updatedSessions = {
      ...editingSchedule.sessions,
      [dayIndex]: [...(editingSchedule.sessions[dayIndex] || []), newSession],
    };

    setEditingSchedule({ ...editingSchedule, sessions: updatedSessions });
  };

  const handleUpdateSession = (dayIndex: number, sessionIndex: number, field: keyof ScheduleSession, value: string) => {
    if (!editingSchedule) return;

    const daySessions = [...(editingSchedule.sessions[dayIndex] || [])];
    daySessions[sessionIndex] = { ...daySessions[sessionIndex], [field]: value };

    const updatedSessions = {
      ...editingSchedule.sessions,
      [dayIndex]: daySessions,
    };

    setEditingSchedule({ ...editingSchedule, sessions: updatedSessions });
  };

  const handleRemoveSession = (dayIndex: number, sessionIndex: number) => {
    if (!editingSchedule) return;

    const daySessions = [...(editingSchedule.sessions[dayIndex] || [])];
    daySessions.splice(sessionIndex, 1);

    const updatedSessions = {
      ...editingSchedule.sessions,
      [dayIndex]: daySessions.length > 0 ? daySessions : undefined,
    };

    // Eliminar la clau si no hi ha sessions
    if (!daySessions.length) {
      delete updatedSessions[dayIndex];
    }

    setEditingSchedule({ ...editingSchedule, sessions: updatedSessions });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Carregant horaris...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Horaris</h1>
          <p className="text-muted-foreground">Gestiona els horaris de sessions dels centres</p>
        </div>
      </div>

      {/* Horari actiu */}
      <NeoCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Horari actiu</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCreateNew(false)}
              className="shadow-neo hover:shadow-neo-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear nou
            </Button>
            {activeSchedule && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateNew(true)}
                className="shadow-neo hover:shadow-neo-sm"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar actiu
              </Button>
            )}
          </div>
        </div>

        {activeSchedule ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl shadow-neo-inset bg-green-500/10">
              <div>
                <p className="font-semibold text-green-700">{activeSchedule.name || "Horari actiu"}</p>
                <p className="text-sm text-muted-foreground">
                  Des del {new Date(activeSchedule.startDate).toLocaleDateString("ca-ES")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditSchedule(activeSchedule)}
                className="shadow-neo hover:shadow-neo-sm"
              >
                Editar
              </Button>
            </div>

            {/* Mostrar sessions de l'horari actiu */}
            <div className="grid gap-3">
              {dayNames.map((dayName, idx) => {
                const dayIndex = idx + 1;
                const daySessions = activeSchedule.sessions[dayIndex] || [];
                
                if (daySessions.length === 0) return null;

                return (
                  <div key={dayIndex} className="p-3 rounded-xl shadow-neo-inset">
                    <p className="font-semibold mb-2">{dayName}</p>
                    <div className="flex flex-wrap gap-2">
                      {daySessions.map((session, sIdx) => (
                        <div
                          key={sIdx}
                          className={`px-3 py-1 rounded-lg ${programColors[session.program as keyof typeof programColors]?.color || 'bg-gray-500'} text-white text-sm font-medium`}
                        >
                          {session.time} - {session.program} ({session.center})
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No hi ha cap horari actiu</p>
            <Button onClick={() => handleCreateNew(false)} className="shadow-neo hover:shadow-neo-sm">
              <Plus className="h-4 w-4 mr-2" />
              Crear primer horari
            </Button>
          </div>
        )}
      </NeoCard>

      {/* Editor d'horari */}
      {editingSchedule && (
        <NeoCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {schedules.find(s => s.id === editingSchedule.id) ? "Editar horari" : "Nou horari"}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingSchedule(null)}
                className="shadow-neo hover:shadow-neo-sm"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel·lar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSchedule}
                disabled={isSaving}
                className="shadow-neo hover:shadow-neo-sm"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Desar
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="schedule-name">Nom de l'horari</Label>
                <Input
                  id="schedule-name"
                  value={editingSchedule.name || ""}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, name: e.target.value })}
                  placeholder="Ex: Horari hivern 2025"
                  className="shadow-neo-inset border-0 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="schedule-start">Data d'inici</Label>
                <Input
                  id="schedule-start"
                  type="date"
                  value={editingSchedule.startDate}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, startDate: e.target.value })}
                  className="shadow-neo-inset border-0 mt-1"
                />
              </div>
            </div>

            {!editingSchedule.isActive && schedules.find(s => s.id === editingSchedule.id) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleActivateSchedule(editingSchedule.id)}
                className="shadow-neo hover:shadow-neo-sm"
              >
                <Check className="h-4 w-4 mr-2" />
                Activar aquest horari
              </Button>
            )}

            <hr className="my-4" />

            {/* Sessions per dia */}
            <div className="space-y-4">
              <h3 className="font-semibold">Sessions setmanals</h3>
              {dayNames.map((dayName, idx) => {
                const dayIndex = idx + 1;
                const daySessions = editingSchedule.sessions[dayIndex] || [];

                return (
                  <div key={dayIndex} className="p-4 rounded-xl shadow-neo-inset">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="font-semibold">{dayName}</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSession(dayIndex)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Afegir sessió
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {daySessions.map((session, sIdx) => (
                        <div key={sIdx} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-3">
                            <Input
                              type="time"
                              value={session.time}
                              onChange={(e) => handleUpdateSession(dayIndex, sIdx, 'time', e.target.value)}
                              className="shadow-neo-inset border-0 text-sm"
                            />
                          </div>
                          <div className="col-span-3">
                            <Select
                              value={session.program}
                              onValueChange={(value) => handleUpdateSession(dayIndex, sIdx, 'program', value)}
                            >
                              <SelectTrigger className="shadow-neo-inset border-0 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(programColors).map(([code, data]) => (
                                  <SelectItem key={code} value={code}>
                                    {code} - {data.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-5">
                            <Select
                              value={session.center}
                              onValueChange={(value) => handleUpdateSession(dayIndex, sIdx, 'center', value as CenterType)}
                            >
                              <SelectTrigger className="shadow-neo-inset border-0 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Arbucies">Arbúcies</SelectItem>
                                <SelectItem value="SantHilari">Sant Hilari</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSession(dayIndex, sIdx)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {daySessions.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No hi ha sessions aquest dia</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </NeoCard>
      )}

      {/* Historial d'horaris */}
      {inactiveSchedules.length > 0 && (
        <NeoCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Historial d'horaris</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? "Amagar" : "Mostrar"} ({inactiveSchedules.length})
            </Button>
          </div>

          {showHistory && (
            <div className="space-y-3">
              {inactiveSchedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-3 rounded-xl shadow-neo-inset">
                  <div>
                    <p className="font-medium">{schedule.name || "Horari"}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(schedule.startDate).toLocaleDateString("ca-ES")}
                      {schedule.endDate && ` - ${new Date(schedule.endDate).toLocaleDateString("ca-ES")}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSchedule(schedule)}
                      className="shadow-neo hover:shadow-neo-sm"
                    >
                      Veure
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </NeoCard>
      )}
    </div>
  );
};

export default Schedules;

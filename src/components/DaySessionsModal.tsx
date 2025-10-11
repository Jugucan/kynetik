import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { programColors, ProgramCode, Session } from "@/lib/programColors";
import { Textarea } from "@/components/ui/textarea";

interface DaySessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  sessions: Session[];
  onUpdateSessions: (date: Date, sessions: Session[]) => void;
  onDeleteSession?: (date: Date, sessionIndex: number, reason: string) => void;
}

export const DaySessionsModal = ({
  isOpen,
  onClose,
  date,
  sessions,
  onUpdateSessions,
  onDeleteSession,
}: DaySessionsModalProps) => {
  const [localSessions, setLocalSessions] = useState<Session[]>(sessions);
  const [deleteReason, setDeleteReason] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);

  const handleAddSession = () => {
    setLocalSessions([...localSessions, { time: "09:00", program: "BP" }]);
  };

  const handleRemoveSession = (index: number) => {
    setSessionToDelete(index);
  };

  const confirmDeleteSession = () => {
    if (sessionToDelete !== null && date && onDeleteSession) {
      onDeleteSession(date, sessionToDelete, deleteReason);
      const newSessions = localSessions.filter((_, i) => i !== sessionToDelete);
      setLocalSessions(newSessions);
      setSessionToDelete(null);
      setDeleteReason("");
    }
  };

  const cancelDelete = () => {
    setSessionToDelete(null);
    setDeleteReason("");
  };

  const handleUpdateSession = (
    index: number,
    field: "time" | "program",
    value: string
  ) => {
    const newSessions = [...localSessions];
    if (field === "time") {
      newSessions[index].time = value;
    } else {
      newSessions[index].program = value as ProgramCode;
    }
    setLocalSessions(newSessions);
  };

  const handleSave = () => {
    if (date) {
      onUpdateSessions(date, localSessions);
      onClose();
    }
  };

  if (!date) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Sessions del {date.toLocaleDateString("ca-ES", { day: "numeric", month: "long" })}
          </DialogTitle>
        </DialogHeader>

        {sessionToDelete !== null ? (
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="delete-reason">Motiu de la no assistència</Label>
              <Textarea
                id="delete-reason"
                placeholder="Escriu el motiu (malaltia, tancament anticipat, etc.)"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelDelete}>
                Cancel·lar
              </Button>
              <Button onClick={confirmDeleteSession} disabled={!deleteReason.trim()}>
                Confirmar eliminació
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {localSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hi ha sessions programades
                </p>
              ) : (
                localSessions.map((session, index) => (
                  <div key={index} className="flex items-end gap-3">
                    <div className="flex-1">
                      <Label htmlFor={`time-${index}`}>Hora</Label>
                      <Input
                        id={`time-${index}`}
                        type="time"
                        value={session.time}
                        onChange={(e) =>
                          handleUpdateSession(index, "time", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`program-${index}`}>Programa</Label>
                      <Select
                        value={session.program}
                        onValueChange={(value) =>
                          handleUpdateSession(index, "program", value)
                        }
                      >
                        <SelectTrigger id={`program-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(programColors).map(([code, data]) => (
                            <SelectItem key={code} value={code}>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-3 h-3 rounded-full ${data.color}`}
                                ></span>
                                {code} - {data.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSession(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}

              <Button
                variant="outline"
                onClick={handleAddSession}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Afegir sessió
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel·lar
              </Button>
              <Button onClick={handleSave}>Guardar</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

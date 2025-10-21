import { useState, useEffect } from "react";
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
import { Trash2, Plus, Save, Edit2, X } from "lucide-react";
import { programColors } from "@/lib/programColors";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

// 🎉 Definició actualitzada de Session amb centre i motiu
interface Session {
  time: string;
  program: string;
  center?: string;
  isCustom?: boolean; // Per saber si és una sessió modificada/afegida manualment
  originalIndex?: number; // Per rastrejar la sessió original
}

interface SessionChange {
  sessionIndex: number;
  reason: string;
  action: 'deleted' | 'modified' | 'added';
  originalSession?: Session;
  newSession?: Session;
}

interface DaySessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  sessions: Session[];
  onUpdateSessions: (date: Date, sessions: Session[]) => void;
  onDeleteSession?: (date: Date, sessionIndex: number, reason: string) => void;
}

const CUSTOM_SESSIONS_DOC = doc(db, 'settings', 'customSessions');
const SESSION_CHANGES_DOC = doc(db, 'settings', 'sessionChanges');

const dateToKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DaySessionsModal = ({
  isOpen,
  onClose,
  date,
  sessions,
  onUpdateSessions,
}: DaySessionsModalProps) => {
  const [localSessions, setLocalSessions] = useState<Session[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [modifyReason, setModifyReason] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
  const [sessionToModify, setSessionToModify] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar sessions quan s'obre el modal
  useEffect(() => {
    if (isOpen && sessions) {
      // Marcar les sessions originals amb el seu índex
      const sessionsWithIndex = sessions.map((s, idx) => ({
        ...s,
        originalIndex: idx,
        isCustom: s.isCustom || false,
      }));
      setLocalSessions(sessionsWithIndex);
    }
  }, [isOpen, sessions]);

  const handleAddSession = () => {
    const newSession: Session = {
      time: "09:00",
      program: "BP",
      center: "Arbucies",
      isCustom: true,
    };
    setLocalSessions([...localSessions, newSession]);
    setEditingIndex(localSessions.length);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setSessionToModify(index);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setSessionToModify(null);
    setModifyReason("");
  };

  const handleRemoveSession = (index: number) => {
    setSessionToDelete(index);
  };

  const confirmDeleteSession = async () => {
    if (sessionToDelete !== null && date) {
      const dateKey = dateToKey(date);
      const deletedSession = localSessions[sessionToDelete];
      
      // Guardar el canvi a Firebase
      try {
        const changesDoc = await getDoc(SESSION_CHANGES_DOC);
        const existingChanges = changesDoc.exists() ? changesDoc.data() : {};
        
        const dayChanges = existingChanges[dateKey] || [];
        dayChanges.push({
          sessionIndex: sessionToDelete,
          reason: deleteReason,
          action: 'deleted',
          originalSession: deletedSession,
          timestamp: new Date().toISOString(),
        });
        
        await setDoc(SESSION_CHANGES_DOC, {
          ...existingChanges,
          [dateKey]: dayChanges,
        }, { merge: true });
        
      } catch (error) {
        console.error("Error guardant canvi:", error);
      }
      
      // Eliminar la sessió localment
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
    field: "time" | "program" | "center",
    value: string
  ) => {
    const newSessions = [...localSessions];
    newSessions[index] = {
      ...newSessions[index],
      [field]: value,
      isCustom: true, // Marcar com modificada
    };
    setLocalSessions(newSessions);
  };

  const handleSave = async () => {
    if (!date) return;
    
    setIsSaving(true);
    const dateKey = dateToKey(date);
    
    try {
      // Si hi ha una sessió en procés de modificació, guardar el motiu
      if (sessionToModify !== null && modifyReason.trim()) {
        const changesDoc = await getDoc(SESSION_CHANGES_DOC);
        const existingChanges = changesDoc.exists() ? changesDoc.data() : {};
        
        const dayChanges = existingChanges[dateKey] || [];
        dayChanges.push({
          sessionIndex: sessionToModify,
          reason: modifyReason,
          action: 'modified',
          originalSession: sessions[sessionToModify],
          newSession: localSessions[sessionToModify],
          timestamp: new Date().toISOString(),
        });
        
        await setDoc(SESSION_CHANGES_DOC, {
          ...existingChanges,
          [dateKey]: dayChanges,
        }, { merge: true });
      }
      
      // Guardar les sessions personalitzades
      const customSessionsDoc = await getDoc(CUSTOM_SESSIONS_DOC);
      const existingCustomSessions = customSessionsDoc.exists() ? customSessionsDoc.data() : {};
      
      // Convertir sessions a format guardat
      const sessionsToSave = localSessions.map(s => ({
        time: s.time,
        program: s.program,
        center: s.center || 'Arbucies',
        isCustom: s.isCustom || false,
      }));
      
      await setDoc(CUSTOM_SESSIONS_DOC, {
        ...existingCustomSessions,
        [dateKey]: sessionsToSave,
      }, { merge: true });
      
      // Actualitzar al calendari
      onUpdateSessions(date, localSessions);
      
      // Tancar modal
      setEditingIndex(null);
      setSessionToModify(null);
      setModifyReason("");
      onClose();
      
    } catch (error) {
      console.error("Error guardant sessions:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!date) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Sessions del {date.toLocaleDateString("ca-ES", { 
              weekday: 'long',
              day: "numeric", 
              month: "long",
              year: "numeric"
            })}
          </DialogTitle>
        </DialogHeader>

        {/* Modal d'eliminació */}
        {sessionToDelete !== null ? (
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm font-medium mb-1">
                Sessió a eliminar: {localSessions[sessionToDelete]?.time} - {localSessions[sessionToDelete]?.program}
              </p>
              <p className="text-xs text-muted-foreground">
                Centre: {localSessions[sessionToDelete]?.center || 'N/A'}
              </p>
            </div>
            
            <div>
              <Label htmlFor="delete-reason">Motiu de la no assistència *</Label>
              <Textarea
                id="delete-reason"
                placeholder="Exemple: Malaltia, metge, tancament del centre..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelDelete}>
                Cancel·lar
              </Button>
              <Button 
                onClick={confirmDeleteSession} 
                disabled={!deleteReason.trim()}
                className="bg-red-500 hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar sessió
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {localSessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">
                    No hi ha sessions programades per aquest dia
                  </p>
                  <Button variant="outline" onClick={handleAddSession}>
                    <Plus className="w-4 h-4 mr-2" />
                    Afegir primera sessió
                  </Button>
                </div>
              ) : (
                localSessions.map((session, index) => (
                  <div key={index} className="p-3 rounded-lg shadow-neo-inset space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-3 h-3 rounded-full ${
                            programColors[session.program as keyof typeof programColors]?.color || 'bg-gray-500'
                          }`}
                        />
                        <span className="font-semibold">Sessió {index + 1}</span>
                        {session.isCustom && (
                          <span className="text-xs bg-blue-500/20 text-blue-700 px-2 py-0.5 rounded">
                            Modificada
                          </span>
                        )}
                      </div>
                      
                      {editingIndex !== index && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(index)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSession(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {editingIndex === index ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor={`time-${index}`}>Hora</Label>
                            <Input
                              id={`time-${index}`}
                              type="time"
                              value={session.time}
                              onChange={(e) =>
                                handleUpdateSession(index, "time", e.target.value)
                              }
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`program-${index}`}>Programa</Label>
                            <Select
                              value={session.program}
                              onValueChange={(value) =>
                                handleUpdateSession(index, "program", value)
                              }
                            >
                              <SelectTrigger id={`program-${index}`} className="mt-1">
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
                          
                          <div>
                            <Label htmlFor={`center-${index}`}>Centre</Label>
                            <Select
                              value={session.center || 'Arbucies'}
                              onValueChange={(value) =>
                                handleUpdateSession(index, "center", value)
                              }
                            >
                              <SelectTrigger id={`center-${index}`} className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Arbucies">Arbúcies</SelectItem>
                                <SelectItem value="SantHilari">Sant Hilari</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {!session.isCustom && sessionToModify === index && (
                          <div>
                            <Label htmlFor={`modify-reason-${index}`}>
                              Motiu del canvi (opcional)
                            </Label>
                            <Textarea
                              id={`modify-reason-${index}`}
                              placeholder="Exemple: Canvi d'última hora, substitució..."
                              value={modifyReason}
                              onChange={(e) => setModifyReason(e.target.value)}
                              className="mt-1"
                              rows={2}
                            />
                          </div>
                        )}
                        
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel·lar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Hora:</span>
                          <p className="font-medium">{session.time}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Programa:</span>
                          <p className="font-medium">{session.program}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Centre:</span>
                          <p className="font-medium">{session.center || 'N/A'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {localSessions.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleAddSession}
                  className="w-full shadow-neo hover:shadow-neo-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Afegir sessió addicional
                </Button>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel·lar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>Guardant...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar canvis
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

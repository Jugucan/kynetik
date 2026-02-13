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
import { Trash2, Plus, Save, Edit2, X, RotateCcw } from "lucide-react";
import { useProgramColors } from "@/hooks/useProgramColors";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Definició de Session amb estat d'eliminació
interface Session {
  time: string;
  program: string;
  center?: string;
  isCustom?: boolean;
  isDeleted?: boolean;
  deleteReason?: string;
  addReason?: string;
  originalIndex?: number;
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
  const { getProgramColor, getProgramName, getAllProgramColors } = useProgramColors();
  const [localSessions, setLocalSessions] = useState<Session[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [addReason, setAddReason] = useState("");
  const [modifyReason, setModifyReason] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
  const [sessionToModify, setSessionToModify] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar sessions quan s'obre el modal
  useEffect(() => {
    if (isOpen && sessions) {
      const sessionsWithIndex = sessions.map((s, idx) => ({
        ...s,
        originalIndex: idx,
        isCustom: s.isCustom || false,
        isDeleted: s.isDeleted || false,
      }));
      setLocalSessions(sessionsWithIndex);
    }
  }, [isOpen, sessions]);

  // Ordenar sessions per hora
  const sortSessionsByTime = (sessions: Session[]): Session[] => {
    return [...sessions].sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });
  };

  const handleAddSession = () => {
    setIsAddingNew(true);
    setAddReason("");
    const newSession: Session = {
      time: "09:00",
      program: "BP",
      center: "Arbucies",
      isCustom: true,
      isDeleted: false,
    };
    const newSessions = [...localSessions, newSession];
    setLocalSessions(newSessions);
    setEditingIndex(newSessions.length - 1);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setSessionToModify(index);
  };

  const handleCancelEdit = () => {
    // Si estava afegint una sessió nova, eliminar-la
    if (isAddingNew) {
      const newSessions = localSessions.slice(0, -1);
      setLocalSessions(newSessions);
      setIsAddingNew(false);
    }
    
    setEditingIndex(null);
    setSessionToModify(null);
    setModifyReason("");
    setAddReason("");
  };

  const handleRemoveSession = (index: number) => {
    setSessionToDelete(index);
  };

  const confirmDeleteSession = () => {
    if (sessionToDelete !== null) {
      // Marcar com eliminada en lloc de eliminar-la
      const newSessions = [...localSessions];
      newSessions[sessionToDelete] = {
        ...newSessions[sessionToDelete],
        isDeleted: true,
        deleteReason: deleteReason,
      };
      setLocalSessions(newSessions);
      setSessionToDelete(null);
      setDeleteReason("");
    }
  };

  const handleRestoreSession = (index: number) => {
    const newSessions = [...localSessions];
    newSessions[index] = {
      ...newSessions[index],
      isDeleted: false,
      deleteReason: undefined,
    };
    setLocalSessions(newSessions);
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
      isCustom: true,
    };
    setLocalSessions(newSessions);
  };

  const handleSave = async () => {
    if (!date) return;
    
    setIsSaving(true);
    const dateKey = dateToKey(date);
    
    try {
      // Guardar el motiu d'afegir si és una sessió nova
      if (isAddingNew && addReason.trim()) {
        const newSession = localSessions[localSessions.length - 1];
        newSession.addReason = addReason;
      }
      
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
      
      // Ordenar sessions per hora abans de guardar
      const sortedSessions = sortSessionsByTime(localSessions);
      
      // Guardar les sessions personalitzades
      const customSessionsDoc = await getDoc(CUSTOM_SESSIONS_DOC);
      const existingCustomSessions = customSessionsDoc.exists() ? customSessionsDoc.data() : {};
      
      // 🎉 NOU: Netejar valors undefined abans de guardar a Firebase
      const sessionsToSave = sortedSessions.map(s => {
        const cleanSession: any = {
          time: s.time,
          program: s.program,
          center: s.center || 'Arbucies',
          isCustom: s.isCustom || false,
          isDeleted: s.isDeleted || false,
        };
        
        // Només afegir camps opcionals si tenen valor
        if (s.deleteReason) cleanSession.deleteReason = s.deleteReason;
        if (s.addReason) cleanSession.addReason = s.addReason;
        
        return cleanSession;
      });
      
      await setDoc(CUSTOM_SESSIONS_DOC, {
        ...existingCustomSessions,
        [dateKey]: sessionsToSave,
      }, { merge: true });
      
      console.log("✅ Sessions guardades a Firebase per al dia:", dateKey);
      console.log("📊 Sessions guardades:", sessionsToSave);
      
      // Actualitzar al calendari
      onUpdateSessions(date, sortedSessions);
      
      // Tancar modal
      setEditingIndex(null);
      setSessionToModify(null);
      setModifyReason("");
      setAddReason("");
      setIsAddingNew(false);
      onClose();
      
    } catch (error) {
      console.error("Error guardant sessions:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!date) return null;

  const allProgramColors = getAllProgramColors();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
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
                Sessió a eliminar: {localSessions[sessionToDelete]?.time} - {getProgramName(localSessions[sessionToDelete]?.program)}
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
                localSessions.map((session, index) => {
                  const programColor = getProgramColor(session.program);
                  return (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg shadow-neo-inset space-y-3 transition-all ${
                        session.isDeleted ? 'opacity-50 bg-gray-100 dark:bg-gray-800' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ 
                              backgroundColor: session.isDeleted ? '#9ca3af' : programColor 
                            }}
                          />
                          <span className={`font-semibold ${session.isDeleted ? 'line-through' : ''}`}>
                            Sessió {index + 1}
                          </span>
                          {session.isDeleted && (
                            <span className="text-xs bg-red-500/20 text-red-700 px-2 py-0.5 rounded">
                              Eliminada
                            </span>
                          )}
                          {session.isCustom && !session.isDeleted && (
                            <span className="text-xs bg-blue-500/20 text-blue-700 px-2 py-0.5 rounded">
                              {session.addReason ? 'Afegida' : 'Modificada'}
                            </span>
                          )}
                        </div>
                        
                        {session.isDeleted ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestoreSession(index)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Recuperar
                          </Button>
                        ) : editingIndex !== index ? (
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
                        ) : null}
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
                                  {Object.entries(allProgramColors).map(([code, color]) => (
                                    <SelectItem key={code} value={code}>
                                      {code} - {getProgramName(code)}
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
                          
                          {/* Motiu per sessions noves */}
                          {isAddingNew && editingIndex === localSessions.length - 1 && (
                            <div>
                              <Label htmlFor="add-reason">
                                Motiu de la sessió extra (opcional)
                              </Label>
                              <Textarea
                                id="add-reason"
                                placeholder="Exemple: Substitució, recuperació de classe, hora extra..."
                                value={addReason}
                                onChange={(e) => setAddReason(e.target.value)}
                                className="mt-1"
                                rows={2}
                              />
                            </div>
                          )}
                          
                          {/* Motiu per modificacions */}
                          {!isAddingNew && !session.isCustom && sessionToModify === index && (
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
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Hora:</span>
                              <p className={`font-medium ${session.isDeleted ? 'line-through' : ''}`}>
                                {session.time}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Programa:</span>
                              <p className={`font-medium ${session.isDeleted ? 'line-through' : ''}`}>
                                {getProgramName(session.program)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Centre:</span>
                              <p className={`font-medium ${session.isDeleted ? 'line-through' : ''}`}>
                                {session.center || 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Mostrar motiu d'eliminació */}
                          {session.isDeleted && session.deleteReason && (
                            <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                              <p className="text-xs text-red-700">
                                <strong>Motiu:</strong> {session.deleteReason}
                              </p>
                            </div>
                          )}
                          
                          {/* Mostrar motiu d'afegir */}
                          {session.addReason && !session.isDeleted && (
                            <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs text-blue-700">
                                <strong>Motiu:</strong> {session.addReason}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {localSessions.length > 0 && !isAddingNew && (
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

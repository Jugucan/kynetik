import { useState } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Dumbbell, Plus, Star, Edit, Trash2, PlayCircle, History, X, Palette, Calendar, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrograms } from "@/hooks/usePrograms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const Programs = () => {
  const { 
    programs, 
    loading, 
    addProgram,
    updateProgramColor,
    toggleProgramActive,
    addSubprogram, 
    activateSubprogram, 
    updateTracks, 
    addTrack,
    deleteTrack,
    updateLaunches,
    deleteProgram, 
    deleteSubprogram,
    getActiveSubprogram 
  } = usePrograms();
  
  // Estats per els diàlegs
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [showAddSubprogram, setShowAddSubprogram] = useState(false);
  const [showEditTracks, setShowEditTracks] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSubprogramConfirm, setShowDeleteSubprogramConfirm] = useState(false);
  const [showEditColor, setShowEditColor] = useState(false);
  const [showSubprograms, setShowSubprograms] = useState(false);
  
  // Estats per formularis
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedSubprogramId, setSelectedSubprogramId] = useState<string>("");
  const [programForm, setProgramForm] = useState({ name: "", code: "", color: "#ef4444" });
  const [subprogramForm, setSubprogramForm] = useState({ name: "" });
  const [editingTracks, setEditingTracks] = useState<any[]>([]);
  const [editingColor, setEditingColor] = useState("#ef4444");
  const [editingLaunches, setEditingLaunches] = useState<any[]>([]);

  // Funció per afegir programa
  const handleAddProgram = async () => {
    if (!programForm.name || !programForm.code) {
      toast.error("Si us plau, omple tots els camps");
      return;
    }

    const result = await addProgram(programForm.name, programForm.code, programForm.color);
    
    if (result.success) {
      toast.success(`Programa ${programForm.name} creat correctament!`);
      setShowAddProgram(false);
      setProgramForm({ name: "", code: "", color: "#ef4444" });
    } else {
      toast.error("Error al crear el programa");
    }
  };

  // Funció per canviar el color
  const handleUpdateColor = async () => {
    const result = await updateProgramColor(selectedProgramId, editingColor);
    
    if (result.success) {
      toast.success("Color actualitzat correctament!");
      setShowEditColor(false);
    } else {
      toast.error("Error al actualitzar el color");
    }
  };

  // 🆕 Funció per activar/desactivar programa sencer
  const handleToggleProgramActive = async (programId: string, currentState: boolean) => {
    const result = await toggleProgramActive(programId, !currentState);
    
    if (result.success) {
      toast.success(currentState ? "Programa desactivat correctament!" : "Programa activat correctament!");
    } else {
      toast.error("Error al canviar l'estat del programa");
    }
  };

  // Funció per afegir subprograma
  const handleAddSubprogram = async () => {
    if (!subprogramForm.name || !selectedProgramId) {
      toast.error("Si us plau, omple tots els camps");
      return;
    }

    const result = await addSubprogram(selectedProgramId, subprogramForm.name);
    
    if (result.success) {
      toast.success(`Subprograma ${subprogramForm.name} creat correctament!`);
      setSubprogramForm({ name: "" });
    } else {
      toast.error("Error al crear el subprograma");
    }
  };

  // Funció per activar subprograma
  const handleActivateSubprogram = async (programId: string, subprogramId: string) => {
    const result = await activateSubprogram(programId, subprogramId);
    
    if (result.success) {
      toast.success("Subprograma activat correctament!");
    } else {
      toast.error("Error al activar el subprograma");
    }
  };

  // Funció per editar tracks
  const handleOpenEditTracks = (programId: string, subprogramId: string) => {
    const program = programs[programId];
    const subprogram = program.subprograms[subprogramId];
    
    setSelectedProgramId(programId);
    setSelectedSubprogramId(subprogramId);
    setEditingTracks([...subprogram.tracks]);
    setShowEditTracks(true);
  };

  // Funció per guardar tracks editats
  const handleSaveTracks = async () => {
    const result = await updateTracks(selectedProgramId, selectedSubprogramId, editingTracks);
    
    if (result.success) {
      toast.success("Tracks actualitzats correctament!");
      setShowEditTracks(false);
    } else {
      toast.error("Error al actualitzar els tracks");
    }
  };

  // Funció per actualitzar un track
  const updateTrack = (index: number, field: string, value: any) => {
    const updated = [...editingTracks];
    updated[index] = { ...updated[index], [field]: value };
    setEditingTracks(updated);
  };

  // Funció per afegir un nou track
  const handleAddTrack = () => {
    const newTrack = {
      id: `track-${Date.now()}`,
      name: `Track ${editingTracks.length + 1}`,
      favorite: false,
      notes: '',
    };
    setEditingTracks([...editingTracks, newTrack]);
  };

  // Funció per eliminar un track
  const handleDeleteTrack = (index: number) => {
    const updated = editingTracks.filter((_, i) => i !== index);
    setEditingTracks(updated);
  };

  // Funció per obrir l'editor d'historial
  const handleOpenHistory = (programId: string, subprogramId: string) => {
    const program = programs[programId];
    const subprogram = program.subprograms[subprogramId];
    
    setSelectedProgramId(programId);
    setSelectedSubprogramId(subprogramId);
    setEditingLaunches([...subprogram.launches]);
    setShowHistory(true);
  };

  // Funció per afegir un nou llançament
  const handleAddLaunch = () => {
    const newLaunch = {
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
    };
    setEditingLaunches([...editingLaunches, newLaunch]);
  };

  // Funció per actualitzar un llançament
  const updateLaunch = (index: number, field: string, value: any) => {
    const updated = [...editingLaunches];
    updated[index] = { ...updated[index], [field]: value };
    setEditingLaunches(updated);
  };

  // Funció per eliminar un llançament
  const handleDeleteLaunch = (index: number) => {
    const updated = editingLaunches.filter((_, i) => i !== index);
    setEditingLaunches(updated);
  };

  // Funció per guardar l'historial editat
  const handleSaveLaunches = async () => {
    const result = await updateLaunches(selectedProgramId, selectedSubprogramId, editingLaunches);
    
    if (result.success) {
      toast.success("Historial actualitzat correctament!");
      setShowHistory(false);
    } else {
      toast.error("Error al actualitzar l'historial");
    }
  };

  // Funció per eliminar programa
  const handleDeleteProgram = async () => {
    const result = await deleteProgram(selectedProgramId);
    
    if (result.success) {
      toast.success("Programa eliminat correctament!");
      setShowDeleteConfirm(false);
      setSelectedProgramId("");
    } else {
      toast.error("Error al eliminar el programa");
    }
  };

  // Funció per eliminar subprograma
  const handleDeleteSubprogram = async () => {
    const result = await deleteSubprogram(selectedProgramId, selectedSubprogramId);
    
    if (result.success) {
      toast.success("Subprograma eliminat correctament!");
      setShowDeleteSubprogramConfirm(false);
      setSelectedProgramId("");
      setSelectedSubprogramId("");
    } else {
      toast.error("Error al eliminar el subprograma");
    }
  };

  // 🆕 Funció per obrir el modal de subprogrames
  const handleOpenSubprograms = (programId: string) => {
    setSelectedProgramId(programId);
    setShowSubprograms(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Dumbbell className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Carregant programes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Dumbbell className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Programes</h1>
            <p className="text-muted-foreground">Gestió dels programes i subprogrames</p>
          </div>
        </div>
        <Button onClick={() => setShowAddProgram(true)} className="shadow-neo hover:shadow-neo-sm gap-2">
          <Plus className="w-4 h-4" />
          Nou programa
        </Button>
      </div>

      {Object.keys(programs).length === 0 ? (
        <NeoCard className="text-center py-12">
          <Dumbbell className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Cap programa creat</h3>
          <p className="text-muted-foreground mb-4">Comença creant el teu primer programa</p>
          <Button onClick={() => setShowAddProgram(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear programa
          </Button>
        </NeoCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.values(programs).map((program) => {
            const { subprogram: activeSubprogram, days: activeDays } = getActiveSubprogram(program.id);
            const hasSubprograms = Object.keys(program.subprograms).length > 0;
            const isWholeActive = program.isActive && !hasSubprograms;
            const activeSinceDays = isWholeActive && program.activeSince 
              ? Math.floor((new Date().getTime() - new Date(program.activeSince).getTime()) / (1000 * 60 * 60 * 24))
              : 0;
            
            return (
              <NeoCard 
                key={program.id} 
                className="relative cursor-pointer hover:shadow-neo-lg transition-all"
                onClick={() => hasSubprograms && handleOpenSubprograms(program.id)}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div 
                    className="w-16 h-16 rounded-xl shadow-neo flex items-center justify-center text-white font-bold text-xl relative group"
                    style={{ backgroundColor: program.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProgramId(program.id);
                      setEditingColor(program.color);
                      setShowEditColor(true);
                    }}
                  >
                    {program.code}
                    <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Palette className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{program.name}</h3>
                    {hasSubprograms ? (
                      <>
                        {activeSubprogram ? (
                          <>
                            <p className="text-sm text-muted-foreground mb-2">
                              Subprograma actiu: <span className="text-primary font-medium">{activeSubprogram.name}</span>
                            </p>
                            <div className="inline-block px-3 py-1 rounded-full shadow-neo-inset text-sm">
                              {activeDays} dies actiu
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground mb-2">
                            {Object.keys(program.subprograms).length} subprogrames
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        {isWholeActive ? (
                          <>
                            <p className="text-sm text-primary font-medium mb-2">
                              Programa actiu
                            </p>
                            <div className="inline-block px-3 py-1 rounded-full shadow-neo-inset text-sm">
                              {activeSinceDays} dies actiu
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground mb-2">
                            Sense subprogrames
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProgramId(program.id);
                      setShowDeleteConfirm(true);
                    }}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Accions del programa */}
                <div className="flex gap-2 pt-3 border-t">
                  {hasSubprograms ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSubprograms(program.id);
                      }}
                    >
                      <Dumbbell className="w-3 h-3 mr-1" />
                      Gestionar subprogrames
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProgramId(program.id);
                          setShowAddSubprogram(true);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Afegir subprograma
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleProgramActive(program.id, isWholeActive);
                        }}
                        variant={isWholeActive ? "destructive" : "default"}
                      >
                        {isWholeActive ? (
                          <>
                            <PowerOff className="w-3 h-3 mr-1" />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <Power className="w-3 h-3 mr-1" />
                            Activar
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </NeoCard>
            );
          })}
        </div>
      )}

      {/* 🆕 Diàleg: Gestió de subprogrames */}
      <Dialog open={showSubprograms} onOpenChange={setShowSubprograms}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div 
                className="w-10 h-10 rounded-lg shadow-neo flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: selectedProgramId && programs[selectedProgramId]?.color }}
              >
                {selectedProgramId && programs[selectedProgramId]?.code}
              </div>
              Subprogrames de {selectedProgramId && programs[selectedProgramId]?.name}
            </DialogTitle>
            <DialogDescription>
              Gestiona els subprogrames d'aquest programa
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Subprogrames</h4>
              <Button
                size="sm"
                onClick={() => setShowAddSubprogram(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Afegir subprograma
              </Button>
            </div>

            {selectedProgramId && Object.keys(programs[selectedProgramId]?.subprograms || {}).length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground mb-2">Cap subprograma creat</p>
                <Button
                  size="sm"
                  onClick={() => setShowAddSubprogram(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Crear primer subprograma
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 max-h-[50vh] overflow-y-auto pr-2">
                {selectedProgramId && Object.values(programs[selectedProgramId]?.subprograms || {}).map((subprogram) => {
                  const isActive = getActiveSubprogram(selectedProgramId).subprogram?.id === subprogram.id;
                  const favoriteCount = subprogram.tracks.filter(t => t.favorite).length;
                  const activeDays = isActive ? getActiveSubprogram(selectedProgramId).days : 0;
                  
                  return (
                    <div
                      key={subprogram.id}
                      className={`p-4 rounded-lg border-2 ${
                        isActive ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-lg">{subprogram.name}</span>
                          {favoriteCount > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {favoriteCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <span className="text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground">
                              Actiu · {activeDays} dies
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-600"
                            onClick={() => {
                              setSelectedSubprogramId(subprogram.id);
                              setShowDeleteSubprogramConfirm(true);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditTracks(selectedProgramId, subprogram.id)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Tracks
                        </Button>
                        
                        {!isActive && (
                          <Button
                            size="sm"
                            onClick={() => handleActivateSubprogram(selectedProgramId, subprogram.id)}
                          >
                            <PlayCircle className="w-3 h-3 mr-1" />
                            Activar
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenHistory(selectedProgramId, subprogram.id)}
                        >
                          <History className="w-3 h-3 mr-1" />
                          Historial
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSubprograms(false)}>
              Tancar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diàleg: Afegir programa */}
      <Dialog open={showAddProgram} onOpenChange={setShowAddProgram}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nou programa</DialogTitle>
            <DialogDescription>
              Crea un nou programa d'entrenament
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="program-name">Nom del programa</Label>
              <Input
                id="program-name"
                placeholder="Ex: BodyPump"
                value={programForm.name}
                onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="program-code">Codi</Label>
              <Input
                id="program-code"
                placeholder="Ex: BP"
                value={programForm.code}
                onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Si el codi és BP, BC o BB, s'aplicarà una plantilla de tracks personalitzada
              </p>
            </div>
            
            <div>
              <Label htmlFor="program-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="program-color"
                  type="color"
                  value={programForm.color}
                  onChange={(e) => setProgramForm({ ...programForm, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={programForm.color}
                  onChange={(e) => setProgramForm({ ...programForm, color: e.target.value })}
                  placeholder="#ef4444"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProgram(false)}>
              Cancel·lar
            </Button>
            <Button onClick={handleAddProgram}>
              Crear programa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diàleg: Editar color del programa */}
      <Dialog open={showEditColor} onOpenChange={setShowEditColor}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Canviar color del programa</DialogTitle>
            <DialogDescription>
              Tria un nou color per {selectedProgramId && programs[selectedProgramId]?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-color"
                  type="color"
                  value={editingColor}
                  onChange={(e) => setEditingColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={editingColor}
                  onChange={(e) => setEditingColor(e.target.value)}
                  placeholder="#ef4444"
                />
              </div>
            </div>
            
            <div className="p-4 rounded-lg border-2 border-border">
              <p className="text-sm text-muted-foreground mb-2">Previsualització:</p>
              <div 
                className="w-16 h-16 rounded-xl shadow-neo flex items-center justify-center text-white font-bold text-xl mx-auto"
                style={{ backgroundColor: editingColor }}
              >
                {selectedProgramId && programs[selectedProgramId]?.code}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditColor(false)}>
              Cancel·lar
            </Button>
            <Button onClick={handleUpdateColor}>
              Guardar color
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diàleg: Afegir subprograma */}
      <Dialog open={showAddSubprogram} onOpenChange={setShowAddSubprogram}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nou subprograma</DialogTitle>
            <DialogDescription>
              Crea un nou subprograma amb tracks per defecte
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="subprogram-name">Nom del subprograma</Label>
              <Input
                id="subprogram-name"
                placeholder="Ex: BP 120"
                value={subprogramForm.name}
                onChange={(e) => setSubprogramForm({ ...subprogramForm, name: e.target.value })}
              />
              {selectedProgramId && programs[selectedProgramId] && (
                <p className="text-xs text-muted-foreground mt-1">
                  S'aplicarà la plantilla de tracks per {programs[selectedProgramId].code}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddSubprogram(false);
              setSubprogramForm({ name: "" });
            }}>
              Cancel·lar
            </Button>
            <Button onClick={handleAddSubprogram}>
              Crear subprograma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diàleg: Editar tracks */}
      <Dialog open={showEditTracks} onOpenChange={setShowEditTracks}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar tracks</DialogTitle>
            <DialogDescription>
              Personalitza els tracks del subprograma
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {editingTracks.map((track, index) => (
              <div key={track.id} className="p-4 border rounded-lg space-y-3 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 text-red-500 hover:text-red-600"
                  onClick={() => handleDeleteTrack(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={track.favorite}
                    onCheckedChange={(checked) => updateTrack(index, 'favorite', checked)}
                    id={`favorite-${index}`}
                  />
                  <Label htmlFor={`favorite-${index}`} className="flex items-center gap-2 cursor-pointer">
                    <Star className={`w-4 h-4 ${track.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                    Preferit
                  </Label>
                </div>
                
                <div>
                  <Label htmlFor={`track-name-${index}`}>Nom del track</Label>
                  <Input
                    id={`track-name-${index}`}
                    value={track.name}
                    onChange={(e) => updateTrack(index, 'name , e.target.value)}
                    placeholder={`Track ${index + 1}`}
                  />
                </div>
                
                <div>
                  <Label htmlFor={`track-notes-${index}`}>Notes</Label>
                  <Textarea
                    id={`track-notes-${index}`}
                    value={track.notes}
                    onChange={(e) => updateTrack(index, 'notes', e.target.value)}
                    placeholder="Ex: Material necessari, observacions..."
                    rows={2}
                  />
                </div>
              </div>
            ))}
            
            <Button
              variant="outline"
              onClick={handleAddTrack}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Afegir track
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditTracks(false)}>
              Cancel·lar
            </Button>
            <Button onClick={handleSaveTracks}>
              Guardar canvis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diàleg: Editar historial de llançaments */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de llançaments</DialogTitle>
            <DialogDescription>
              Gestiona l'historial de llançaments de {selectedProgramId && selectedSubprogramId && programs[selectedProgramId]?.subprograms[selectedSubprogramId]?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {editingLaunches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Cap llançament registrat. Afegeix el primer!
              </p>
            ) : (
              editingLaunches.map((launch, index) => {
                const startDate = launch.startDate ? new Date(launch.startDate) : null;
                const endDate = launch.endDate ? new Date(launch.endDate) : null;
                const days = startDate && endDate
                  ? Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                  : startDate
                  ? Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                
                return (
                  <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Llançament {index + 1}</span>
                      <div className="flex items-center gap-2">
                        {!launch.endDate && (
                          <span className="text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground">
                            Actiu
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteLaunch(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`launch-start-${index}`}>
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Data d'inici
                        </Label>
                        <Input
                          id={`launch-start-${index}`}
                          type="date"
                          value={launch.startDate}
                          onChange={(e) => updateLaunch(index, 'startDate', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`launch-end-${index}`}>
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Data final
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id={`launch-end-${index}`}
                            type="date"
                            value={launch.endDate || ''}
                            onChange={(e) => updateLaunch(index, 'endDate', e.target.value || null)}
                          />
                          {launch.endDate && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateLaunch(index, 'endDate', null)}
                              title="Marcar com actiu"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Deixa buit si està actiu
                        </p>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        <strong>Durada:</strong> {days} dies
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            
            <Button
              variant="outline"
              onClick={handleAddLaunch}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Afegir llançament
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistory(false)}>
              Cancel·lar
            </Button>
            <Button onClick={handleSaveLaunches}>
              Guardar canvis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diàleg: Confirmar eliminació programa */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
            <AlertDialogDescription>
              Aquesta acció no es pot desfer. S'eliminarà el programa i tots els seus subprogrames permanentment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProgram} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diàleg: Confirmar eliminació subprograma */}
      <AlertDialog open={showDeleteSubprogramConfirm} onOpenChange={setShowDeleteSubprogramConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar subprograma?</AlertDialogTitle>
            <AlertDialogDescription>
              Aquesta acció no es pot desfer. S'eliminarà el subprograma i tot el seu historial permanentment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubprogram} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Programs;

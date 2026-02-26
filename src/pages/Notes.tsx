import { useState, useEffect } from "react";
import { StickyNote, Plus, Search, Trash2, Edit2, Save, X, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";

import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ca } from "date-fns/locale";

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

const CATEGORIES = [
  { value: "general", label: "General", color: "bg-blue-500" },
  { value: "classes", label: "Classes", color: "bg-green-500" },
  { value: "users", label: "Usuaris", color: "bg-purple-500" },
  { value: "programs", label: "Programes", color: "bg-orange-500" },
  { value: "ideas", label: "Ideas", color: "bg-pink-500" },
  { value: "tasks", label: "Tasques", color: "bg-yellow-500" },
];

const Notes = () => {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  
  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar notes des de Firebase (lectura única)
  useEffect(() => {
    if (!currentUser) return;
    const fetchNotes = async () => {
      try {
        const q = query(
          collection(db, "notes"),
          where("userId", "==", currentUser.uid),
          orderBy("updatedAt", "desc")
        );
        const snapshot = await getDocs(q);
        const loadedNotes: Note[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            content: data.content,
            category: data.category,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            userId: data.userId,
          };
        });
        setNotes(loadedNotes);
      } catch (error) {
        console.error('Error carregant notes:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotes();
  }, [currentUser]);

  // Filtrar notes
  useEffect(() => {
    let filtered = notes;

    // Filtrar per categoria
    if (selectedCategory !== "all") {
      filtered = filtered.filter((note) => note.category === selectedCategory);
    }

    // Filtrar per cerca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(search) ||
          note.content.toLowerCase().includes(search)
      );
    }

    setFilteredNotes(filtered);
  }, [notes, searchTerm, selectedCategory]);

  const openCreateDialog = () => {
    setEditingNote(null);
    setFormTitle("");
    setFormContent("");
    setFormCategory("general");
    setIsDialogOpen(true);
  };

  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingNote(null);
    setFormTitle("");
    setFormContent("");
    setFormCategory("general");
  };

  const handleSaveNote = async () => {
    if (!currentUser) return;
    if (!formTitle.trim()) {
      toast.error("El títol és obligatori");
      return;
    }

    setIsSaving(true);

    try {
      const now = Timestamp.now();
      if (editingNote) {
        const noteRef = doc(db, "notes", editingNote.id);
        await updateDoc(noteRef, {
          title: formTitle,
          content: formContent,
          category: formCategory,
          updatedAt: now,
        });
        // Actualitzar estat local sense rellegir Firebase
        setNotes(prev => prev
          .map(n => n.id === editingNote.id
            ? { ...n, title: formTitle, content: formContent, category: formCategory, updatedAt: now.toDate() }
            : n
          )
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        );
        toast.success("Nota actualitzada!");
      } else {
        const docRef = await addDoc(collection(db, "notes"), {
          title: formTitle,
          content: formContent,
          category: formCategory,
          userId: currentUser.uid,
          createdAt: now,
          updatedAt: now,
        });
        // Afegir a estat local sense rellegir Firebase
        const newNote: Note = {
          id: docRef.id,
          title: formTitle,
          content: formContent,
          category: formCategory,
          userId: currentUser.uid,
          createdAt: now.toDate(),
          updatedAt: now.toDate(),
        };
        setNotes(prev => [newNote, ...prev]);
        toast.success("Nota creada!");
      }
      closeDialog();
      
    } catch (error) {
      console.error("Error al desar la nota:", error);
      toast.error("Error al desar la nota");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;

    try {
      await deleteDoc(doc(db, "notes", noteToDelete.id));
      setNotes(prev => prev.filter(n => n.id !== noteToDelete.id)); // ← afegir aquesta
      toast.success("Nota eliminada");
      setIsDeleteDialogOpen(false);
      setNoteToDelete(null);
    } catch (error) {
      console.error("Error al eliminar la nota:", error);
      toast.error("Error al eliminar la nota");
    }
  };

  const getCategoryInfo = (categoryValue: string) => {
    return CATEGORIES.find((c) => c.value === categoryValue) || CATEGORIES[0];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <StickyNote className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Les Meves Notes</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona les teves notes personals
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="shadow-neo hover:shadow-neo-sm">
          <Plus className="w-4 h-4 mr-2" />
          Nova Nota
        </Button>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cercador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cerca notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 shadow-neo border-0"
          />
        </div>

        {/* Selector de categoria */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="shadow-neo border-0">
            <SelectValue placeholder="Totes les categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Totes les categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                  {cat.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Llista de notes */}
      {filteredNotes.length === 0 ? (
        <Card className="p-12 text-center shadow-neo">
          <StickyNote className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No hi ha notes</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedCategory !== "all"
              ? "No s'han trobat notes amb aquests filtres"
              : "Comença creant la teva primera nota"}
          </p>
          {!searchTerm && selectedCategory === "all" && (
            <Button onClick={openCreateDialog} className="shadow-neo hover:shadow-neo-sm">
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Nota
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const categoryInfo = getCategoryInfo(note.category);
            return (
              <Card
                key={note.id}
                className="p-4 shadow-neo hover:shadow-neo-sm transition-shadow cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge className={`${categoryInfo.color} text-white`}>
                    {categoryInfo.label}
                  </Badge>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(note)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setNoteToDelete(note);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                  {note.title}
                </h3>

                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                  {note.content || "Sense contingut"}
                </p>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarIcon className="w-3 h-3" />
                  {format(note.updatedAt, "dd MMM yyyy, HH:mm", { locale: ca })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog Crear/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "Editar Nota" : "Nova Nota"}
            </DialogTitle>
            <DialogDescription>
              {editingNote
                ? "Modifica els camps i desa els canvis"
                : "Omple els camps per crear una nova nota"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Categoria */}
            <div>
              <label className="text-sm font-medium mb-2 block">Categoria</label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="shadow-neo border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Títol */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Títol <span className="text-destructive">*</span>
              </label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Títol de la nota"
                className="shadow-neo border-0"
              />
            </div>

            {/* Contingut */}
            <div>
              <label className="text-sm font-medium mb-2 block">Contingut</label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Escriu aquí el contingut de la teva nota..."
                className="shadow-neo border-0 min-h-[200px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} className="shadow-neo">
              <X className="w-4 h-4 mr-2" />
              Cancel·lar
            </Button>
            <Button onClick={handleSaveNote} disabled={isSaving} className="shadow-neo">
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {editingNote ? "Actualitzar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Nota</DialogTitle>
            <DialogDescription>
              Estàs segura que vols eliminar la nota "{noteToDelete?.title}"?
              Aquesta acció no es pot desfer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="shadow-neo"
            >
              Cancel·lar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteNote}
              className="shadow-neo"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notes;

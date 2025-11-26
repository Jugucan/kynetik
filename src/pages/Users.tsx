import { useState } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Users as UsersIcon, Search, Plus, Pencil, Trash2, Upload, Info, ChevronDown, ChevronUp, MapPin, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUsers, User } from "@/hooks/useUsers"; 
import { UserFormModal } from "@/components/UserFormModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { UserDetailModal } from "@/components/UserDetailModal";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const Users = () => {
  const { users, loading, addUser, updateUser, deleteUser } = useUsers();
  const [searchQuery, setSearchQuery] = useState("");
  const [centerFilter, setCenterFilter] = useState<string>("all"); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDeporsiteInstructions, setShowDeporsiteInstructions] = useState(false);

  const sortedUsers = [...users].sort((a, b) => 
    (a.name || '').localeCompare(b.name || '', 'ca', { sensitivity: 'base' })
  );

  const filteredUsers = sortedUsers.filter(user => {
    const matchesCenter = centerFilter === "all" || 
                          (user.center || '').toLowerCase() === centerFilter.toLowerCase();
    const matchesSearch = (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCenter && matchesSearch;
  });

  const handleSaveUser = async (userData: Omit<User, 'id'>) => {
    if (editingUser) {
      await updateUser(editingUser.id, userData);
    } else {
      await addUser(userData);
    }
    setEditingUser(null);
  };
  
  const handleViewUser = (user: User) => {
    setViewingUser(user);
  };
  
  const handleCloseViewModal = () => {
    setViewingUser(null);
  };

  const handleEditUser = (user: User) => {
    handleCloseViewModal(); 
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (id: string) => {
    await deleteUser(id);
    setDeletingUserId(null);
  };

  const handleAddNew = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleImportDeporsite = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    toast.info("Processant fitxer de Deporsite...");

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      if (!jsonData.users || !Array.isArray(jsonData.users)) {
        toast.error("Format de fitxer incorrecte");
        return;
      }

      const importedUsers = jsonData.users;
      let newCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const importedUser of importedUsers) {
        try {
          let existingUser = null;
          
          if (importedUser.email) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', importedUser.email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              existingUser = {
                id: querySnapshot.docs[0].id,
                ...querySnapshot.docs[0].data()
              } as User;
            }
          }
          
          if (!existingUser && importedUser.name) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('name', '==', importedUser.name));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              existingUser = {
                id: querySnapshot.docs[0].id,
                ...querySnapshot.docs[0].data()
              } as User;
            }
          }

          if (!importedUser.name) {
            skippedCount++;
            continue;
          }

          if (existingUser) {
            const mergedData: Partial<User> = {};
            
            mergedData.name = existingUser.name || importedUser.name;
            mergedData.email = existingUser.email || importedUser.email || '';
            mergedData.phone = existingUser.phone || importedUser.phone || '';
            mergedData.birthday = existingUser.birthday || importedUser.birthday || '';
            mergedData.center = existingUser.center || importedUser.center || 'Sant Hilari';
            
            if (importedUser.profileImageUrl && importedUser.profileImageUrl.includes('candelfi.deporsite.net')) {
              mergedData.profileImageUrl = importedUser.profileImageUrl;
              mergedData.avatar = importedUser.profileImageUrl;
            } else {
              mergedData.profileImageUrl = existingUser.profileImageUrl || importedUser.profileImageUrl || '';
              mergedData.avatar = existingUser.avatar || existingUser.profileImageUrl || importedUser.avatar || '';
            }
            
            const existingPrograms = Array.isArray(existingUser.preferredPrograms) ? existingUser.preferredPrograms : [];
            const importedPrograms = Array.isArray(importedUser.preferredPrograms) ? importedUser.preferredPrograms : [];
            mergedData.preferredPrograms = [...new Set([...existingPrograms, ...importedPrograms])];
            
            const existingNotes = existingUser.notes || '';
            const importedNotes = importedUser.notes || '';
            const notesToMerge = [existingNotes, importedNotes].filter(n => n && n.trim().length > 0);
            mergedData.notes = notesToMerge.join('\n\n---\n\n');
            
            const existingSessions = Array.isArray(existingUser.sessions) ? existingUser.sessions : [];
            const importedSessions = Array.isArray(importedUser.sessions) ? importedUser.sessions : [];
            
            const sessionMap = new Map();
            [...existingSessions, ...importedSessions].forEach(session => {
              const key = `${session.date}-${session.activity}-${session.time}`;
              sessionMap.set(key, session);
            });
            mergedData.sessions = Array.from(sessionMap.values());
            
            mergedData.totalSessions = mergedData.sessions.length;
            
            if (mergedData.sessions.length > 0) {
              const dates = mergedData.sessions.map(s => s.date).sort();
              mergedData.firstSession = dates[0];
              mergedData.lastSession = dates[dates.length - 1];
              
              const lastDate = new Date(mergedData.lastSession);
              const today = new Date();
              mergedData.daysSinceLastSession = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            }
            
            await updateUser(existingUser.id, mergedData);
            updatedCount++;
          } else {
            const userData: Omit<User, 'id'> = {
              name: importedUser.name || '',
              email: importedUser.email || '',
              phone: importedUser.phone || '',
              birthday: importedUser.birthday || '',
              age: importedUser.age || 0,
              center: importedUser.center || 'Sant Hilari',
              preferredPrograms: Array.isArray(importedUser.preferredPrograms) 
                ? importedUser.preferredPrograms 
                : [],
              profileImageUrl: importedUser.profileImageUrl || '',
              avatar: importedUser.profileImageUrl || importedUser.avatar || '',
              notes: importedUser.notes || '',
              
              sessions: Array.isArray(importedUser.sessions) ? importedUser.sessions : [],
              totalSessions: importedUser.totalSessions || 0,
              firstSession: importedUser.firstSession || '',
              lastSession: importedUser.lastSession || '',
              daysSinceLastSession: importedUser.daysSinceLastSession || 0
            };
            
            await addUser(userData);
            newCount++;
          }

        } catch (error) {
          console.error('Error processant usuari:', importedUser.name, error);
          skippedCount++;
        }
      }

      const messages = [];
      if (newCount > 0) messages.push(`${newCount} nous usuaris`);
      if (updatedCount > 0) messages.push(`${updatedCount} actualitzats`);
      if (skippedCount > 0) messages.push(`${skippedCount} omesos`);
      
      toast.success(`✅ Importació completada! ${messages.join(', ')}`);

    } catch (error) {
      console.error('Error llegint fitxer JSON:', error);
      toast.error('Error al processar el fitxer de Deporsite');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    toast.info("Processant fitxer Excel...");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let successCount = 0;
      let errorCount = 0;

      for (const row of jsonData as any[]) {
        try {
          const userData: Omit<User, 'id'> = {
            name: row['Nom Complet'] || row['Nom'] || '',
            center: row['Gimnàs'] || row['Gimnas'] || 'Arbúcies',
            birthday: row['Data Aniversari'] || row['Data'] || '',
            age: 0,
            preferredPrograms: row['Sessions Habituals'] ? 
              (typeof row['Sessions Habituals'] === 'string' ? 
                row['Sessions Habituals'].split(',').map((s: string) => s.trim()) : 
                [row['Sessions Habituals']]
              ) : [],
            phone: row['Telèfon'] || row['Telefon'] || '',
            email: row['Email'] || '',
            profileImageUrl: row['URL Foto Perfil'] || row['Foto'] || '',
            notes: row['Notes'] || '',
            avatar: row['URL Foto Perfil'] || row['Foto'] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row['Nom Complet'] || 'user'}`,
          };

          if (!userData.name) {
            console.warn('Fila sense nom, s\'omet');
            errorCount++;
            continue;
          }

          await addUser(userData);
          successCount++;
        } catch (error) {
          console.error('Error afegint usuari:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`✅ S'han importat ${successCount} usuaris correctament!`);
      }
      if (errorCount > 0) {
        toast.warning(`⚠️ ${errorCount} usuaris no s'han pogut importar`);
      }

    } catch (error) {
      console.error('Error llegint fitxer Excel:', error);
      toast.error('Error al processar el fitxer Excel');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <UsersIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Usuaris</h1>
            <p className="text-sm text-muted-foreground">Gestió dels teus alumnes</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <label htmlFor="deporsite-upload" className="flex-1 sm:flex-none">
            <Button 
              className="shadow-neo hover:shadow-neo-sm gap-2 w-full sm:w-auto bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white" 
              disabled={isImporting}
              asChild
            >
              <span className="cursor-pointer">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{isImporting ? "Important..." : "Importar Deporsite"}</span>
                <span className="sm:hidden">Deporsite</span>
              </span>
            </Button>
          </label>
          <input
            id="deporsite-upload"
            type="file"
            accept=".json"
            onChange={handleImportDeporsite}
            className="hidden"
          />

          <label htmlFor="excel-upload" className="flex-1 sm:flex-none">
            <Button 
              className="shadow-neo hover:shadow-neo-sm gap-2 w-full sm:w-auto" 
              variant="outline"
              disabled={isImporting}
              asChild
            >
              <span className="cursor-pointer">
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">{isImporting ? "Important..." : "Importar Excel"}</span>
                <span className="sm:hidden">Excel</span>
              </span>
            </Button>
          </label>
          <input
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportExcel}
            className="hidden"
          />

          <Button onClick={handleAddNew} className="shadow-neo hover:shadow-neo-sm gap-2 flex-1 sm:flex-none">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Afegir usuari</span>
            <span className="sm:hidden">Afegir</span>
          </Button>
        </div>
      </div>

      <Collapsible open={showDeporsiteInstructions} onOpenChange={setShowDeporsiteInstructions}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 p-2 h-auto"
          >
            <Info className="w-4 h-4" />
            <span className="text-sm">Com sincronitzar amb Deporsite</span>
            {showDeporsiteInstructions ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <NeoCard className="bg-red-50/50 mt-2">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-red-900 mb-2 text-sm sm:text-base">Pas a pas per sincronitzar</h3>
                <ol className="text-xs sm:text-sm text-red-700 space-y-2 list-decimal list-inside">
                  <li>Obre l'<strong>extensió de Chrome "Deporsite User Sync"</strong></li>
                  <li>Inicia sessió a <strong>candelfi.deporsite.net</strong></li>
                  <li>Clica l'extensió i tria les dates a sincronitzar</li>
                  <li>Descarrega el fitxer <strong>deporsite-users-XXXX.json</strong></li>
                  <li>Clica <strong>"Importar Deporsite"</strong> aquí dalt</li>
                  <li>Selecciona el fitxer JSON descarregat</li>
                </ol>
                <p className="text-xs text-red-600 mt-3 bg-red-100 p-2 rounded">
                  ✨ <strong>Màgia automàtica:</strong> Els usuaris nous es crearan, els existents s'actualitzaran amb totes les sessions, i el centre (Arbúcies/Sant Hilari) s'assignarà automàticament!
                </p>
              </div>
            </div>
          </NeoCard>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 h-auto"
          >
            <Info className="w-4 h-4" />
            <span className="text-sm">Com importar usuaris des d'Excel</span>
            {showInstructions ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <NeoCard className="bg-blue-50/50 mt-2">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">Format del fitxer Excel</h3>
                <p className="text-xs sm:text-sm text-blue-700 mb-2">
                  El teu fitxer Excel ha de tenir aquestes columnes:
                </p>
                <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                  <li><strong>Nom Complet</strong> (obligatori)</li>
                  <li><strong>Gimnàs</strong> (Arbúcies o Sant Hilari)</li>
                  <li><strong>Data Aniversari</strong> (DD/MM/YYYY)</li>
                  <li><strong>Sessions Habituals</strong> (separats per comes)</li>
                  <li><strong>Telèfon</strong></li>
                  <li><strong>Email</strong></li>
                  <li><strong>URL Foto Perfil</strong> (opcional)</li>
                  <li><strong>Notes</strong> (opcional)</li>
                </ul>
              </div>
            </div>
          </NeoCard>
        </CollapsibleContent>
      </Collapsible>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-1">
            <NeoCard className="h-full">
                <Select value={centerFilter} onValueChange={setCenterFilter}>
                    <SelectTrigger className="shadow-neo-inset border-0 text-sm sm:text-base h-10 sm:h-12">
                        <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Filtrar per centre" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tots els Centres</SelectItem>
                        <SelectItem value="Arbúcies">Arbúcies</SelectItem>
                        <SelectItem value="Sant Hilari">Sant Hilari</SelectItem>
                    </SelectContent>
                </Select>
            </NeoCard>
        </div>

        <div className="sm:col-span-2">
            <NeoCard className="h-full">
                <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <Input 
                    placeholder="Cercar per nom o email..." 
                    className="pl-9 sm:pl-10 shadow-neo-inset border-0 text-sm sm:text-base h-10 sm:h-12"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                </div>
            </NeoCard>
        </div>
      </div>

      {/* 🆕 TARGETES COMPACTES I MINIMALISTES */}
      <NeoCard className="overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregant usuaris...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No s'han trobat usuaris amb els filtres aplicats.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 w-full">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleViewUser(user)}
                className={`p-3 rounded-xl shadow-neo transition-all border-2 cursor-pointer hover:shadow-neo-lg hover:scale-105 flex flex-col items-center ${
                  user.center === "Arbúcies" 
                    ? "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20" 
                    : "bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
                }`}
              >
                {/* Foto de perfil */}
                <div className="mb-2">
                  <img 
                    src={user.profileImageUrl || user.avatar} 
                    alt={user.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-neo object-cover ring-2 ring-white"
                  />
                </div>
                
                {/* Nom */}
                <h3 className="font-semibold text-sm sm:text-base text-center line-clamp-2 mb-1 px-1">
                  {user.name}
                </h3>
                
                {/* Centre */}
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium shadow-neo-inset ${
                  user.center === "Arbúcies" 
                    ? "bg-blue-500/30 text-blue-700" 
                    : "bg-green-500/30 text-green-700"
                }`}>
                  {user.center}
                </span>
              </div>
            ))}
          </div>
        )}
      </NeoCard>

      <UserDetailModal
        user={viewingUser}
        isOpen={!!viewingUser}
        onClose={handleCloseViewModal}
        onEdit={handleEditUser}
        allUsers={users}
      />
      <UserFormModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
        user={editingUser}
      />
      <AlertDialog open={!!deletingUserId} onOpenChange={() => setDeletingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
            <AlertDialogDescription>
              Aquesta acció no es pot desfer. L'usuari s'eliminarà permanentment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingUserId && handleDeleteUser(deletingUserId)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;

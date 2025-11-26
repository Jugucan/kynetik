import { useState } from "react";
import { NeoCard } from "@/components/NeoCard"; 
import { Users as UsersIcon, Search, Plus, Upload, Info, ChevronDown, ChevronUp, MapPin, Download } from "lucide-react";
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
    // CANVI FETS AQUÍ: `px-4 sm:px-6` ha canviat a `px-2 sm:px-6`
    <div className="space-y-6 max-w-full overflow-x-hidden px-2 sm:px-6"> 
      {/* 🎯 Capçalera neta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UsersIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Usuaris</h1>
            <p className="text-sm text-muted-foreground">Gestió dels teus alumnes</p>
          </div>
        </div>
        
        {/* 🆕 Botó d'informació discret */}
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          title="Com importar usuaris"
        >
          <Info className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* 🆕 UN SOL desplegable per tota la info d'importació */}
      <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
        <CollapsibleContent>
          <div className="bg-blue-50/30 border border-blue-200/50 rounded-xl p-4 space-y-4">
            {/* Deporsite */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-red-600" />
                <h3 className="font-semibold text-sm">Importar des de Deporsite</h3>
              </div>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside ml-6">
                <li>Obre l'extensió de Chrome "Deporsite User Sync"</li>
                <li>Inicia sessió a candelfi.deporsite.net</li>
                <li>Tria les dates i descarrega el fitxer JSON</li>
                <li>Clica el botó de sota i selecciona el fitxer</li>
              </ol>
              <label htmlFor="deporsite-upload">
                <Button 
                  className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white" 
                  size="sm"
                  disabled={isImporting}
                  asChild
                >
                  <span className="cursor-pointer">
                    <Download className="w-4 h-4 mr-2" />
                    {isImporting ? "Important..." : "Importar Deporsite"}
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
            </div>

            <div className="border-t border-blue-200/50"></div>

            {/* Excel */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-green-600" />
                <h3 className="font-semibold text-sm">Importar des d'Excel</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Columnes necessàries: Nom Complet, Gimnàs, Data Aniversari, Sessions Habituals, Telèfon, Email
              </p>
              <label htmlFor="excel-upload">
                <Button 
                  size="sm"
                  variant="outline"
                  disabled={isImporting}
                  asChild
                >
                  <span className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    {isImporting ? "Important..." : "Importar Excel"}
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
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* 🎯 Filtres Neomòrfics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        <div className="sm:col-span-1 min-w-0">
          {/* Targeta Neomòrfica per al Select */}
          <NeoCard className="p-0"> 
            <Select value={centerFilter} onValueChange={setCenterFilter}>
              {/* Afegim classes per donar l'efecte "premsat" al Select */}
              <SelectTrigger className="border-0 h-auto p-3 focus:ring-0 shadow-inner-neumorphic"> 
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <SelectValue placeholder="Filtrar per centre" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots els Centres</SelectItem>
                <SelectItem value="Arbúcies">Arbúcies</SelectItem>
                <SelectItem value="Sant Hilari">Sant Hilari</SelectItem>
              </SelectContent>
            </Select>
          </NeoCard>
        </div>

        <div className="sm:col-span-2 min-w-0">
          {/* Targeta Neomòrfica per a la Cerca */}
          <NeoCard className="p-3"> 
            <div className="relative">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              {/* Afegim classes per donar l'efecte "premsat" a l'Input */}
              <Input 
                placeholder="Cercar per nom o email..." 
                className="pl-6 border-0 h-auto p-0 focus-visible:ring-0 text-sm shadow-inner-neumorphic-input" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </NeoCard>
        </div>
      </div>

      {/* 🎯 Grid d'usuaris Neomòrfic */}
      {/* Targeta Neomòrfica per al contenidor principal del Grid */}
      <NeoCard className="p-4"> 
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
                // Apliquem l'estil neomòrfic als elements individuals del grid
                className={`p-3 rounded-xl transition-all border-2 cursor-pointer hover:scale-105 flex flex-col items-center min-w-0 shadow-neumorphic-card ${ 
                  user.center === "Arbúcies" 
                    ? "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50" 
                    : "bg-green-500/10 border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50"
                }`}
              >
                <div className="mb-2 flex-shrink-0">
                  <img 
                    src={user.profileImageUrl || user.avatar} 
                    alt={user.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-2 ring-white"
                  />
                </div>
                
                <h3 className="font-semibold text-sm sm:text-base text-center line-clamp-2 mb-1 px-1 w-full break-words">
                  {user.name}
                </h3>
                
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
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

      {/* 🆕 BOTÓ FLOTANT per afegir usuaris */}
      <button
        onClick={handleAddNew}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-50 flex items-center justify-center"
        title="Afegir usuari"
      >
        <Plus className="w-6 h-6" />
      </button>

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

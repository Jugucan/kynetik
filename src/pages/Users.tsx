import { useState } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Users as UsersIcon, Search, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUsers, User } from "@/hooks/useUsers"; 
import { UserFormModal } from "@/components/UserFormModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

const Users = () => {
  const { users, loading, addUser, updateUser, deleteUser } = useUsers();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const filteredUsers = users.filter(user =>
    (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveUser = async (userData: Omit<User, 'id'>) => {
    if (editingUser) {
      await updateUser(editingUser.id, userData);
    } else {
      await addUser(userData);
    }
    setEditingUser(null);
  };

  const handleEditUser = (user: User) => {
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

  // 🆕 FUNCIÓ PER IMPORTAR USUARIS DES D'EXCEL (sense camp edat)
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
          // Mapejar les columnes de l'Excel als camps de l'usuari
          const userData: Omit<User, 'id'> = {
            name: row['Nom Complet'] || row['Nom'] || '',
            center: row['Gimnàs'] || row['Gimnas'] || 'Arbúcies',
            birthday: row['Data Aniversari'] || row['Data'] || '',
            age: 0, // 🆕 L'edat es calcularà automàticament al hook
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

          // Validar que almenys tingui nom
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UsersIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Usuaris</h1>
            <p className="text-muted-foreground">Gestió dels teus alumnes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <label htmlFor="excel-upload">
            <Button 
              className="shadow-neo hover:shadow-neo-sm gap-2" 
              variant="outline"
              disabled={isImporting}
              asChild
            >
              <span>
                <Upload className="w-4 h-4" />
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

          <Button onClick={handleAddNew} className="shadow-neo hover:shadow-neo-sm gap-2">
            <Plus className="w-4 h-4" />
            Afegir usuari
          </Button>
        </div>
      </div>

      {/* 🆕 INSTRUCCIONS ACTUALITZADES */}
      <NeoCard className="bg-blue-50/50">
        <div className="flex items-start gap-3">
          <Upload className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Com importar usuaris des d'Excel</h3>
            <p className="text-sm text-blue-700 mb-2">
              El teu fitxer Excel ha de tenir aquestes columnes (en aquest ordre o amb aquests noms):
            </p>
            <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
              <li><strong>Nom Complet</strong> (obligatori)</li>
              <li><strong>Gimnàs</strong> (Arbúcies o Sant Hilari)</li>
              <li><strong>Data Aniversari</strong> (format DD/MM/YYYY, ex: 15/03/1990) - L'edat es calcularà automàticament ✨</li>
              <li><strong>Sessions Habituals</strong> (separats per comes, ex: BP, BC, BB)</li>
              <li><strong>Telèfon</strong></li>
              <li><strong>Email</strong></li>
              <li><strong>URL Foto Perfil</strong> (opcional)</li>
              <li><strong>Notes</strong> (opcional)</li>
            </ul>
            <p className="text-xs text-blue-600 mt-2">
              💡 <strong>Important:</strong> Ja no cal la columna "Edat" a l'Excel, es calcularà automàticament des de la data de naixement!
            </p>
          </div>
        </div>
      </NeoCard>

      <NeoCard>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Buscar usuari..." 
            className="pl-10 shadow-neo-inset border-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregant usuaris...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "No s'han trobat usuaris" : "No hi ha usuaris. Afegeix-ne un!"}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`p-4 rounded-xl shadow-neo transition-all border-2 ${
                  user.center === "Arbúcies" 
                    ? "bg-blue-500/20 border-blue-500/30" 
                    : "bg-green-500/20 border-green-500/30"
                }`}
              >
                <div className="flex items-start gap-4">
                  <img 
                    src={user.profileImageUrl || user.avatar} 
                    alt={user.name}
                    className="w-16 h-16 rounded-full shadow-neo object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{user.name}</h3>
                        <p className="text-sm font-medium text-primary">{user.age} anys</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium shadow-neo-inset ${
                          user.center === "Arbúcies" 
                            ? "bg-blue-500/30 text-blue-700" 
                            : "bg-green-500/30 text-green-700"
                        }`}>
                          {user.center}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => setDeletingUserId(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                    
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <span className="text-muted-foreground">
                        🎂 {user.birthday}
                      </span>
                      <span className="text-muted-foreground">📞 {user.phone}</span>
                      
                      {user.preferredPrograms && user.preferredPrograms.length > 0 && (
                        <span className="font-semibold text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary-foreground shadow-neo-inset">
                          🏋️‍♀️ {user.preferredPrograms.join(', ')}
                        </span>
                      )}
                    </div>
                    
                    {user.notes && (
                      <p className="text-xs italic text-gray-500 mt-2 p-2 rounded-md bg-background/50 border shadow-neo-inset">
                        📝 <strong>Notes:</strong> {user.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </NeoCard>

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

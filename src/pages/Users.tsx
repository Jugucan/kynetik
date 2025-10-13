import { useState } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Users as UsersIcon, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Cal importar el nou User que ja inclou els camps extra
import { useUsers, User } from "@/hooks/useUsers"; 
import { UserFormModal } from "@/components/UserFormModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const Users = () => {
  const { users, loading, addUser, updateUser, deleteUser } = useUsers();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const filteredUsers = users.filter(user =>
    (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveUser = async (userData: Omit<User, 'id'>) => {
    if (editingUser) {
      // Passem l'ID a l'actualització
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
        <Button onClick={handleAddNew} className="shadow-neo hover:shadow-neo-sm gap-2">
          <Plus className="w-4 h-4" />
          Afegir usuari
        </Button>
      </div>

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
                  {/* Utilitzem profileImageUrl si existeix, si no, l'avatar antic/generat */}
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
                    
                    {/* INFORMACIÓ EXTRA */}
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <span className="text-muted-foreground">
                        🎂 {user.birthday}
                      </span>
                      <span className="text-muted-foreground">📞 {user.phone}</span>
                      
                      {/* Afegim els programes preferits */}
                      {user.preferredPrograms && user.preferredPrograms.length > 0 && (
                        <span className="font-semibold text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary-foreground shadow-neo-inset">
                          🏋️‍♀️ {user.preferredPrograms.join(', ')}
                        </span>
                      )}
                    </div>
                    
                    {/* Afegim les notes personals */}
                    {user.notes && (
                      <p className="text-xs italic text-gray-500 mt-2 p-2 rounded-md bg-background/50 border shadow-neo-inset">
                        📝 **Notes:** {user.notes}
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

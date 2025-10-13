import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Importem el Textarea per a les notes
import { Textarea } from "@/components/ui/textarea"; 
import { User } from "@/hooks/useUsers";

// Definició de l'estat inicial del formulari (amb els nous camps)
const initialFormData = {
  name: "",
  email: "",
  center: "Arbúcies",
  birthday: "", // Format DD/MM/YYYY
  age: 0,
  phone: "",
  avatar: "", // Valor per defecte original
  
  // NOUS CAMPS:
  profileImageUrl: "",
  preferredPrograms: "", // Com a string separada per comes per facilitar l'Input
  notes: "",
};

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (userData: Omit<User, 'id'>) => Promise<void>;
  user?: User | null;
}

export const UserFormModal = ({ open, onClose, onSave, user }: UserFormModalProps) => {
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (user) {
      // Inicialització del formulari amb les dades de l'usuari
      setFormData({
        name: user.name,
        email: user.email,
        center: user.center,
        // La data ja ve en format DD/MM/YYYY des del hook
        birthday: user.birthday as string, 
        age: user.age,
        phone: user.phone,
        avatar: user.avatar,
        // Inicialització dels nous camps (l'array es converteix a string)
        profileImageUrl: user.profileImageUrl || '',
        // Converteix l'array a una string separada per comes per mostrar-la a l'Input
        preferredPrograms: Array.isArray(user.preferredPrograms) ? user.preferredPrograms.join(', ') : (user.preferredPrograms as string || ''),
        notes: user.notes || '',
      });
    } else {
      setFormData(initialFormData);
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Utilitzem profileImageUrl com a valor de l'avatar final si està present
    const finalAvatar = formData.profileImageUrl || formData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`;
    
    await onSave({
      ...formData,
      // La lògica de conversió de birthday i preferredPrograms a format de Firebase
      // es fa dins del hook useUsers.ts abans de guardar.
      avatar: finalAvatar, 
      profileImageUrl: formData.profileImageUrl, 
    });
    
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* CANVI CLAU: 
        - overflow-y-auto: Habilita el scroll vertical quan el contingut supera l'alçada.
        - max-h-[90vh]: Limita l'alçada de la finestra al 90% del viewport (pantalla).
      */}
      <DialogContent className="sm:max-w-[500px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{user ? "Editar usuari" : "Afegir usuari"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* CAMPS EXISTENTS */}
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="center">Centre</Label>
            <Select value={formData.center} onValueChange={(value) => setFormData({ ...formData, center: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arbúcies">Arbúcies</SelectItem>
                <SelectItem value="Sant Hilari">Sant Hilari</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthday">Data de naixement (DD/MM/AAAA)</Label>
              <Input
                id="birthday"
                placeholder="DD/MM/AAAA"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Edat</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telèfon</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          {/* NOU CAMP: profileImageUrl */}
          <div className="space-y-2">
            <Label htmlFor="profileImageUrl">URL de la Foto de Perfil (Opcional)</Label>
            <Input
              id="profileImageUrl"
              placeholder="https://..."
              value={formData.profileImageUrl}
              onChange={(e) => setFormData({ ...formData, profileImageUrl: e.target.value })}
            />
          </div>

          {/* NOU CAMP: preferredPrograms */}
          <div className="space-y-2">
            <Label htmlFor="preferredPrograms">Programes Preferits (separa per comes: BP, BC, etc.)</Label>
            <Input
              id="preferredPrograms"
              placeholder="BP, BC, Body Combat"
              value={formData.preferredPrograms}
              onChange={(e) => setFormData({ ...formData, preferredPrograms: e.target.value })}
            />
          </div>

          {/* NOU CAMP: notes (utilitza Textarea) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes Personals (Internes)</Label>
            <Textarea
              id="notes"
              placeholder="Afegeix aquí notes mèdiques, observacions, etc."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel·lar
            </Button>
            <Button type="submit">
              {user ? "Actualitzar" : "Afegir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

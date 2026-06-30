import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; 
import { User } from "@/hooks/useUsers";

// 🆕 FUNCIÓ PER CALCULAR L'EDAT
const calculateAgeFromBirthday = (birthday: string): number => {
  if (!birthday) return 0;
  
  const parts = birthday.split('/');
  if (parts.length !== 3) return 0;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  
  const birthDate = new Date(year, month, day);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

const initialFormData = {
  name: "",
  email: "",
  center: "Arbúcies",
  birthday: "",
  age: 0,
  phone: "",
  avatar: "",
  profileImageUrl: "",
  preferredPrograms: "",
  manualNotes: "",
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
      setFormData({
        name: user.name,
        email: user.email,
        center: user.center,
        birthday: user.birthday as string, 
        age: user.age,
        phone: user.phone,
        avatar: user.avatar,
        profileImageUrl: user.profileImageUrl || '',
        preferredPrograms: Array.isArray(user.preferredPrograms) ? user.preferredPrograms.join(', ') : (user.preferredPrograms as string || ''),
        manualNotes: user.manualNotes || '',
      });
    } else {
      setFormData(initialFormData);
    }
  }, [user, open]);

  // 🆕 ACTUALITZAR L'EDAT AUTOMÀTICAMENT QUAN CANVIA LA DATA DE NAIXEMENT
  const handleBirthdayChange = (birthday: string) => {
    const calculatedAge = calculateAgeFromBirthday(birthday);
    setFormData({ 
      ...formData, 
      birthday,
      age: calculatedAge 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalAvatar = formData.profileImageUrl || formData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`;
    
    await onSave({
      ...formData,
      avatar: finalAvatar, 
      profileImageUrl: formData.profileImageUrl,
      // L'edat es recalcularà automàticament al hook
    });
    
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{user ? "Editar usuari" : "Afegir usuari"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
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

          {/* 🆕 CAMP DE DATA AMB CÀLCUL AUTOMÀTIC D'EDAT */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthday">Data de naixement (DD/MM/AAAA)</Label>
              <Input
                id="birthday"
                placeholder="DD/MM/AAAA"
                value={formData.birthday}
                onChange={(e) => handleBirthdayChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Edat (automàtic)</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                disabled
                className="bg-gray-100 cursor-not-allowed"
                title="L'edat es calcula automàticament des de la data de naixement"
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

          <div className="space-y-2">
            <Label htmlFor="profileImageUrl">URL de la Foto de Perfil (Opcional)</Label>
            <Input
              id="profileImageUrl"
              placeholder="https://..."
              value={formData.profileImageUrl}
              onChange={(e) => setFormData({ ...formData, profileImageUrl: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredPrograms">Programes Preferits (separa per comes: BP, BC, etc.)</Label>
            <Input
              id="preferredPrograms"
              placeholder="BP, BC, Body Combat"
              value={formData.preferredPrograms}
              onChange={(e) => setFormData({ ...formData, preferredPrograms: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manualNotes">Les Meves Notes (separades de Deporsite)</Label>
            <Textarea
              id="manualNotes"
              placeholder="Afegeix aquí notes mèdiques, observacions, etc."
              value={formData.manualNotes}
              onChange={(e) => setFormData({ ...formData, manualNotes: e.target.value })}
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

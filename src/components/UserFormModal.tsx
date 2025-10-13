import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@/hooks/useUsers";

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (userData: Omit<User, 'id'>) => Promise<void>;
  user?: User | null;
}

export const UserFormModal = ({ open, onClose, onSave, user }: UserFormModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    center: "Arbúcies",
    birthday: "",
    age: 0,
    phone: "",
    avatar: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        center: user.center,
        birthday: user.birthday,
        age: user.age,
        phone: user.phone,
        avatar: user.avatar,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        center: "Arbúcies",
        birthday: "",
        age: 0,
        phone: "",
        avatar: "",
      });
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate avatar if not provided
    const avatarUrl = formData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`;
    
    await onSave({
      ...formData,
      avatar: avatarUrl,
    });
    
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthday">Data de naixement</Label>
              <Input
                id="birthday"
                placeholder="DD/MM/YYYY"
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

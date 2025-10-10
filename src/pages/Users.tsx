import { NeoCard } from "@/components/NeoCard";
import { Users as UsersIcon, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Users = () => {
  // Dades d'exemple
  const mockUsers = [
    {
      id: 1,
      name: "Maria García",
      email: "maria@example.com",
      center: "Arbúcies",
      birthday: "15/03/1990",
      age: 34,
      phone: "666 123 456",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    },
    {
      id: 2,
      name: "Joan Martínez",
      email: "joan@example.com",
      center: "Sant Hilari",
      birthday: "22/07/1985",
      age: 39,
      phone: "677 234 567",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Joan",
    },
    {
      id: 3,
      name: "Anna López",
      email: "anna@example.com",
      center: "Arbúcies",
      birthday: "10/11/1992",
      age: 32,
      phone: "688 345 678",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna",
    },
    {
      id: 4,
      name: "Laura Soler",
      email: "laura@example.com",
      center: "Sant Hilari",
      birthday: "05/09/1988",
      age: 36,
      phone: "699 456 789",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Laura",
    },
  ];

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
        <Button className="shadow-neo hover:shadow-neo-sm gap-2">
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
          />
        </div>

        <div className="space-y-4">
          {mockUsers.map((user) => (
            <div
              key={user.id}
              className={`p-4 rounded-xl shadow-neo hover:shadow-neo-sm transition-all cursor-pointer border-2 ${
                user.center === "Arbúcies" 
                  ? "bg-blue-500/20 border-blue-500/30" 
                  : "bg-green-500/20 border-green-500/30"
              }`}
            >
              <div className="flex items-start gap-4">
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="w-16 h-16 rounded-full shadow-neo"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{user.name}</h3>
                      <p className="text-sm font-medium text-primary">{user.age} anys</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium shadow-neo-inset ${
                      user.center === "Arbúcies" 
                        ? "bg-blue-500/30 text-blue-700" 
                        : "bg-green-500/30 text-green-700"
                    }`}>
                      {user.center}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-muted-foreground">
                      🎂 {user.birthday}
                    </span>
                    <span className="text-muted-foreground">📞 {user.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </NeoCard>
    </div>
  );
};

export default Users;

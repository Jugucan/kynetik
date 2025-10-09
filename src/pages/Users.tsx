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
      phone: "666 123 456",
    },
    {
      id: 2,
      name: "Joan Martínez",
      email: "joan@example.com",
      center: "Sant Hilari",
      birthday: "22/07/1985",
      phone: "677 234 567",
    },
    {
      id: 3,
      name: "Anna López",
      email: "anna@example.com",
      center: "Arbúcies",
      birthday: "10/11/1992",
      phone: "688 345 678",
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
              className="p-4 rounded-xl shadow-neo hover:shadow-neo-sm transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-muted-foreground">
                      Centre: <span className="text-primary font-medium">{user.center}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Aniversari: {user.birthday}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{user.phone}</span>
              </div>
            </div>
          ))}
        </div>
      </NeoCard>
    </div>
  );
};

export default Users;

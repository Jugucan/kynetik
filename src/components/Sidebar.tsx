import { NavLink } from "react-router-dom";
import { Home, Calendar, Users, Dumbbell, Shuffle, Settings } from "lucide-react";

const menuItems = [
  { title: "Inici", icon: Home, path: "/" },
  { title: "Calendari", icon: Calendar, path: "/calendar" },
  { title: "Usuaris", icon: Users, path: "/users" },
  { title: "Programes", icon: Dumbbell, path: "/programs" },
  { title: "Mixtos", icon: Shuffle, path: "/mixtos" },
  { title: "Configuració", icon: Settings, path: "/settings" },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 min-h-screen bg-background p-6 shadow-neo">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">FitManage</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestió de sessions</p>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "shadow-neo-inset text-primary"
                  : "shadow-neo hover:shadow-neo-sm text-foreground"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

import { NavLink } from "react-router-dom";
import { Home, Calendar, Users, Dumbbell, Shuffle, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Inici", icon: Home, path: "/" },
  { title: "Calendari", icon: Calendar, path: "/calendar" },
  { title: "Usuaris", icon: Users, path: "/users" },
  { title: "Programes", icon: Dumbbell, path: "/programs" },
  { title: "Mixtos", icon: Shuffle, path: "/mixtos" },
  { title: "Configuració", icon: Settings, path: "/settings" },
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="px-2 py-4">
          {!isCollapsed && (
            <>
              <h1 className="text-2xl font-bold text-primary">FitManage</h1>
              <p className="text-sm text-muted-foreground mt-1">Gestió de sessions</p>
            </>
          )}
          {isCollapsed && (
            <h1 className="text-2xl font-bold text-primary text-center">FM</h1>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <NavLink
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
                      {!isCollapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

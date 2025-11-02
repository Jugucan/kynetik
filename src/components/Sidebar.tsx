import { NavLink, useNavigate } from "react-router-dom";
import { Home, Calendar, Users, Dumbbell, Shuffle, Clock, Settings, LogOut, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ROLE_NAMES } from "@/types/user";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const menuItems = [
  { title: "Inici", icon: Home, path: "/" },
  { title: "Calendari", icon: Calendar, path: "/calendar" },
  { title: "Usuaris", icon: Users, path: "/users" },
  { title: "Programes", icon: Dumbbell, path: "/programs" },
  { title: "Mixtos", icon: Shuffle, path: "/mixtos" },
  { title: "Horaris", icon: Clock, path: "/schedules" },
  { title: "Configuració", icon: Settings, path: "/settings" },
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { currentUser, logout } = useAuth();
  const { userProfile } = useUserProfile();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sessió tancada correctament');
      navigate('/login');
    } catch (error) {
      console.error('Error al tancar sessió:', error);
      toast.error('Error al tancar sessió');
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="px-2 py-4">
          {!isCollapsed && (
            <>
              <h1 className="text-2xl font-bold text-primary">Kynetik</h1>
              <p className="text-sm text-muted-foreground mt-1">Gestió de sessions</p>
            </>
          )}
          {isCollapsed && (
            <h1 className="text-2xl font-bold text-primary text-center">KY</h1>
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

      <SidebarFooter>
        {!isCollapsed ? (
          <div className="p-4 space-y-3">
            {/* Informació de l'usuari */}
            <div className="p-3 rounded-xl shadow-neo-inset bg-primary/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shadow-neo">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {userProfile?.displayName || 'Carregant...'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {currentUser?.email}
                  </p>
                </div>
              </div>
              
              {userProfile && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Rol:</span>
                    <span className="font-medium text-primary">
                      {ROLE_NAMES[userProfile.role]}
                    </span>
                  </div>
                  {userProfile.center && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Centre:</span>
                      <span className="font-medium">{userProfile.center}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botó de logout */}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full shadow-neo hover:shadow-neo-sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Tancar sessió
            </Button>
          </div>
        ) : (
          // Vista col·lapsada: Menú dropdown
          <div className="p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-full shadow-neo hover:shadow-neo-sm"
                >
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-semibold truncate">
                      {userProfile?.displayName || 'Usuari'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {currentUser?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                
                {userProfile && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <p className="text-xs text-muted-foreground">
                        Rol: <span className="font-medium text-primary">{ROLE_NAMES[userProfile.role]}</span>
                      </p>
                      {userProfile.center && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Centre: <span className="font-medium">{userProfile.center}</span>
                        </p>
                      )}
                    </div>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Tancar sessió
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

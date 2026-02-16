import { NavLink, useNavigate } from "react-router-dom";
import { Home, Calendar, Users, Dumbbell, Shuffle, Clock, Settings, LogOut, User, BarChart3, GraduationCap, UserCircle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Definim quines pàgines són visibles segons el mode de vista
const getMenuItems = (viewMode: 'instructor' | 'user') => {
  const allItems = [
    { title: "Inici", icon: Home, path: "/", visibleFor: ['instructor', 'user'] },
    { title: "Calendari", icon: Calendar, path: "/calendar", visibleFor: ['instructor', 'user'] },
    { title: "Usuaris", icon: Users, path: "/users", visibleFor: ['instructor'] },
    { title: "Programes", icon: Dumbbell, path: "/programs", visibleFor: ['instructor'] },
    { title: "Mixtos", icon: Shuffle, path: "/mixtos", visibleFor: ['instructor'] },
    { title: "Horaris", icon: Clock, path: "/schedules", visibleFor: ['instructor'] },
    { title: "Les Meves Estadístiques", icon: BarChart3, path: "/stats", visibleFor: ['instructor', 'user'] },
    { title: "Configuració", icon: Settings, path: "/settings", visibleFor: ['instructor'] },
  ];

  return allItems.filter(item => item.visibleFor.includes(viewMode));
};

export const AppSidebar = () => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { currentUser, logout, viewMode, setViewMode } = useAuth();
  const { userProfile } = useUserProfile();
  const navigate = useNavigate();

  const menuItems = getMenuItems(viewMode);

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

  const handleViewModeChange = (newMode: 'instructor' | 'user') => {
    setViewMode(newMode);
    toast.success(`Vista canviada a ${newMode === 'instructor' ? 'Instructora' : 'Usuària'}`);
    navigate('/stats');
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
            {/* Informació de l'usuari amb selector de vista integrat */}
            <div className="p-3 rounded-xl shadow-neo-inset bg-primary/5">
              <div className="flex items-center gap-3 mb-3">
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
                <div className="space-y-2">
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
                  
                  {/* Selector de vista integrat */}
                  <div className="pt-2 border-t border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1.5">Vista:</p>
                    <Select value={viewMode} onValueChange={handleViewModeChange}>
                      <SelectTrigger className="w-full h-8 shadow-neo-sm border-0 bg-background text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instructor">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Instructora</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="user">
                          <div className="flex items-center gap-2">
                            <UserCircle className="w-3.5 h-3.5" />
                            <span>Usuària</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
          // Vista col·lapsada: Menús dropdown
          <div className="p-2 space-y-2">
            {/* Selector de vista compacte */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-full shadow-neo hover:shadow-neo-sm"
                  title={viewMode === 'instructor' ? 'Vista Instructora' : 'Vista Usuària'}
                >
                  {viewMode === 'instructor' ? (
                    <GraduationCap className="w-5 h-5" />
                  ) : (
                    <UserCircle className="w-5 h-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Canviar vista</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleViewModeChange('instructor')}>
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Instructora
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleViewModeChange('user')}>
                  <UserCircle className="w-4 h-4 mr-2" />
                  Usuària
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Perfil d'usuari */}
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

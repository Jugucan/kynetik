import { NavLink, useNavigate } from "react-router-dom";
import { Home, Calendar, Users, Dumbbell, Shuffle, Clock, Settings, LogOut, User, BarChart3, GraduationCap, UserCircle, StickyNote, Pencil, Trophy, Shield } from "lucide-react";
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
import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const getMenuItems = (viewMode: 'instructor' | 'user' | 'superadmin') => {
  if (viewMode === 'superadmin') {
    return [
      { title: "Tauler de control", icon: Shield, path: "/superadmin", visibleFor: ['superadmin'] },
    ];
  }
  const allItems = [
    { title: "Inici", icon: Home, path: "/", visibleFor: ['instructor', 'user'] },
    { title: "Calendari", icon: Calendar, path: "/calendar", visibleFor: ['instructor', 'user'] },
    { title: "Usuaris", icon: Users, path: "/users", visibleFor: ['instructor'] },
    { title: "Programes", icon: Dumbbell, path: "/programs", visibleFor: ['instructor'] },
    { title: "Mixtos", icon: Shuffle, path: "/mixtos", visibleFor: ['instructor'] },
    { title: "Horaris", icon: Clock, path: "/schedules", visibleFor: ['instructor'] },
    { title: "Les Meves Notes", icon: StickyNote, path: "/notes", visibleFor: ['instructor'] },
    { title: "Les Meves Estadístiques", icon: BarChart3, path: "/stats", visibleFor: ['instructor', 'user'] },
    { title: "Insígnies", icon: Trophy, path: "/badges", visibleFor: ['user'] },
    { title: "Configuració", icon: Settings, path: "/settings", visibleFor: ['instructor'] },
  ];

  return allItems.filter(item => item.visibleFor.includes(viewMode));
};

export const AppSidebar = () => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { currentUser, logout, viewMode, setViewMode } = useAuth();
  const { userProfile, updateProfile } = useUserProfile();
  const navigate = useNavigate();

  const menuItems = getMenuItems(viewMode);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEditProfile = () => {
    setEditName(userProfile?.displayName || '');
    setEditGender(userProfile?.gender || '');
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast.error('El nom no pot estar buit');
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({
        displayName: editName.trim(),
        gender: editGender || null,
      });
      toast.success('Perfil actualitzat correctament');
      setIsEditProfileOpen(false);
    } catch (error) {
      console.error('Error actualitzant perfil:', error);
      toast.error('Error al guardar els canvis');
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleViewModeChange = (newMode: 'instructor' | 'user' | 'superadmin') => {
    setViewMode(newMode);
    const modeNames = {
      instructor: 'Instructora',
      user: 'Usuària',
      superadmin: 'Superadmin'
    };
    toast.success(`Vista canviada a ${modeNames[newMode]}`);
    if (newMode === 'superadmin') {
      navigate('/superadmin');
    } else {
      navigate('/');
    }
  };
  return (
    <>
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
                  <button
                    onClick={handleOpenEditProfile}
                    className="w-7 h-7 rounded-lg shadow-neo hover:shadow-neo-sm transition-all flex items-center justify-center text-muted-foreground hover:text-primary"
                    title="Editar perfil"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
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
                    {userProfile.gender && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Gènere:</span>
                        <span className="font-medium">{userProfile.gender}</span>
                      </div>
                    )}
                    
                    {userProfile?.role !== 'user' && (
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
                            {userProfile?.role === 'superadmin' && (
                              <SelectItem value="superadmin">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-3.5 h-3.5" />
                                  <span>Superadmin</span>
                                </div>
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>

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
            <div className="p-2 space-y-2">
              {userProfile?.role !== 'user' && (
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
                    {userProfile?.role === 'superadmin' && (
                      <DropdownMenuItem onClick={() => handleViewModeChange('superadmin')}>
                        <Shield className="w-4 h-4 mr-2" />
                        Superadmin
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

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
                  <DropdownMenuItem onClick={handleOpenEditProfile}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar perfil
                  </DropdownMenuItem>
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

      {/* Modal d'edició de perfil */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nom</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="El teu nom"
                className="shadow-neo-inset border-0"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-gender">Gènere</Label>
              <Select value={editGender} onValueChange={setEditGender}>
                <SelectTrigger id="edit-gender" className="shadow-neo-inset border-0">
                  <SelectValue placeholder="Selecciona una opció" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Femení">Femení</SelectItem>
                  <SelectItem value="Masculí">Masculí</SelectItem>
                  <SelectItem value="No binari">No binari</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditProfileOpen(false)}
              className="shadow-neo hover:shadow-neo-sm"
            >
              Cancel·lar
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="shadow-neo hover:shadow-neo-sm"
            >
              {isSaving ? 'Guardant...' : 'Guardar canvis'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

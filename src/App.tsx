import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/Sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ViewProtectedRoute } from "@/components/ViewProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Calendar from "./pages/Calendar";
import Users from "./pages/Users";
import Programs from "./pages/Programs";
import Mixtos from "./pages/Mixtos";
import Schedules from "./pages/Schedules";
import Stats from "./pages/Stats";
import Settings from "./pages/Settings";
import Notes from "./pages/Notes";
import Badges from "./pages/Badges";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PendingApproval from "./pages/PendingApproval";
import Superadmin from "./pages/Superadmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { currentUser, userStatus, viewMode } = useAuth();

  // Rutes públiques sempre accessibles
  // (les posem fora de qualsevol condició)
  const publicRoutes = (
    <>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </>
  );

  // Usuari pendent o rebutjat → només pot veure /pending
  if (currentUser && (userStatus === 'pending' || userStatus === 'rejected')) {
    return (
      <Routes>
        {publicRoutes}
        <Route path="/pending" element={<PendingApproval />} />
        <Route path="*" element={<Navigate to="/pending" replace />} />
      </Routes>
    );
  }

  // Vista superadmin → només veu el tauler de superadmin
  if (currentUser && viewMode === 'superadmin') {
    return (
      <Routes>
        {publicRoutes}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <SidebarProvider>
                <div className="flex min-h-screen w-full bg-background">
                  <AppSidebar />
                  <main className="flex-1 p-4 sm:p-8 overflow-x-hidden min-w-0">
                    <div className="mb-4">
                      <SidebarTrigger className="shadow-neo hover:shadow-neo-sm" />
                    </div>
                    <Routes>
                      <Route path="/superadmin" element={<Superadmin />} />
                      <Route path="*" element={<Navigate to="/superadmin" replace />} />
                    </Routes>
                  </main>
                </div>
              </SidebarProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    );
  }

  // Resta de vistes (instructor i user) → accés normal
  return (
    <Routes>
      {publicRoutes}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="flex min-h-screen w-full bg-background">
                <AppSidebar />
                <main className="flex-1 p-4 sm:p-8 overflow-x-hidden min-w-0">
                  <div className="mb-4">
                    <SidebarTrigger className="shadow-neo hover:shadow-neo-sm" />
                  </div>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/stats" element={<Stats />} />

                    <Route
                      path="/badges"
                      element={
                        <ViewProtectedRoute allowedViews={['user']}>
                          <Badges />
                        </ViewProtectedRoute>
                      }
                    />
                    <Route
                      path="/users"
                      element={
                        <ViewProtectedRoute allowedViews={['instructor']}>
                          <Users />
                        </ViewProtectedRoute>
                      }
                    />
                    <Route
                      path="/programs"
                      element={
                        <ViewProtectedRoute allowedViews={['instructor']}>
                          <Programs />
                        </ViewProtectedRoute>
                      }
                    />
                    <Route
                      path="/mixtos"
                      element={
                        <ViewProtectedRoute allowedViews={['instructor']}>
                          <Mixtos />
                        </ViewProtectedRoute>
                      }
                    />
                    <Route
                      path="/schedules"
                      element={
                        <ViewProtectedRoute allowedViews={['instructor']}>
                          <Schedules />
                        </ViewProtectedRoute>
                      }
                    />
                    <Route
                      path="/notes"
                      element={
                        <ViewProtectedRoute allowedViews={['instructor']}>
                          <Notes />
                        </ViewProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ViewProtectedRoute allowedViews={['instructor']}>
                          <ProtectedRoute allowedRoles={['superadmin', 'admin', 'monitor']}>
                            <Settings />
                          </ProtectedRoute>
                        </ViewProtectedRoute>
                      }
                    />

                    {/* /pending redirigeix a / per si l'usuari ja està aprovat */}
                    <Route path="/pending" element={<Navigate to="/" replace />} />
                    <Route path="/404" element={<NotFound />} />
                    <Route path="*" element={<Navigate to="/404" replace />} />
                  </Routes>
                </main>
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

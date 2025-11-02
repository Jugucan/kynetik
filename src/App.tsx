import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/Sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Calendar from "./pages/Calendar";
import Users from "./pages/Users";
import Programs from "./pages/Programs";
import Mixtos from "./pages/Mixtos";
import Schedules from "./pages/Schedules";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Ruta pública de login */}
            <Route path="/login" element={<Login />} />
            
            {/* Rutes protegides amb Sidebar */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <div className="flex min-h-screen w-full bg-background">
                      <AppSidebar />
                      <main className="flex-1 p-8">
                        <div className="mb-4">
                          <SidebarTrigger className="shadow-neo hover:shadow-neo-sm" />
                        </div>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/calendar" element={<Calendar />} />
                          <Route path="/users" element={<Users />} />
                          <Route path="/programs" element={<Programs />} />
                          <Route path="/mixtos" element={<Mixtos />} />
                          <Route path="/schedules" element={<Schedules />} />
                          <Route 
                            path="/settings" 
                            element={
                              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'monitor']}>
                                <Settings />
                              </ProtectedRoute>
                            } 
                          />
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

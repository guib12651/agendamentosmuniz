import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";
import Fechamentos from "./pages/Fechamentos.tsx";
import MeusAgendamentos from "./pages/MeusAgendamentos.tsx";
import GerenciarUsuarios from "./pages/GerenciarUsuarios.tsx";
import CentralOperacional from "./pages/CentralOperacional.tsx";
import Quotas from "./pages/Quotas.tsx";
import Bids from "./pages/Bids.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { session, profile, isAdmin, loading, signOut } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!session) return <Navigate to="/login" replace />;
  
  if (profile?.is_blocked) {
    signOut();
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    console.log("Access denied: Not an admin", { profile, isAdmin });
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/fechamentos" element={<ProtectedRoute><Fechamentos /></ProtectedRoute>} />
            <Route path="/central-operacional" element={<ProtectedRoute><CentralOperacional /></ProtectedRoute>} />
            <Route path="/meus-agendamentos" element={<ProtectedRoute><MeusAgendamentos /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute requireAdmin><GerenciarUsuarios /></ProtectedRoute>} />
            <Route path="/quotas" element={<ProtectedRoute requireAdmin><Quotas /></ProtectedRoute>} />
            <Route path="/lances" element={<ProtectedRoute requireAdmin><Bids /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

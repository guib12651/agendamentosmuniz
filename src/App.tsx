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
import PainelTV from "./pages/PainelTV.tsx";
import OpportunitiesCenter from "./pages/OpportunitiesCenter.tsx";
import Settings from "./pages/Settings.tsx";
import ProductionSales from "./pages/ProductionSales.tsx";
import CarteiraLeads from "./pages/CarteiraLeads.tsx";
import Performance from "./pages/Performance.tsx";
import { MIA } from "./components/MIA";
import { CelebrationOverlay } from "./components/CelebrationOverlay";






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
          <MIA />
          <CelebrationOverlay />
          <Routes>

            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/fechamentos" element={<ProtectedRoute><Fechamentos /></ProtectedRoute>} />
            <Route path="/central-operacional" element={<ProtectedRoute><CentralOperacional /></ProtectedRoute>} />
            <Route path="/meus-agendamentos" element={<ProtectedRoute><MeusAgendamentos /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute requireAdmin={true}><GerenciarUsuarios /></ProtectedRoute>} />
            <Route path="/quotas" element={<ProtectedRoute requireAdmin={true}><Quotas /></ProtectedRoute>} />
            <Route path="/lances" element={<ProtectedRoute requireAdmin><Bids /></ProtectedRoute>} />
            <Route path="/painel-tv" element={<ProtectedRoute requireAdmin><PainelTV /></ProtectedRoute>} />
            <Route path="/central-oportunidades" element={<ProtectedRoute><OpportunitiesCenter /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />



            <Route path="/production-sales" element={<ProtectedRoute><ProductionSales /></ProtectedRoute>} />
            <Route path="/carteira-leads" element={<ProtectedRoute><CarteiraLeads /></ProtectedRoute>} />
            <Route path="/performance" element={<ProtectedRoute requireAdmin><Performance /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "pre_seller" | "seller";
  is_blocked: boolean;
  avatarUrl?: string | null;
}

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isOwner: boolean;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const fetchProfile = async (userId: string, attempt = 0): Promise<void> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[Auth] Falha ao carregar perfil:", error.message);
      // Nova tentativa (rede/sessão ainda propagando)
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 800));
        return fetchProfile(userId, attempt + 1);
      }
      return;
    }

    // Nível "Dono" vem da tabela de papéis (validado no servidor)
    const { data: ownerRow } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "owner" as never)
      .maybeSingle();
    setIsOwner(!!ownerRow);

    if (data) {
      setProfile({
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        role: data.role as "admin" | "pre_seller" | "seller",
        is_blocked: !!data.is_blocked,
        avatarUrl: data.avatar_url,
      });
    }
  };

  useEffect(() => {
    // Mantém "loading" até o perfil (com o papel) ser carregado,
    // para evitar redirecionar admins para a área de pré-venda.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          setLoading(true);
          setTimeout(() => {
            fetchProfile(session.user.id).finally(() => setLoading(false));
          }, 0);
        } else {
          setProfile(null);
          setIsOwner(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (username: string, password: string) => {
    const email = `${username.toLowerCase().trim()}@muniz.internal`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) return { error: "Usuário ou senha incorretos." };

    if (data.user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_blocked")
        .eq("id", data.user.id)
        .single();

      if (profileData?.is_blocked) {
        await supabase.auth.signOut();
        return { error: "Sua conta foi bloqueada. Entre em contato com o administrador." };
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsOwner(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        isAdmin: profile?.role === "admin" || profile?.role === "seller",
        isOwner,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

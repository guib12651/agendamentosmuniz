import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "pre_seller";
  is_blocked: boolean;
}

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    console.log("Fetching profile for user:", userId);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (error) {
      console.error("Error fetching profile:", error);
      return;
    }

    if (data) {
      console.log("Profile data received:", data);
      setProfile({
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        role: data.role as "admin" | "pre_seller",
        is_blocked: !!data.is_blocked,
      });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
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
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        isAdmin: profile?.role === "admin",
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

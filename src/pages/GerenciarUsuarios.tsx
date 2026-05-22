import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserCog, Shield, ShieldAlert, ArrowLeft, User, Plus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo_muniz.png";

interface UserProfile {
  id: string;
  display_name: string;
  role: 'admin' | 'pre_seller' | 'seller' | 'consultant';
  is_blocked: boolean;
  email?: string;
}

export default function GerenciarUsuarios() {
  const { isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    username: "",
    password: "",
    role: "pre_seller" as UserProfile['role'],
  });

  const handleCreate = async () => {
    const username = form.username.toLowerCase().trim().replace(/\s+/g, "");
    if (!form.display_name.trim()) return toast.error("Informe o nome de exibição");
    if (!/^[a-z0-9_]+$/.test(username)) return toast.error("Usuário: apenas letras minúsculas, números e _");
    if (form.password.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres");

    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-user", {
      body: { ...form, username },
    });
    setCreating(false);

    if (error || (data && data.error)) {
      toast.error(data?.error || error?.message || "Erro ao criar usuário");
      return;
    }
    toast.success("Usuário criado com sucesso!");
    setCreateOpen(false);
    setForm({ display_name: "", username: "", password: "", role: "pre_seller" });
    fetchUsers();
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, role, is_blocked")
      .order("display_name");

    if (error) {
      toast.error("Erro ao carregar usuários");
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_blocked: !currentStatus })
      .eq("id", userId);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(currentStatus ? "Usuário desbloqueado!" : "Usuário bloqueado!");
      setUsers(users.map(u => u.id === userId ? { ...u, is_blocked: !currentStatus } : u));
    }
  };

  const updateUserRole = async (userId: string, newRole: UserProfile['role']) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      toast.error("Erro ao atualizar função");
    } else {
      toast.success("Função atualizada com sucesso!");
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-3.5 h-3.5 text-primary" />;
      case 'pre_seller': return <UserCog className="w-3.5 h-3.5 text-blue-500" />;
      case 'seller': return <User className="w-3.5 h-3.5 text-emerald-500" />;
      default: return <User className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'pre_seller': return 'Pré-vendedor';
      case 'seller': return 'Vendedor';
      case 'consultant': return 'Consultor';
      default: return role;
    }
  };

  const filteredUsers = users.filter(u => 
    u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground p-6 text-center">
        Acesso restrito a administradores.
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <header className="border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between py-3 px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={logo} alt="Muniz Consultorias" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg" />
            <div>
              <h1 className="text-base sm:text-lg font-display font-bold text-primary leading-tight">Gerenciar Usuários</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{profile?.displayName} • Admin</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/")} className="h-9 text-xs">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
        </div>
      </header>

      <main className="container mt-4 space-y-4 px-3 sm:px-6">
        <div className="card-meeting p-4 space-y-4">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou cargo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setCreateOpen(true)} size="sm" className="h-10 gap-1 whitespace-nowrap">
              <Plus className="w-4 h-4" /> Novo
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <UserCog className="w-4 h-4 text-muted-foreground" />
                          {user.display_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={user.role} 
                          onValueChange={(value: UserProfile['role']) => updateUserRole(user.id, value)}
                          disabled={user.id === profile?.id}
                        >
                          <SelectTrigger className="h-9 w-[160px] text-xs">
                            <div className="flex items-center gap-2">
                              {getRoleIcon(user.role)}
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="pre_seller">Pré-vendedor</SelectItem>
                            <SelectItem value="seller">Vendedor</SelectItem>
                            <SelectItem value="consultant">Consultor</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${user.is_blocked ? 'text-destructive' : 'text-success'}`}>
                            {user.is_blocked ? 'Bloqueado' : 'Ativo'}
                          </span>
                          <Switch
                            checked={!user.is_blocked}
                            onCheckedChange={() => toggleUserStatus(user.id, user.is_blocked)}
                            disabled={user.id === profile?.id}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome de exibição</Label>
              <Input
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-1">
              <Label>Usuário (login)</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                placeholder="ex: joao"
                autoCapitalize="none"
              />
              <p className="text-[10px] text-muted-foreground">Apenas letras minúsculas, números e _</p>
            </div>
            <div className="space-y-1">
              <Label>Senha</Label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Função</Label>
              <Select value={form.role} onValueChange={(v: UserProfile['role']) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="pre_seller">Pré-vendedor</SelectItem>
                  <SelectItem value="seller">Vendedor</SelectItem>
                  <SelectItem value="consultant">Consultor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Criando..." : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

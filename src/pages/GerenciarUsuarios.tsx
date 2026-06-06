import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserCog, Shield, ShieldAlert, ArrowLeft, User, Plus, Eye, EyeOff, Trash2, Pencil, Check, X, Camera, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/UserAvatar";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import logo from "@/assets/logo_muniz.png";

interface UserProfile {
  id: string;
  display_name: string;
  role: 'admin' | 'pre_seller' | 'seller' | 'consultant' | 'commercial_manager' | 'admin_assistant';
  is_blocked: boolean;
  email?: string;
  avatar_url?: string | null;
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
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [updatingName, setUpdatingName] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    username: "",
    password: "",
    role: "pre_seller" as UserProfile['role'],
    avatar_url: "" as string | null,
  });
  const [uploadingAvatar, setUploadingAvatar] = useState<string | null>(null);

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
    setForm({ display_name: "", username: "", password: "", role: "pre_seller", avatar_url: null });
    fetchUsers();
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, role, is_blocked, avatar_url")
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

  const updateUserName = async (userId: string) => {
    if (!editName.trim()) {
      toast.error("O nome não pode estar vazio");
      return;
    }

    setUpdatingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: editName.trim() })
      .eq("id", userId);
    setUpdatingName(false);

    if (error) {
      toast.error("Erro ao atualizar nome");
    } else {
      toast.success("Nome atualizado com sucesso!");
      setUsers(users.map(u => u.id === userId ? { ...u, display_name: editName.trim() } : u));
      setEditingId(null);
    }
  };

  const startEditing = (user: UserProfile) => {
    setEditingId(user.id);
    setEditName(user.display_name);
  };

  const handleDeleteUser = async (userId: string) => {
    setDeleting(userId);
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { targetUserId: userId },
    });
    setDeleting(null);

    if (error || (data && data.error)) {
      toast.error(data?.error || error?.message || "Erro ao excluir usuário");
      return;
    }

    toast.success("Usuário excluído com sucesso!");
    fetchUsers();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>, userId?: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Formato inválido. Envie uma imagem JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Envie uma imagem de até 5MB.");
      return;
    }

    const targetId = userId || 'new-user';
    setUploadingAvatar(targetId);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${targetId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      if (userId) {
        // Atualizar usuário existente
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', userId);

        if (updateError) throw updateError;
        
        setUsers(users.map(u => u.id === userId ? { ...u, avatar_url: publicUrl } : u));
        toast.success("Foto atualizada com sucesso.");
      } else {
        // Apenas atualizar o formulário de criação
        setForm(prev => ({ ...prev, avatar_url: publicUrl }));
        toast.success("Foto adicionada com sucesso.");
      }
    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast.error("Não foi possível atualizar a foto. Tente novamente.");
    } finally {
      setUploadingAvatar(null);
    }
  };

  const removeAvatar = async (userId: string) => {
    if (!window.confirm("Deseja remover a foto deste usuário?")) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, avatar_url: null } : u));
      toast.success("Foto removida com sucesso.");
    } catch (error) {
      toast.error("Erro ao remover foto.");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-3.5 h-3.5 text-primary" />;
      case 'pre_seller': return <UserCog className="w-3.5 h-3.5 text-blue-500" />;
      case 'seller': return <User className="w-3.5 h-3.5 text-emerald-500" />;
      case 'commercial_manager': return <User className="w-3.5 h-3.5 text-purple-500" />;
      case 'admin_assistant': return <User className="w-3.5 h-3.5 text-orange-500" />;
      default: return <User className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'pre_seller': return 'Pré-vendedor';
      case 'seller': return 'Vendedor';
      case 'consultant': return 'Consultor';
      case 'commercial_manager': return 'Gerente Comercial';
      case 'admin_assistant': return 'Assistente Administrativo';
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
                  <TableHead className="text-right">Ações</TableHead>
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
                        <div className="flex items-center gap-3">
                          <div className="relative group">
                            <UserAvatar 
                              avatarUrl={user.avatar_url} 
                              displayName={user.display_name} 
                              size="sm" 
                              className="border-2 border-primary/10"
                            />
                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                              <label htmlFor={`avatar-upload-${user.id}`} className="cursor-pointer">
                                {uploadingAvatar === user.id ? (
                                  <Loader2 className="w-3 h-3 text-white animate-spin" />
                                ) : (
                                  <Camera className="w-3 h-3 text-white" />
                                )}
                              </label>
                              <input 
                                id={`avatar-upload-${user.id}`}
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleAvatarUpload(e, user.id)}
                                disabled={uploadingAvatar === user.id}
                              />
                            </div>
                            {user.avatar_url && (
                                <button 
                                  onClick={() => removeAvatar(user.id)}
                                  className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remover foto"
                                >
                                  <X className="w-2 h-2" />
                                </button>
                            )}
                          </div>
                          {editingId === user.id ? (
                            <div className="flex items-center gap-1 w-full max-w-[200px]">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-8 text-xs"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") updateUserName(user.id);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-success hover:text-success hover:bg-success/10 shrink-0"
                                onClick={() => updateUserName(user.id)}
                                disabled={updatingName}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                onClick={() => setEditingId(null)}
                                disabled={updatingName}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="truncate">{user.display_name}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 hover:bg-muted"
                                onClick={() => startEditing(user)}
                              >
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          )}
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
                            <SelectItem value="commercial_manager">Gerente Comercial</SelectItem>
                            <SelectItem value="admin_assistant">Assistente Administrativo</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="flex flex-col items-end gap-1 mr-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${user.is_blocked ? 'text-destructive' : 'text-success'}`}>
                              {user.is_blocked ? 'Bloqueado' : 'Ativo'}
                            </span>
                            <Switch
                              checked={!user.is_blocked}
                              onCheckedChange={() => toggleUserStatus(user.id, user.is_blocked)}
                              disabled={user.id === profile?.id}
                            />
                          </div>

                          {user.id !== profile?.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o usuário <strong>{user.display_name}</strong>? 
                                    Esta ação não pode ser desfeita e removerá permanentemente o acesso dele. 
                                    Os dados de agendamentos e leads serão preservados no histórico.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {deleting === user.id ? "Excluindo..." : "Excluir"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
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
                  <SelectItem value="commercial_manager">Gerente Comercial</SelectItem>
                  <SelectItem value="admin_assistant">Assistente Administrativo</SelectItem>
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

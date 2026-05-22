import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const username = String(body.username || "").toLowerCase().trim().replace(/\s+/g, "");
    const password = String(body.password || "");
    const display_name = String(body.display_name || "").trim();
    const role = String(body.role || "pre_seller");

    if (!username || !/^[a-z0-9_]+$/.test(username)) {
      return new Response(JSON.stringify({ error: "Usuário inválido (use apenas letras minúsculas, números e _)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Senha deve ter ao menos 6 caracteres" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!display_name) {
      return new Response(JSON.stringify({ error: "Nome de exibição obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["admin", "pre_seller", "seller", "consultant"].includes(role)) {
      return new Response(JSON.stringify({ error: "Função inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = `${username}@muniz.internal`;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr || !created.user) {
      const msg = createErr?.message || "Erro ao criar usuário";
      const friendly = /already/i.test(msg) ? "Já existe um usuário com esse login" : msg;
      return new Response(JSON.stringify({ error: friendly }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newId = created.user.id;

    const { error: profErr } = await admin.from("profiles").insert({
      id: newId, username, display_name, role, is_blocked: false,
    });
    if (profErr) {
      await admin.auth.admin.deleteUser(newId);
      return new Response(JSON.stringify({ error: "Erro ao criar perfil: " + profErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("user_roles").insert({ user_id: newId, role });

    return new Response(JSON.stringify({ success: true, id: newId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

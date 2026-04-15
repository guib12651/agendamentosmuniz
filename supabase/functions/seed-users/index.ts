import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const users = [
  { username: "yulle", password: "totoca9559", display_name: "Yulle", role: "admin", email: "yulle@muniz.internal" },
  { username: "ketullen", password: "ket6651", display_name: "Ketullen", role: "admin", email: "ketullen@muniz.internal" },
  { username: "guilherme", password: "guilhermedamuniz", display_name: "Guilherme", role: "pre_seller", email: "guilherme@muniz.internal" },
  { username: "anakesia", password: "anadamuniz", display_name: "Anakesia", role: "pre_seller", email: "anakesia@muniz.internal" },
  { username: "tais", password: "taisdamuniz", display_name: "Taís", role: "pre_seller", email: "tais@muniz.internal" },
  { username: "ketullen_pv", password: "ketdamuniz", display_name: "Ketullen (PV)", role: "pre_seller", email: "ketullenpv@muniz.internal" },
  { username: "mikael", password: "mikadamuniz", display_name: "Mikael", role: "pre_seller", email: "mikael@muniz.internal" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: any[] = [];

  for (const u of users) {
    // Check if user already exists by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email);
    
    if (existing) {
      results.push({ username: u.username, status: "already_exists", id: existing.id });
      // Ensure profile and role exist
      await supabaseAdmin.from("profiles").upsert({
        id: existing.id, username: u.username, display_name: u.display_name, role: u.role,
      }, { onConflict: "id" });
      await supabaseAdmin.from("user_roles").upsert({
        user_id: existing.id, role: u.role,
      }, { onConflict: "user_id,role" });
      continue;
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });

    if (error) {
      results.push({ username: u.username, status: "error", error: error.message });
      continue;
    }

    const userId = data.user.id;

    await supabaseAdmin.from("profiles").insert({
      id: userId, username: u.username, display_name: u.display_name, role: u.role,
    });

    await supabaseAdmin.from("user_roles").insert({
      user_id: userId, role: u.role,
    });

    results.push({ username: u.username, status: "created", id: userId });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

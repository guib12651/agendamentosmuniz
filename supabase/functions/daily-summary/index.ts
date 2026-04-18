import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Today in BRT
    const now = new Date();
    const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const today = brtNow.toISOString().slice(0, 10);

    const { data: meetings, error } = await supabase
      .from("meetings")
      .select("pre_seller, meeting_type")
      .eq("date", today);

    if (error) throw error;

    const total = meetings?.length ?? 0;
    const presencial = meetings?.filter((m) => m.meeting_type === "presencial").length ?? 0;
    const online = total - presencial;

    const bySeller: Record<string, number> = {};
    for (const m of meetings ?? []) {
      bySeller[m.pre_seller] = (bySeller[m.pre_seller] || 0) + 1;
    }

    const sellerLines = Object.entries(bySeller)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${name}: ${count}`)
      .join(" • ");

    const message =
      total === 0
        ? "Nenhuma reunião agendada para hoje."
        : `${total} reunião(ões) hoje • ${presencial} presencial / ${online} online${
            sellerLines ? ` • ${sellerLines}` : ""
          }`;

    // Get all admins
    const { data: admins, error: adminErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminErr) throw adminErr;

    const rows = (admins ?? []).map((a) => ({
      user_id: a.user_id,
      type: "summary",
      title: "Resumo do dia",
      message,
    }));

    if (rows.length > 0) {
      await supabase.from("notifications").insert(rows);
    }

    return new Response(JSON.stringify({ ok: true, total, admins: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-summary error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

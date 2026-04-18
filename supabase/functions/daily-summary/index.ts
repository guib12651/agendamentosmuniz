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

    // Yesterday in BRT (BRT = UTC-3)
    const now = new Date();
    const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const brtYesterday = new Date(brtNow.getTime() - 24 * 60 * 60 * 1000);
    const yesterday = brtYesterday.toISOString().slice(0, 10);

    // Format DD/MM for display
    const [yYear, yMonth, yDay] = yesterday.split("-");
    const yesterdayLabel = `${yDay}/${yMonth}`;

    const { data: meetings, error } = await supabase
      .from("meetings")
      .select("pre_seller, status")
      .eq("date", yesterday);

    if (error) throw error;

    const total = meetings?.length ?? 0;
    const compareceu = meetings?.filter((m) => m.status === "compareceu").length ?? 0;
    const naoCompareceu = meetings?.filter((m) => m.status === "nao_compareceu").length ?? 0;
    const pendente = meetings?.filter((m) => m.status === "pending").length ?? 0;
    const decided = compareceu + naoCompareceu;
    const rate = decided > 0 ? Math.round((compareceu / decided) * 100) : 0;

    // Per-seller breakdown
    const bySeller: Record<string, { total: number; ok: number; no: number }> = {};
    for (const m of meetings ?? []) {
      const s = bySeller[m.pre_seller] ?? { total: 0, ok: 0, no: 0 };
      s.total += 1;
      if (m.status === "compareceu") s.ok += 1;
      else if (m.status === "nao_compareceu") s.no += 1;
      bySeller[m.pre_seller] = s;
    }

    const sellerLines = Object.entries(bySeller)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, s]) => `${name}: ${s.total} (${s.ok}✓/${s.no}✗)`)
      .join(" • ");

    const message =
      total === 0
        ? `Nenhuma reunião em ${yesterdayLabel}.`
        : `Fechamento de ${yesterdayLabel}: ${total} reunião(ões) • ${compareceu} compareceram / ${naoCompareceu} faltaram${
            pendente > 0 ? ` / ${pendente} pendente(s)` : ""
          } (${rate}%)${sellerLines ? ` • ${sellerLines}` : ""}`;

    // Get all admins
    const { data: admins, error: adminErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminErr) throw adminErr;

    const rows = (admins ?? []).map((a) => ({
      user_id: a.user_id,
      type: "summary",
      title: "Fechamento de ontem",
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

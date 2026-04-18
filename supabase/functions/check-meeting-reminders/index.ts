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

    // BRT = UTC-3. Compute window in BRT.
    const now = new Date();
    const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const windowStart = new Date(brtNow.getTime() + 25 * 60 * 1000);
    const windowEnd = new Date(brtNow.getTime() + 30 * 60 * 1000);

    const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
    const fmtTime = (d: Date) => d.toISOString().slice(11, 19);

    // Fetch pending meetings within the window. Use a slightly wider date filter to be safe.
    const dates = new Set([fmtDate(windowStart), fmtDate(windowEnd)]);

    const { data: meetings, error } = await supabase
      .from("meetings")
      .select("id, lead_name, date, time, user_id, pre_seller")
      .in("date", Array.from(dates))
      .eq("status", "pending")
      .not("user_id", "is", null);

    if (error) throw error;

    let created = 0;
    for (const m of meetings ?? []) {
      const meetingDt = new Date(`${m.date}T${m.time}`);
      if (meetingDt < windowStart || meetingDt > windowEnd) continue;

      // Skip if reminder already exists
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("meeting_id", m.id)
        .eq("type", "reminder")
        .limit(1);

      if (existing && existing.length > 0) continue;

      const timeStr = m.time.slice(0, 5);
      await supabase.from("notifications").insert({
        user_id: m.user_id,
        type: "reminder",
        title: "Reunião em 30 minutos",
        message: `Reunião com ${m.lead_name} às ${timeStr}`,
        meeting_id: m.id,
      });
      created++;
    }

    return new Response(JSON.stringify({ ok: true, created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-meeting-reminders error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

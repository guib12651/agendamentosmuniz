import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contato@munizconsultorias.com.br";
const VAPID_PUBLIC_KEY =
  "BEG9fPOGlTbfnCSUPPy3au5Q-skjCh4K4rFSE5V1xcVS93z8hptzhwJQYKfFRl_HVb1BEVefb1jDd9cFggJe81Q";

async function getWebPush() {
  const webpush = (await import("npm:web-push@3.6.7")).default;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return webpush;
}

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Aceita uma única notificação (compatibilidade) ou um lote de ids.
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.notification_ids)
      ? body.notification_ids.filter((v: unknown) => typeof v === "string")
      : body?.notification_id
      ? [body.notification_id]
      : [];

    if (ids.length === 0) {
      return new Response(JSON.stringify({ error: "notification_id or notification_ids required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: notifs, error: notifErr } = await supabase
      .from("notifications")
      .select("id, user_id, title, message")
      .in("id", ids);

    if (notifErr) throw notifErr;
    if (!notifs || notifs.length === 0) {
      return new Response(JSON.stringify({ error: "notifications not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = notifs as NotificationRow[];
    const userIds = Array.from(new Set(rows.map((n) => n.user_id)));

    // Uma única consulta de inscrições para todos os destinatários do lote.
    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", userIds);

    if (subsErr) throw subsErr;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webpush = await getWebPush();

    let sent = 0;
    let removed = 0;

    await Promise.all(
      rows.flatMap((notif) => {
        const payload = JSON.stringify({
          title: notif.title,
          body: notif.message,
          message: notif.message,
          url: "/",
          tag: `notif-${notif.id}`,
        });

        return subs
          .filter((s: any) => s.user_id === notif.user_id)
          .map(async (s: any) => {
            try {
              await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload
              );
              sent++;
            } catch (e: any) {
              const status = e?.statusCode;
              if (status === 404 || status === 410) {
                await supabase.from("push_subscriptions").delete().eq("id", s.id);
                removed++;
              } else {
                console.error("push error", status, e?.body ?? e?.message ?? e);
              }
            }
          });
      })
    );

    return new Response(JSON.stringify({ sent, removed, notifications: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-push-notification error", e?.body ?? e?.message ?? e);
    return new Response(JSON.stringify({ error: e?.message ?? "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

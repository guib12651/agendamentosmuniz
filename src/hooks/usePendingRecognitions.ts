import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Recognition {
  id: string;
  recipient_user_id: string;
  admin_user_id: string;
  title: string;
  message: string;
  metric_label: string | null;
  metric_value: string | null;
  seen_at: string | null;
  created_at: string;
}

export function usePendingRecognitions(userId: string | undefined) {
  const [pending, setPending] = useState<Recognition[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("recognitions")
      .select("*")
      .eq("recipient_user_id", userId)
      .is("seen_at", null)
      .order("created_at", { ascending: true });
    if (data) setPending(data as Recognition[]);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`recognitions-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "recognitions",
          filter: `recipient_user_id=eq.${userId}`,
        },
        (payload) => {
          const r = payload.new as Recognition;
          if (!r.seen_at) setPending((prev) => [...prev, r]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markSeen = useCallback(async (id: string) => {
    setPending((prev) => prev.filter((r) => r.id !== id));
    await supabase
      .from("recognitions")
      .update({ seen_at: new Date().toISOString() })
      .eq("id", id);
  }, []);

  return { pending, markSeen };
}

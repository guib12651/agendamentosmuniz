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
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function usePendingRecognitions(userId: string | undefined) {
  const [pending, setPending] = useState<Recognition[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    
    const { data: recData } = await supabase
      .from("recognitions")
      .select("*")
      .eq("recipient_user_id", userId)
      .is("seen_at", null)
      .order("created_at", { ascending: true });

    if (recData && recData.length > 0) {
      const adminIds = [...new Set(recData.map(r => r.admin_user_id))];
      const { data: profData } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", adminIds);
      
      const enriched = recData.map(r => ({
        ...r,
        profiles: profData?.find(p => p.id === r.admin_user_id) || null
      }));
      
      setPending(enriched as Recognition[]);
    }
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
        },

        async (payload) => {
          const r = payload.new as any;
          
          const { data: profData } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", r.admin_user_id)
            .single();
          
          const enriched = {
            ...r,
            profiles: profData || null
          };

          if ((r.recipient_user_id === userId || userId === undefined) && !r.seen_at) {
            setPending((prev) => [...prev, enriched as Recognition]);
          }
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

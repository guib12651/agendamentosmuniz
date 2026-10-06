import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { decodePushPublicKey, LEGACY_VAPID_PUBLIC_KEY, subscriptionMatchesKey } from "@/lib/pushKeys";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? LEGACY_VAPID_PUBLIC_KEY;

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function usePushSubscription(userId: string | undefined) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);
    if (supported) setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!isSupported || !userId) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub && subscriptionMatchesKey(sub.options.applicationServerKey, VAPID_PUBLIC_KEY));
      } catch {
        setIsSubscribed(false);
      }
    })();
  }, [isSupported, userId]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !userId) return { error: "Não suportado" };
    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setIsLoading(false);
        return { error: "Permissão negada" };
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (sub && !subscriptionMatchesKey(sub.options.applicationServerKey, VAPID_PUBLIC_KEY)) {
        const oldEndpoint = sub.endpoint;
        if (!(await sub.unsubscribe())) throw new Error("Não foi possível renovar as notificações. Tente novamente.");
        setIsSubscribed(false);
        const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", oldEndpoint).eq("user_id", userId);
        if (error) throw error;
        sub = null;
      }
      if (!sub) {
        const key = decodePushPublicKey(VAPID_PUBLIC_KEY);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key.buffer as ArrayBuffer,
        });
      }

      const json = sub.toJSON();
      const p256dh = json.keys?.p256dh ?? arrayBufferToBase64(sub.getKey("p256dh"));
      const auth = json.keys?.auth ?? arrayBufferToBase64(sub.getKey("auth"));
      if (!p256dh || !auth) throw new Error("Inscrição de notificações inválida");

      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_id: userId,
            endpoint: sub.endpoint,
            p256dh,
            auth,
            user_agent: navigator.userAgent,
          },
          { onConflict: "endpoint" }
        );

      if (error) {
        setIsLoading(false);
        return { error: error.message };
      }

      setIsSubscribed(true);
      setIsLoading(false);
      return { error: null };
    } catch (e: unknown) {
      setIsLoading(false);
      return { error: e instanceof Error ? e.message : "Erro ao ativar" };
    }
  }, [isSupported, userId]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !userId) return;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, userId]);

  return { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe };
}

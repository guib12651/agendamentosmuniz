import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY =
  "BFV3MNRU0W8Zqe9jWIkybOb-CQ4IHfhpN4XpBl8Fq_vfF7WmTxl3QV1UJ5m1v_FP8HiXGHp0FMFT-tZLuRzMtpE";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

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
        setIsSubscribed(!!sub);
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
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = sub.toJSON();
      const p256dh = json.keys?.p256dh ?? arrayBufferToBase64(sub.getKey("p256dh"));
      const auth = json.keys?.auth ?? arrayBufferToBase64(sub.getKey("auth"));

      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_id: userId,
            endpoint: sub.endpoint,
            p256dh: p256dh!,
            auth: auth!,
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
    } catch (e: any) {
      setIsLoading(false);
      return { error: e?.message ?? "Erro ao ativar" };
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

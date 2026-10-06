// Compatibility for the existing deployment; external deployments must override it.
export const LEGACY_VAPID_PUBLIC_KEY =
  "BEG9fPOGlTbfnCSUPPy3au5Q-skjCh4K4rFSE5V1xcVS93z8hptzhwJQYKfFRl_HVb1BEVefb1jDd9cFggJe81Q";

export function decodePushPublicKey(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Chave pública de notificações inválida");
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  if (bytes.length !== 65 || bytes[0] !== 4) throw new Error("Chave pública de notificações inválida");
  return bytes;
}

export function subscriptionMatchesKey(key: ArrayBuffer | null, publicKey: string): boolean {
  if (!key) return false;
  const expected = decodePushPublicKey(publicKey);
  const actual = new Uint8Array(key);
  return actual.length === expected.length && actual.every((byte, index) => byte === expected[index]);
}
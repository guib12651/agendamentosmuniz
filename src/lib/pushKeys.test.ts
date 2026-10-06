import { describe, expect, it } from "vitest";
import { decodePushPublicKey, LEGACY_VAPID_PUBLIC_KEY, subscriptionMatchesKey } from "./pushKeys";

describe("push key rotation", () => {
  it("decodes the existing public key", () => {
    expect(decodePushPublicKey(LEGACY_VAPID_PUBLIC_KEY)).toHaveLength(65);
  });
  it("accepts matching subscriptions", () => {
    const bytes = decodePushPublicKey(LEGACY_VAPID_PUBLIC_KEY);
    expect(subscriptionMatchesKey(bytes.buffer as ArrayBuffer, LEGACY_VAPID_PUBLIC_KEY)).toBe(true);
  });
  it("rejects absent and outdated subscriptions", () => {
    expect(subscriptionMatchesKey(null, LEGACY_VAPID_PUBLIC_KEY)).toBe(false);
    const bytes = decodePushPublicKey(LEGACY_VAPID_PUBLIC_KEY);
    bytes[1] ^= 1;
    expect(subscriptionMatchesKey(bytes.buffer as ArrayBuffer, LEGACY_VAPID_PUBLIC_KEY)).toBe(false);
  });
  it("rejects invalid configured keys", () => {
    for (const value of ["", "placeholder", "private key", "AAAA"]) {
      expect(() => decodePushPublicKey(value)).toThrow();
    }
  });
});
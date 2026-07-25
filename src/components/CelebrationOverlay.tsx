import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingRecognitions } from "@/hooks/usePendingRecognitions";
import { Button } from "@/components/ui/button";

const DURATION_MS = 6000;

function fireFireworks() {
  const duration = DURATION_MS;
  const end = Date.now() + duration;
  const colors = ["#EDAB00", "#FFD84D", "#ffffff"];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
      zIndex: 90,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
      zIndex: 90,
    });
    if (Math.random() < 0.15) {
      confetti({
        particleCount: 80,
        startVelocity: 35,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() * 0.4 + 0.1 },
        colors,
        zIndex: 90,
      });
    }
    // Camada da frente (por cima do modal)
    confetti({
      particleCount: 2,
      angle: 90,
      spread: 80,
      startVelocity: 45,
      origin: { x: Math.random(), y: 1 },
      colors,
      zIndex: 200,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
}

function tryPlaySound() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.value = 0.08;
      o.connect(g).connect(ctx.destination);
      const t = ctx.currentTime + i * 0.12;
      o.start(t);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.stop(t + 0.4);
    });
  } catch {
    /* browser blocked audio, ignore */
  }
}

export function CelebrationOverlay() {
  const { profile } = useAuth();
  const { pending, markSeen } = usePendingRecognitions(profile?.id);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const current = pending[0];

  const firstName = useMemo(
    () => (profile?.displayName || "").split(" ")[0],
    [profile?.displayName]
  );

  useEffect(() => {
    if (!current) return;
    fireFireworks();
    tryPlaySound();
    const timer = setTimeout(() => {
      markSeen(current.id);
    }, DURATION_MS);
    return () => clearTimeout(timer);
  }, [current, markSeen]);

  if (!current || dismissedAt === current.created_at.length) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
      <div className="relative max-w-lg mx-4 rounded-2xl border border-primary/40 bg-card p-8 text-center shadow-2xl animate-scale-in">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-display font-black text-primary mb-2">
          PARABÉNS, {firstName?.toUpperCase() || "!"}!
        </h2>
        <p className="text-lg text-foreground mb-4 whitespace-pre-wrap">{current.message}</p>
        {current.metric_value && (
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-bold text-primary mb-6">
            🏆 {current.metric_label}: {current.metric_value}
          </div>
        )}
        <div>
          <Button
            onClick={() => {
              markSeen(current.id);
              setDismissedAt(current.created_at.length);
            }}
          >
            Obrigado!
          </Button>
        </div>
      </div>
    </div>
  );
}

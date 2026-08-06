import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingRecognitions } from "@/hooks/usePendingRecognitions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

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

function tryPlaySound() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    
    // Som de fogos (ruído branco + envelope de volume)
    const playFireworkSound = (time: number) => {
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1000, time);
      filter.frequency.exponentialRampToValueAtTime(10, time + 0.5);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(time);
    };

    // Disparar alguns "explosões"
    [0, 0.2, 0.5, 0.8, 1.2].forEach((delay) => {
      playFireworkSound(ctx.currentTime + delay);
    });

    // Pequena melodia de vitória
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.value = 0.05;
      o.connect(g).connect(ctx.destination);
      const t = ctx.currentTime + 0.5 + i * 0.12;
      o.start(t);
      g.gain.setValueAtTime(0.05, t);
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

  const isSale = current.title.includes("VENDA");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
      <div className="relative max-w-lg mx-4 rounded-2xl border border-primary/40 bg-card p-8 text-center shadow-2xl animate-scale-in">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <Avatar className="h-24 w-24 border-4 border-primary shadow-xl relative z-10">
              <AvatarImage src={current.profiles?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute -top-2 -right-2 text-4xl animate-bounce">🎉</div>
          </div>
        </div>
        
        <h2 className="text-3xl font-display font-black text-primary mb-2">
          {current.title}
        </h2>
        <p className="text-xl font-medium text-foreground mb-4">
          {isSale 
            ? `${current.profiles?.display_name || "Um consultor"} acabou de brilhar!`
            : `${current.profiles?.display_name || "Alguém"} mandou um reconhecimento!`
          }
        </p>
        <p className="text-lg text-muted-foreground mb-6 italic whitespace-pre-wrap">
          "{current.message}"
        </p>
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

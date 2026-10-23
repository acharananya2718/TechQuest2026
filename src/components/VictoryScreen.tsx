import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Clock, Target, Award, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { escapeAudio } from '../game/audioEngine';

interface VictoryScreenProps {
  teamName: string;
  finalScore: number;
  timeSpentSeconds: number;
  hintsUsed: number;
  errorsCount: number;
  soundEnabled?: boolean;
  onNavigateToDashboard: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({
  teamName,
  finalScore,
  timeSpentSeconds,
  hintsUsed,
  errorsCount,
  soundEnabled = true,
  onNavigateToDashboard,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Format time mm:ss
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // Play victory sound on mount if enabled
  useEffect(() => {
    if (soundEnabled) {
      escapeAudio.playVictoryFanfare();
    }

    // Trigger canvas-confetti bursts for high-impact celebratory entrance
    const triggerConfettiCannons = () => {
      // Left cannon
      confetti({
        particleCount: 70,
        angle: 60,
        spread: 75,
        origin: { x: 0, y: 0.7 },
        colors: ['#06b6d4', '#eab308', '#ec4899', '#3b82f6', '#10b981', '#f97316'],
      });
      // Right cannon
      confetti({
        particleCount: 70,
        angle: 120,
        spread: 75,
        origin: { x: 1, y: 0.7 },
        colors: ['#06b6d4', '#eab308', '#ec4899', '#3b82f6', '#10b981', '#f97316'],
      });
      // Center star burst
      confetti({
        particleCount: 90,
        spread: 120,
        origin: { x: 0.5, y: 0.4 },
        colors: ['#fbbf24', '#38bdf8', '#f43f5e', '#a855f7'],
      });
    };

    triggerConfettiCannons();
    const timer1 = setTimeout(triggerConfettiCannons, 1200);
    const timer2 = setTimeout(triggerConfettiCannons, 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [soundEnabled]);

  // Continuous Fireworks, Confetti & Celebration Lighting Canvas Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle types
    interface FireworkRocket {
      x: number;
      y: number;
      vx: number;
      vy: number;
      targetY: number;
      color: string;
      trail: { x: number; y: number; alpha: number }[];
    }

    interface SparkParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      alpha: number;
      decay: number;
      size: number;
      flicker: boolean;
    }

    interface ConfettiPiece {
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      vy: number;
      vx: number;
      angle: number;
      vAngle: number;
      flip: number;
      vFlip: number;
    }

    const festiveColors = [
      '#06b6d4', // Cyan
      '#38bdf8', // Sky
      '#fbbf24', // Amber
      '#f59e0b', // Gold
      '#ec4899', // Pink
      '#10b981', // Emerald
      '#8b5cf6', // Violet
      '#f97316', // Orange
      '#ffffff', // Sparkle white
    ];

    const rockets: FireworkRocket[] = [];
    const sparks: SparkParticle[] = [];
    const confettiList: ConfettiPiece[] = [];

    // Initialize fluttering confetti
    const confettiCount = 85;
    for (let i = 0; i < confettiCount; i++) {
      confettiList.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        w: 6 + Math.random() * 8,
        h: 10 + Math.random() * 12,
        color: festiveColors[Math.floor(Math.random() * festiveColors.length)],
        vy: 1.5 + Math.random() * 2.5,
        vx: (Math.random() - 0.5) * 1.5,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.08,
        flip: Math.random() * Math.PI,
        vFlip: 0.04 + Math.random() * 0.06,
      });
    }

    const explodeRocket = (x: number, y: number, color: string) => {
      const sparkCount = 45 + Math.floor(Math.random() * 30);
      for (let i = 0; i < sparkCount; i++) {
        const speed = 2.5 + Math.random() * 5.5;
        const angle = Math.random() * Math.PI * 2;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: Math.random() < 0.25 ? '#ffffff' : color,
          alpha: 1.0,
          decay: 0.012 + Math.random() * 0.018,
          size: 2.0 + Math.random() * 2.5,
          flicker: Math.random() > 0.5,
        });
      }
    };

    let lastRocketTime = 0;

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Festive ambient lighting spots
      const gradient = ctx.createRadialGradient(
        width * 0.5,
        height * 0.35,
        100,
        width * 0.5,
        height * 0.35,
        width * 0.75
      );
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
      gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Launch rockets periodically
      if (time - lastRocketTime > 800) {
        lastRocketTime = time;
        const startX = width * 0.15 + Math.random() * (width * 0.7);
        const targetY = height * 0.12 + Math.random() * (height * 0.38);
        const color = festiveColors[Math.floor(Math.random() * festiveColors.length)];
        rockets.push({
          x: startX,
          y: height + 10,
          vx: (Math.random() - 0.5) * 2.2,
          vy: -(8.5 + Math.random() * 3.5),
          targetY,
          color,
          trail: [],
        });
      }

      // Update & Draw Rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx;
        r.y += r.vy;
        r.trail.push({ x: r.x, y: r.y, alpha: 1.0 });

        // Draw trail
        for (let t = 0; t < r.trail.length; t++) {
          const pt = r.trail[t];
          pt.alpha -= 0.06;
          if (pt.alpha > 0) {
            ctx.fillStyle = r.color;
            ctx.globalAlpha = pt.alpha * 0.8;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        r.trail = r.trail.filter((pt) => pt.alpha > 0);

        // Rocket head
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Explode upon reaching target height or starting to fall
        if (r.y <= r.targetY || r.vy >= 0) {
          explodeRocket(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      // Update & Draw Sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.08; // Gravity
        s.vx *= 0.98; // Air drag
        s.alpha -= s.decay;

        if (s.alpha <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        const currentAlpha = s.flicker && Math.random() < 0.3 ? s.alpha * 0.4 : s.alpha;
        ctx.globalAlpha = currentAlpha;
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Update & Draw Fluttering Confetti
      for (let i = 0; i < confettiList.length; i++) {
        const c = confettiList[i];
        c.y += c.vy;
        c.x += c.vx + Math.sin(c.angle) * 0.8;
        c.angle += c.vAngle;
        c.flip += c.vFlip;

        // Wrap around when falling past bottom
        if (c.y > height + 20) {
          c.y = -20;
          c.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        ctx.scale(1, Math.sin(c.flip));
        ctx.fillStyle = c.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      }

      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-lg select-none">
      {/* Animated Fireworks & Confetti Fullscreen Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 w-full h-full z-0"
      />

      {/* Radial ambient glow orbs */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-cyan-500/20 via-amber-500/10 to-transparent rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 w-[400px] h-[250px] bg-pink-500/15 rounded-full blur-3xl" />

      {/* Central Glassmorphic Victory Card */}
      <div className="relative z-10 w-full max-w-2xl my-auto p-6 sm:p-10 rounded-3xl bg-slate-950/85 border-2 border-cyan-400/50 shadow-[0_0_90px_rgba(6,182,212,0.35)] text-center space-y-6 sm:space-y-7 font-mono animate-in fade-in zoom-in-95 duration-500">
        
        {/* Championship Golden Crest with Shimmering Glow */}
        <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/30 to-cyan-500/30 animate-ping opacity-60" />
          <div className="relative w-full h-full rounded-full bg-gradient-to-b from-amber-400/25 via-slate-900 to-cyan-950/80 border-2 border-amber-400/80 shadow-[0_0_35px_rgba(251,191,36,0.6)] flex items-center justify-center text-amber-300">
            <Trophy className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-bounce" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-yellow-300 animate-spin" />
        </div>

        {/* EXACT REQUIRED MESSAGES: Large, Bold, Centered Typography */}
        <div className="space-y-2 sm:space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-bold tracking-widest uppercase shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ROUND 2 ESCAPE ROOM • COMPLETED</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-black tracking-wide sm:tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.7)]">
            CONGRATULATIONS!
          </h1>

          <h2 className="text-xl sm:text-3xl md:text-4xl font-heading font-extrabold tracking-normal sm:tracking-wide text-cyan-300 drop-shadow-[0_0_20px_rgba(6,182,212,0.8)]">
            YOU HAVE ESCAPED THE ROOM!
          </h2>

          <p className="text-xs sm:text-sm text-slate-200 max-w-lg mx-auto leading-relaxed pt-1">
            Squad <strong className="text-cyan-300 font-bold">{teamName}</strong> has cracked all security sectors, unlocked the Master Pneumatic Blast Portal, and emerged victorious from the Tech Quest Facility!
          </p>
        </div>

        {/* Performance Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 text-left shadow-inner">
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-amber-500/20">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] sm:text-[11px] uppercase tracking-wider mb-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>FINAL SCORE</span>
            </div>
            <div className="text-lg sm:text-2xl font-heading font-black text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
              {finalScore} <span className="text-[10px] text-amber-400 font-normal">PTS</span>
            </div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-cyan-500/20">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] sm:text-[11px] uppercase tracking-wider mb-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>TIME SPENT</span>
            </div>
            <div className="text-lg sm:text-2xl font-heading font-black text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
              {formatTime(timeSpentSeconds)}
            </div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-slate-700/40">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] sm:text-[11px] uppercase tracking-wider mb-1">
              <Target className="w-3.5 h-3.5 text-rose-400" />
              <span>ERRORS</span>
            </div>
            <div className="text-lg sm:text-2xl font-heading font-black text-slate-200">
              {errorsCount}
            </div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-slate-700/40">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] sm:text-[11px] uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>HINTS USED</span>
            </div>
            <div className="text-lg sm:text-2xl font-heading font-black text-slate-200">
              {hintsUsed}
            </div>
          </div>
        </div>

        {/* Action Button: Exact label BACK TO DASHBOARD */}
        <div className="pt-2 sm:pt-3">
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 sm:px-12 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-heading font-black text-sm sm:text-base uppercase tracking-widest shadow-[0_0_35px_rgba(6,182,212,0.6)] hover:shadow-[0_0_50px_rgba(6,182,212,0.8)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <span>BACK TO DASHBOARD</span>
            <ArrowRight className="w-5 h-5 text-slate-950" />
          </button>
        </div>

        <p className="text-[11px] text-slate-400/80 italic">
          Your escape completion record and score have been permanently verified in the championship database.
        </p>
      </div>
    </div>
  );
};

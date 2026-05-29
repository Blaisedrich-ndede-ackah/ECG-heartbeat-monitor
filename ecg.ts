import { useEffect, useRef } from "react";
import { EcgGenerator, type RhythmId } from "./ecg";

interface Props {
  rhythm: RhythmId;
  bpm: number;
  color?: string;
  speed?: number; // pixels per second of sweep
  gain?: number;
  soundOn?: boolean;
  onBeat?: () => void;
}

export default function EcgTrace({
  rhythm,
  bpm,
  color = "#22e36b",
  speed = 220,
  gain = 1,
  soundOn = false,
  onBeat,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const genRef = useRef(new EcgGenerator());
  const bufRef = useRef<Float32Array | null>(null);
  const headRef = useRef(0); // index of newest sample column
  const colsRef = useRef(0);
  const dprRef = useRef(1);
  const colCarryRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(soundOn);
  const colorRef = useRef(color);
  const onBeatRef = useRef(onBeat);

  soundRef.current = soundOn;
  colorRef.current = color;
  onBeatRef.current = onBeat;

  useEffect(() => {
    genRef.current.setRhythm(rhythm);
  }, [rhythm]);

  useEffect(() => {
    genRef.current.setBpm(bpm);
  }, [bpm]);

  const beep = () => {
    if (!soundRef.current) return;
    let ctx = audioRef.current;
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioRef.current = ctx;
    }
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      const cols = canvas.width;
      colsRef.current = cols;
      bufRef.current = new Float32Array(cols).fill(0);
      headRef.current = 0;
    };

    setup();
    const ro = new ResizeObserver(setup);
    ro.observe(canvas);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const buf = bufRef.current;
      if (!buf) return;
      const cols = colsRef.current;
      const dpr = dprRef.current;
      const gen = genRef.current;

      // how many pixel-columns to advance this frame
      const advance = speed * dpr * dt + colCarryRef.current;
      let n = Math.floor(advance);
      colCarryRef.current = advance - n;
      if (n > cols) n = cols;

      const secPerCol = 1 / (speed * dpr);
      for (let i = 0; i < n; i++) {
        const v = gen.step(secPerCol);
        if (gen.beatFlag) {
          beep();
          onBeatRef.current?.();
        }
        headRef.current = (headRef.current + 1) % cols;
        buf[headRef.current] = v;
      }

      // ---- render ----
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // grid
      drawGrid(ctx, W, H, dpr);

      // baseline + scaling
      const mid = H * 0.6;
      const amp = H * 0.34 * gain;

      const head = headRef.current;
      const col = colorRef.current;

      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // glow pass
      ctx.shadowBlur = 14 * dpr;
      ctx.shadowColor = col;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      for (let x = 0; x < cols; x++) {
        // oldest sample at left (x=0), newest at right (x=cols-1)
        const idx = (head + 1 + x) % cols;
        const y = mid - buf[idx] * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // bright core pass
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.1 * dpr;
      ctx.strokeStyle = "#d9ffe8";
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      for (let x = 0; x < cols; x++) {
        const idx = (head + 1 + x) % cols;
        const y = mid - buf[idx] * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // leading dot
      const leadY = mid - buf[head] * amp;
      ctx.shadowBlur = 18 * dpr;
      ctx.shadowColor = col;
      ctx.fillStyle = "#eafff2";
      ctx.beginPath();
      ctx.arc(cols - 1, leadY, 3.2 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [speed]);

  return <canvas ref={canvasRef} className="block h-full w-full" />;
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  dpr: number
) {
  const small = 10 * dpr;
  const big = small * 5;

  ctx.lineWidth = 1;
  // small grid
  ctx.strokeStyle = "rgba(34, 197, 94, 0.07)";
  ctx.beginPath();
  for (let x = 0; x <= W; x += small) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
  }
  for (let y = 0; y <= H; y += small) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();

  // big grid
  ctx.strokeStyle = "rgba(34, 197, 94, 0.16)";
  ctx.beginPath();
  for (let x = 0; x <= W; x += big) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
  }
  for (let y = 0; y <= H; y += big) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();
}

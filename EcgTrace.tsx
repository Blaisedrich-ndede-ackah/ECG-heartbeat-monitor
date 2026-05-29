import { useEffect, useMemo, useRef, useState } from "react";
import EcgTrace from "./EcgTrace";
import { RHYTHMS, getRhythm, type RhythmId } from "./ecg";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function App() {
  const [rhythm, setRhythm] = useState<RhythmId>("nsr");
  const [bpm, setBpm] = useState(72);
  const [soundOn, setSoundOn] = useState(false);
  const [flash, setFlash] = useState(false);
  const [displayHr, setDisplayHr] = useState(72);
  const [gain, setGain] = useState(1);
  const [paperSpeed, setPaperSpeed] = useState(25);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedLead, setSelectedLead] = useState("II");
  const beatTimes = useRef<number[]>([]);

  const rh = getRhythm(rhythm);
  const now = useClock();

  // when switching rhythm, snap bpm into its sensible range
  const onSelectRhythm = (id: RhythmId) => {
    const r = getRhythm(id);
    setRhythm(id);
    setBpm(r.defaultBpm);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(console.error);
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(console.error);
    }
  };

  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const onBeat = () => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 90);
    const t = performance.now();
    const arr = beatTimes.current;
    arr.push(t);
    while (arr.length > 6) arr.shift();
    if (arr.length >= 2) {
      let sum = 0;
      for (let i = 1; i < arr.length; i++) sum += arr[i] - arr[i - 1];
      const avg = sum / (arr.length - 1);
      const hr = Math.round(60000 / avg);
      if (hr > 10 && hr < 360) setDisplayHr(hr);
    }
  };

  // For pulseless / flatline rhythms HR readout reflects reality
  const hrValue = useMemo(() => {
    if (rhythm === "asystole") return 0;
    if (rhythm === "vfib") return 0;
    return displayHr;
  }, [rhythm, displayHr]);

  // Derived synthetic vitals that react to the rhythm
  const vitals = useMemo(() => deriveVitals(rhythm, hrValue), [rhythm, hrValue]);

  const dangerColor =
    rh.danger === "critical"
      ? "#f87171"
      : rh.danger === "warn"
      ? "#fbbf24"
      : "#4ade80";

  const critical = rh.danger === "critical";

  return (
    <div className="min-h-screen bg-[#020406] text-slate-100 antialiased overflow-hidden">
      {/* Top hospital header */}
      <header className="border-b border-white/10 bg-[#0a0c12] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
              <div className="text-3xl">🫀</div>
              <div
                className={`absolute -right-1 -top-1 h-4 w-4 rounded-full transition-all duration-150 ${
                  flash ? "scale-125" : "scale-90 opacity-60"
                }`}
                style={{ background: dangerColor, boxShadow: `0 0 18px ${dangerColor}` }}
              />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold tracking-tighter text-white">CARDIOWAVE</div>
                <div className="rounded bg-emerald-500/20 px-2.5 py-0.5 text-xs font-mono tracking-[2px] text-emerald-400">
                  ICU-07
                </div>
              </div>
              <div className="text-sm text-slate-400 flex items-center gap-2">
                <span>JOHN A. DOE</span>
                <span className="text-emerald-500/60">•</span>
                <span>58Y M • MRN 4821931</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-6 text-sm font-mono">
            <div>
              <div className="text-[10px] text-slate-500">LEAD</div>
              <div className="text-emerald-400 font-semibold">{selectedLead}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">TIME</div>
              <div className="tabular-nums text-white font-medium">
                {now.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-95"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? "⤢" : "⤢"}
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-68px)] flex-col lg:flex-row">
        {/* Main Monitor Area */}
        <div className="flex-1 flex flex-col min-h-0 p-4 lg:p-6 bg-[#05070a]">
          {/* Primary ECG Display */}
          <div className="relative flex-1 rounded-2xl border border-white/10 bg-black overflow-hidden shadow-inner mb-4">
            <div className="absolute left-6 top-4 z-20 flex items-center gap-3">
              <div className="px-4 py-1 bg-black/70 backdrop-blur-md border border-emerald-400/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-xs font-bold tracking-[1px]">ECG</span>
                  <span
                    className="px-2 py-px text-[10px] font-bold rounded text-black"
                    style={{ backgroundColor: dangerColor }}
                  >
                    {rh.short}
                  </span>
                </div>
              </div>

              <div className="px-3 py-1 text-xs font-mono text-slate-400 bg-black/60 rounded">
                GAIN ×{gain} • {paperSpeed}mm/s
              </div>
            </div>

            <div className="absolute right-6 top-4 z-20 flex items-center gap-2 text-xs font-mono">
              <div className="px-3 py-1 bg-black/70 rounded border border-white/10">25mm/mV</div>
              <div
                onClick={() => setSelectedLead(selectedLead === "II" ? "V1" : "II")}
                className="px-3 py-1 bg-black/70 rounded border border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
              >
                LEAD {selectedLead}
              </div>
            </div>

            <div className="absolute inset-0 pt-16 pb-8">
              <EcgTrace
                rhythm={rhythm}
                bpm={bpm}
                color="#22e36b"
                soundOn={soundOn}
                onBeat={onBeat}
                speed={paperSpeed === 50 ? 460 : 230}
                gain={gain}
              />
            </div>

            <div className="absolute bottom-4 left-6 right-6 flex justify-between text-[10px] font-mono text-slate-500 z-10 pointer-events-none">
              <div>II • 0.05-150Hz • 60Hz FILTER ON</div>
              <div>12:42:19 • 03.14.26</div>
            </div>

            {/* Beat indicator overlay */}
            {flash && (
              <div className="absolute inset-0 bg-emerald-400/10 pointer-events-none z-30" />
            )}
          </div>

          {/* Secondary waveforms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative rounded-2xl border border-white/10 bg-black overflow-hidden h-36 lg:h-40">
              <div className="absolute left-4 top-3 text-xs font-semibold text-sky-400 z-10">PLETH</div>
              <div className="absolute right-4 top-3 text-xs font-mono text-sky-400/70 z-10">SpO₂</div>
              <div className="absolute inset-0 pt-9">
                <EcgTrace
                  rhythm={plethRhythm(rhythm)}
                  bpm={bpm}
                  color="#38bdf8"
                  speed={160}
                  gain={0.8}
                />
              </div>
            </div>

            <div className="relative rounded-2xl border border-white/10 bg-black overflow-hidden h-36 lg:h-40">
              <div className="absolute left-4 top-3 text-xs font-semibold text-amber-400 z-10">RESP</div>
              <div className="absolute right-4 top-3 text-xs font-mono text-amber-400/70 z-10">RR</div>
              <div className="absolute inset-0 pt-9">
                <EcgTrace
                  rhythm="brady"
                  bpm={vitals.resp * 3.5}
                  color="#fbbf24"
                  speed={95}
                  gain={1.1}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Vitals */}
        <div className="w-full lg:w-80 border-l border-white/10 bg-[#0a0c12] p-5 flex flex-col">
          <div className="mb-6">
            <div className="text-xs uppercase tracking-widest text-slate-400 mb-3">VITAL SIGNS</div>
          </div>

          <div className="space-y-3 flex-1">
            <VitalBox
              label="HEART RATE"
              unit="BPM"
              value={hrValue === 0 ? "—" : hrValue}
              color={dangerColor}
              big
              pulse={flash}
            />
            <VitalBox
              label="OXYGEN SAT"
              unit="%"
              value={vitals.spo2}
              color="#38bdf8"
              big
            />
            <VitalBox
              label="BLOOD PRESSURE"
              unit="mmHg"
              value={vitals.nibp}
              color="#c084fc"
            />
            <VitalBox
              label="RESPIRATORY RATE"
              unit="bpm"
              value={vitals.resp}
              color="#fbbf24"
            />
            <VitalBox
              label="TEMPERATURE"
              unit="°C"
              value={vitals.temp}
              color="#fb923c"
            />
          </div>

          {/* Critical status indicator */}
          {critical && (
            <div className="mt-6 rounded-xl border border-rose-500 bg-rose-950/40 p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <div className="font-semibold text-rose-300">CRITICAL RHYTHM</div>
                  <div className="text-sm text-rose-400 mt-1 leading-tight">
                    {rh.name}
                  </div>
                  <div className="text-xs text-rose-500 mt-2">{rh.description}</div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="text-[10px] text-slate-500 text-center">
              SIMULATED MONITOR — EDUCATIONAL TOOL
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Panel - Tablet Optimized */}
      <div className="border-t border-white/10 bg-[#0a0c12] p-4 lg:p-5">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Rhythm Selection */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="text-xs uppercase font-semibold tracking-widest text-slate-400">CARDIAC RHYTHMS</div>
                <div className="text-xs text-slate-500 font-mono">{rh.name}</div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
                {RHYTHMS.map((r) => {
                  const active = r.id === rhythm;
                  const c = r.danger === "critical"
                    ? "#f87171"
                    : r.danger === "warn"
                    ? "#fbbf24"
                    : "#4ade80";

                  return (
                    <button
                      key={r.id}
                      onClick={() => onSelectRhythm(r.id)}
                      className={`group relative flex flex-col items-center justify-center rounded-2xl border px-4 py-3 text-xs transition-all active:scale-[0.985] ${
                        active
                          ? "border-transparent shadow-xl shadow-black/60"
                          : "border-white/10 hover:border-white/30 bg-white/[0.015]"
                      }`}
                      style={
                        active
                          ? {
                              background: `linear-gradient(145deg, ${c}15, transparent)`,
                              boxShadow: `0 0 25px ${c}30`,
                              borderColor: c + "60",
                            }
                          : {}
                      }
                    >
                      <div
                        className={`font-mono text-base font-bold tracking-widest mb-1 transition-colors ${
                          active ? "text-white" : "text-slate-300 group-hover:text-white"
                        }`}
                        style={active ? { color: c } : {}}
                      >
                        {r.short}
                      </div>
                      <div className="text-[9px] text-center leading-tight text-slate-500 group-hover:text-slate-400 transition-colors">
                        {r.name.split(" ")[0]}
                      </div>
                      {active && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full" style={{ background: c }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Controls */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="text-xs uppercase font-semibold tracking-widest text-slate-400 mb-3 px-1">
                PARAMETERS
              </div>

              <div className="space-y-6">
                {/* BPM Control */}
                <div>
                  <div className="flex justify-between items-baseline mb-2 px-1">
                    <div className="text-xs text-slate-400">HEART RATE</div>
                    <div className="font-mono text-3xl font-semibold text-emerald-300 tabular-nums">
                      {rh.bpmLocked ? "––" : bpm}
                      <span className="text-xs align-bottom ml-1 text-emerald-500/70">bpm</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={rh.minBpm || 30}
                    max={rh.maxBpm || 250}
                    value={bpm}
                    disabled={rh.bpmLocked}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="ecg-slider w-full accent-emerald-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1">
                    <div>{rh.minBpm || 30}</div>
                    <div>{rh.maxBpm || 250}</div>
                  </div>
                </div>

                {/* Gain & Speed */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-2">GAIN</div>
                    <div className="flex gap-2">
                      {[0.5, 1, 2].map((g) => (
                        <button
                          key={g}
                          onClick={() => setGain(g)}
                          className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-all ${
                            gain === g
                              ? "bg-emerald-400 text-black border-emerald-400"
                              : "border-white/20 hover:bg-white/5"
                          }`}
                        >
                          ×{g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-2">SPEED</div>
                    <div className="flex gap-2">
                      {[25, 50].map((s) => (
                        <button
                          key={s}
                          onClick={() => setPaperSpeed(s)}
                          className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-all ${
                            paperSpeed === s
                              ? "bg-white text-black border-white"
                              : "border-white/20 hover:bg-white/5"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] text-center text-slate-500 mt-1">mm/s</div>
                  </div>
                </div>

                {/* Sound toggle */}
                <button
                  onClick={() => setSoundOn((s) => !s)}
                  className={`w-full flex items-center justify-center gap-3 rounded-2xl border py-4 text-sm font-semibold tracking-widest transition-all active:scale-[0.985] ${
                    soundOn
                      ? "bg-emerald-500/10 border-emerald-400 text-emerald-300"
                      : "border-white/20 hover:bg-white/5 text-slate-400"
                  }`}
                >
                  <span className="text-xl">{soundOn ? "🔊" : "🔇"}</span>
                  <span>{soundOn ? "QRS BEEP ENABLED" : "SOUND OFF"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- subcomponents ----------------- */

function VitalBox({
  label,
  unit,
  value,
  color,
  big,
  pulse,
}: {
  label: string;
  unit: string;
  value: string | number;
  color: string;
  big?: boolean;
  pulse?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-5 hover:border-white/20 transition-colors">
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold tracking-widest text-slate-400" style={{ color }}>
          {label}
        </span>
        <span className="text-[10px] tracking-wider text-slate-500 font-mono">{unit}</span>
      </div>
      <div
        className={`font-mono font-bold leading-none tabular-nums transition-all mt-2 ${
          big ? "text-6xl" : "text-5xl"
        } ${pulse ? "scale-105" : "scale-100"}`}
        style={{ color, textShadow: `0 0 22px ${color}55` }}
      >
        {value}
      </div>
    </div>
  );
}

/* ----------------- vitals model ----------------- */

function plethRhythm(r: RhythmId): RhythmId {
  // SpO2 pleth roughly follows pulse; flat when no pulse
  if (r === "asystole" || r === "vfib" || r === "vtach") return "asystole";
  return "tachy"; // smooth-ish pulsatile waveform reused
}

function deriveVitals(rhythm: RhythmId, _hr: number) {
  if (rhythm === "asystole") {
    return { spo2: "--", nibp: "--/--", resp: 0, temp: "35.1" };
  }
  if (rhythm === "vfib" || rhythm === "vtach") {
    return { spo2: "--", nibp: "--/--", resp: rhythm === "vtach" ? 28 : 0, temp: "36.4" };
  }
  let spo2 = 98;
  let sys = 118;
  let dia = 76;
  let resp = 16;

  if (rhythm === "tachy") {
    spo2 = 96; sys = 132; dia = 84; resp = 22;
  } else if (rhythm === "brady") {
    spo2 = 95; sys = 104; dia = 62; resp = 12;
  } else if (rhythm === "afib") {
    spo2 = 94; sys = 138; dia = 88; resp = 20;
  } else if (rhythm === "pvc") {
    spo2 = 97; sys = 122; dia = 78; resp = 17;
  } else if (rhythm === "stemi") {
    spo2 = 92; sys = 146; dia = 92; resp = 24;
  }

  // small live jitter
  const j = (n: number, d: number) => n + Math.round((Math.sin(Date.now() / 4000 + n) * d));
  return {
    spo2: j(spo2, 1),
    nibp: `${j(sys, 2)}/${j(dia, 2)}`,
    resp: j(resp, 1),
    temp: (36.6 + Math.sin(Date.now() / 60000) * 0.2).toFixed(1),
  };
}

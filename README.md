# ECG-heartbeat-monitor
 ECG heartbeat monitor with a scrolling waveform, adjustable BPM, rhythm patterns, and hospital monitor styling.
Scrolling waveform engine (src/ecg.ts + src/EcgTrace.tsx)

Canvas-based real-time trace with classic phosphor-green glow, a bright leading dot, and a fine/coarse ECG grid (25mm/s style).
Physiologically modeled PQRST morphology built from Gaussian P/Q/R/S/T waves, decoupled from frame rate so scrolling stays smooth at any BPM.
9 rhythm patterns, each with distinct waveform behavior:

Normal Sinus Rhythm, Sinus Bradycardia, Sinus Tachycardia
Atrial Fibrillation (irregularly irregular timing + absent P waves + fibrillatory baseline)
PVCs / Bigeminy (alternating wide ventricular complexes)
STEMI (ST-segment elevation injury pattern)
Ventricular Tachycardia (wide monomorphic complexes)
Ventricular Fibrillation (chaotic noise-driven signal)
Asystole (flatline)
Adjustable BPM — a styled slider with per-rhythm valid ranges; locked to "AUTO" for V-Fib/Asystole.

Hospital monitor styling

Patient header bar with live clock, lead/age status pills, and a beat-synced indicator.
Three stacked waveforms: ECG II (main), SpO₂ pleth, and Resp.
Color-coded vital sign boxes (HR, SpO₂, NIBP, RR, Temp) that react to the selected rhythm, with a beat-flash pulse on HR.
Critical alarm banner for life-threatening rhythms.
Optional audible QRS "beep" tone synced to detected R-peaks (Web Audio).
Everything builds cleanly and is served from dist/index.html.

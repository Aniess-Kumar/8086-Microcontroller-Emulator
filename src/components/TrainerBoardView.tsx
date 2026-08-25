import React from 'react';
import { CPU8086 } from '../engine/cpu8086';
import { Radio, ToggleLeft, ToggleRight, Sparkles, Navigation, Disc, Cpu } from 'lucide-react';

interface TrainerBoardViewProps {
  cpu: CPU8086;
  onUpdateHardware: () => void;
}

export const TrainerBoardView: React.FC<TrainerBoardViewProps> = ({ cpu, onUpdateHardware }) => {
  const ledsVal = cpu.trainer.leds;
  const switchesVal = cpu.trainer.switches;
  const sevenSegPatterns = cpu.trainer.sevenSegRawPatterns;
  const stepperAngle = cpu.trainer.stepperMotorAngle;
  const traffic = cpu.trainer.trafficLights;
  const dacHistory = cpu.trainer.dacOutput;

  // Toggle individual DIP switch bit
  const handleToggleSwitch = (bitIndex: number) => {
    const newSwitches = switchesVal ^ (1 << bitIndex);
    cpu.trainer.switches = newSwitches;
    cpu.ppi8255.portB = newSwitches;
    onUpdateHardware();
  };

  // Click matrix keypad key
  const handleKeypadPress = (key: string) => {
    cpu.trainer.matrixKeypadPressedKey = key;
    cpu.keyboardBuffer += key;
    onUpdateHardware();
    setTimeout(() => {
      cpu.trainer.matrixKeypadPressedKey = null;
      onUpdateHardware();
    }, 300);
  };

  // Helper to render individual 7-segment digit from 8-bit pattern
  const render7Segment = (pattern: number, digitIndex: number) => {
    // 7-segment bit layout: A=bit0, B=bit1, C=bit2, D=bit3, E=bit4, F=bit5, G=bit6, DP=bit7
    const a = (pattern & 0x01) !== 0;
    const b = (pattern & 0x02) !== 0;
    const c = (pattern & 0x04) !== 0;
    const d = (pattern & 0x08) !== 0;
    const e = (pattern & 0x10) !== 0;
    const f = (pattern & 0x20) !== 0;
    const g = (pattern & 0x40) !== 0;
    const dp = (pattern & 0x80) !== 0;

    return (
      <div key={digitIndex} className="relative w-12 h-20 bg-neutral-950 rounded-lg p-1.5 border border-neutral-800 shadow-inner flex items-center justify-center">
        <svg viewBox="0 0 60 100" className="w-full h-full">
          {/* Segment A (Top) */}
          <polygon points="12,8 48,8 42,16 18,16" className={a ? 'fill-red-500 drop-shadow-[0_0_6px_#ef4444]' : 'fill-neutral-900'} />
          {/* Segment B (Top Right) */}
          <polygon points="49,10 55,16 51,46 45,42" className={b ? 'fill-red-500 drop-shadow-[0_0_6px_#ef4444]' : 'fill-neutral-900'} />
          {/* Segment C (Bottom Right) */}
          <polygon points="51,54 55,84 49,90 45,58" className={c ? 'fill-red-500 drop-shadow-[0_0_6px_#ef4444]' : 'fill-neutral-900'} />
          {/* Segment D (Bottom) */}
          <polygon points="18,84 42,84 48,92 12,92" className={d ? 'fill-red-500 drop-shadow-[0_0_6px_#ef4444]' : 'fill-neutral-900'} />
          {/* Segment E (Bottom Left) */}
          <polygon points="9,54 15,58 11,84 5,84" className={e ? 'fill-red-500 drop-shadow-[0_0_6px_#ef4444]' : 'fill-neutral-900'} />
          {/* Segment F (Top Left) */}
          <polygon points="9,46 15,42 11,16 5,10" className={f ? 'fill-red-500 drop-shadow-[0_0_6px_#ef4444]' : 'fill-neutral-900'} />
          {/* Segment G (Middle) */}
          <polygon points="16,47 44,47 48,50 44,53 16,53 12,50" className={g ? 'fill-red-500 drop-shadow-[0_0_6px_#ef4444]' : 'fill-neutral-900'} />
          {/* Decimal Point */}
          <circle cx="54" cy="92" r="3" className={dp ? 'fill-red-500 drop-shadow-[0_0_6px_#ef4444]' : 'fill-neutral-900'} />
        </svg>
      </div>
    );
  };

  return (
    <div id="trainer-board-view" className="flex flex-col h-full bg-slate-950 text-slate-100 p-4 gap-5 overflow-y-auto">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide uppercase text-slate-300">
            Microprocessor Hardware Interfacing Trainer Board (8255 PPI / 8254 PIT)
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <span className="bg-slate-900 px-3 py-1 rounded border border-slate-800">
            Port A: <span className="text-emerald-400 font-bold">0x{ledsVal.toString(16).toUpperCase().padStart(2, '0')}</span> (0x80)
          </span>
          <span className="bg-slate-900 px-3 py-1 rounded border border-slate-800">
            Port B: <span className="text-cyan-400 font-bold">0x{switchesVal.toString(16).toUpperCase().padStart(2, '0')}</span> (0x82)
          </span>
          <span className="bg-slate-900 px-3 py-1 rounded border border-slate-800">
            Port C: <span className="text-purple-400 font-bold">0x{cpu.ppi8255.portC.toString(16).toUpperCase().padStart(2, '0')}</span> (0x84)
          </span>
        </div>
      </div>

      {/* Grid of Interfacing Peripherals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* ============================================================ */}
        {/* 1. 8-Bit Data LEDs (Port A Output - 0x80) */}
        {/* ============================================================ */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-rose-400" />
                8-Bit Data LEDs (Port A • 0x80)
              </span>
              <span className="text-[10px] font-mono text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">
                OUT 80H, AL
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-around gap-1 my-2">
              {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => {
                const isLit = (ledsVal & (1 << bit)) !== 0;
                return (
                  <div key={bit} className="flex flex-col items-center gap-1.5">
                    <span className="text-[9px] font-mono text-slate-500 font-bold">D{bit}</span>
                    <div
                      className={`w-6 h-6 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                        isLit
                          ? 'bg-rose-500 border-rose-300 shadow-[0_0_14px_#f43f5e]'
                          : 'bg-neutral-900 border-neutral-700'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${isLit ? 'bg-white' : 'bg-transparent'}`} />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 font-semibold">{1 << bit}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-slate-400 mt-2">
            <span>Binary: <span className="text-white font-bold">{ledsVal.toString(2).padStart(8, '0')}b</span></span>
            <span>Hex: <span className="text-rose-400 font-bold">{ledsVal.toString(16).toUpperCase().padStart(2, '0')}H</span></span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. 8-Bit DIP Input Switches (Port B Input - 0x82) */}
        {/* ============================================================ */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                <ToggleRight className="w-4 h-4 text-cyan-400" />
                8-Bit DIP Switches (Port B • 0x82)
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                IN AL, 82H
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-around gap-1 my-2">
              {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => {
                const isOn = (switchesVal & (1 << bit)) !== 0;
                return (
                  <div key={bit} className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-mono text-slate-500 font-bold">SW{bit}</span>
                    <button
                      id={`dip-switch-${bit}`}
                      onClick={() => handleToggleSwitch(bit)}
                      className={`w-6 h-10 rounded p-1 border transition-all flex flex-col justify-between items-center ${
                        isOn
                          ? 'bg-cyan-900 border-cyan-500 shadow-[0_0_8px_#06b6d4]'
                          : 'bg-neutral-900 border-neutral-700'
                      }`}
                    >
                      <div className={`w-4 h-3.5 rounded-sm transition-all ${isOn ? 'bg-cyan-400 self-start shadow-sm' : 'bg-neutral-600 self-end'}`} />
                      <span className="text-[8px] font-mono text-slate-300 font-bold">{isOn ? '1' : '0'}</span>
                    </button>
                    <span className="text-[9px] font-mono text-slate-400 font-semibold">{1 << bit}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-slate-400 mt-2">
            <span className="text-[11px] text-slate-500">Click switch to toggle bit</span>
            <span>Hex: <span className="text-cyan-400 font-bold">{switchesVal.toString(16).toUpperCase().padStart(2, '0')}H</span></span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. 4-Digit 7-Segment Multiplexed Display */}
        {/* ============================================================ */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                4-Digit 7-Segment Display (Port A / C)
              </span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                Multiplexed
              </span>
            </div>

            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex items-center justify-center gap-4 my-2">
              {[3, 2, 1, 0].map((d) => render7Segment(sevenSegPatterns[d] || 0x3F, d))}
            </div>
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-slate-400 mt-2">
            <span>Digits (3..0): <span className="text-amber-400 font-bold">{cpu.trainer.sevenSegDigits.slice().reverse().map(d => d.toString(16).toUpperCase()).join('')}</span></span>
            <span className="text-[11px] text-slate-500">Segments A-G+DP</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. 4-Phase Stepper Motor Simulator (Port A Lower Nibble) */}
        {/* ============================================================ */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                <Disc className="w-4 h-4 text-emerald-400" />
                4-Phase Stepper Motor (Port A Bits 0-3)
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                Coils: 01H, 02H, 04H, 08H
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-around gap-4 my-2">
              {/* Rotating Stepper Dial */}
              <div className="relative w-24 h-24 rounded-full bg-neutral-900 border-2 border-neutral-700 flex items-center justify-center shadow-inner">
                {/* 4 Stator Coils */}
                <div className={`absolute top-1 w-3 h-2 rounded ${cpu.trainer.stepperMotorStep === 0 ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-neutral-800'}`} />
                <div className={`absolute right-1 w-2 h-3 rounded ${cpu.trainer.stepperMotorStep === 1 ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-neutral-800'}`} />
                <div className={`absolute bottom-1 w-3 h-2 rounded ${cpu.trainer.stepperMotorStep === 2 ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-neutral-800'}`} />
                <div className={`absolute left-1 w-2 h-3 rounded ${cpu.trainer.stepperMotorStep === 3 ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-neutral-800'}`} />

                {/* Rotor Needle */}
                <div
                  className="w-1.5 h-16 bg-gradient-to-t from-slate-600 via-emerald-400 to-rose-500 rounded-full transition-transform duration-300"
                  style={{ transform: `rotate(${stepperAngle}deg)` }}
                />
                <div className="absolute w-4 h-4 rounded-full bg-slate-200 border-2 border-slate-700 shadow-sm" />
              </div>

              {/* Coil status */}
              <div className="flex flex-col gap-1.5 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${cpu.trainer.stepperMotorStep === 0 ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                  <span className="text-slate-300">Phase A (01H)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${cpu.trainer.stepperMotorStep === 1 ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                  <span className="text-slate-300">Phase B (02H)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${cpu.trainer.stepperMotorStep === 2 ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                  <span className="text-slate-300">Phase C (04H)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${cpu.trainer.stepperMotorStep === 3 ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                  <span className="text-slate-300">Phase D (08H)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-slate-400 mt-2">
            <span>Rotor Angle: <span className="text-emerald-400 font-bold">{Math.round(stepperAngle)}°</span></span>
            <span>Active Step: <span className="text-white font-bold">{cpu.trainer.stepperMotorStep + 1} / 4</span></span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5. 4-Way Traffic Light Junction (Port C) */}
        {/* ============================================================ */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-yellow-400" />
                Traffic Intersection Controller (Port C • 0x84)
              </span>
              <span className="text-[10px] font-mono text-yellow-400 bg-yellow-950/80 px-2 py-0.5 rounded border border-yellow-800/60">
                OUT 84H, AL
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 gap-4 my-2">
              {/* North/South Traffic Light */}
              <div className="flex flex-col items-center bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-2">North/South</span>
                <div className="flex flex-col gap-2 p-2 bg-neutral-950 rounded-md border border-neutral-800">
                  <span className={`w-5 h-5 rounded-full transition-all ${traffic.northRed ? 'bg-rose-500 shadow-[0_0_10px_#ef4444]' : 'bg-neutral-800'}`} />
                  <span className={`w-5 h-5 rounded-full transition-all ${traffic.northYellow ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : 'bg-neutral-800'}`} />
                  <span className={`w-5 h-5 rounded-full transition-all ${traffic.northGreen ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-neutral-800'}`} />
                </div>
              </div>

              {/* East/West Traffic Light */}
              <div className="flex flex-col items-center bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-2">East/West</span>
                <div className="flex flex-col gap-2 p-2 bg-neutral-950 rounded-md border border-neutral-800">
                  <span className={`w-5 h-5 rounded-full transition-all ${traffic.eastRed ? 'bg-rose-500 shadow-[0_0_10px_#ef4444]' : 'bg-neutral-800'}`} />
                  <span className={`w-5 h-5 rounded-full transition-all ${traffic.eastYellow ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : 'bg-neutral-800'}`} />
                  <span className={`w-5 h-5 rounded-full transition-all ${traffic.eastGreen ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-neutral-800'}`} />
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 mt-2">
            Status: {traffic.northGreen ? 'North Traffic Flowing' : (traffic.eastGreen ? 'East Traffic Flowing' : 'Transition / Caution')}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 6. 4x4 Matrix Keypad Simulator */}
        {/* ============================================================ */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                4x4 Matrix Keypad (Hex Trainer Keys)
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                Scanned via Port C/B
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-4 gap-2 my-2 font-mono">
              {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'].map((k) => {
                const isPressed = cpu.trainer.matrixKeypadPressedKey === k;
                return (
                  <button
                    key={k}
                    onClick={() => handleKeypadPress(k)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all active:scale-95 ${
                      isPressed
                        ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_8px_#10b981]'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 mt-2 flex justify-between">
            <span>Last Pressed Key:</span>
            <span className="text-emerald-400 font-bold">{cpu.trainer.matrixKeypadPressedKey || 'None'}</span>
          </div>
        </div>

      </div>

      {/* Real-time Oscilloscope Waveform from DAC (Port A) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 font-mono text-xs">
          <span className="font-bold text-slate-200 uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Real-Time Analog Oscilloscope (DAC Output on Port A)
          </span>
          <span className="text-slate-400">0.0V - 5.0V Scale (0x00 - 0xFF)</span>
        </div>

        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 h-28 relative flex items-end overflow-hidden">
          {/* Grid lines */}
          <div className="absolute inset-0 grid grid-rows-4 grid-cols-8 pointer-events-none opacity-20">
            {Array(32).fill(0).map((_, i) => (
              <div key={i} className="border border-emerald-800" />
            ))}
          </div>

          {/* SVG Waveform Polyline */}
          <svg className="w-full h-full" viewBox="0 0 64 256" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#34d399"
              strokeWidth="2.5"
              points={dacHistory.map((val, idx) => `${idx},${256 - val}`).join(' ')}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

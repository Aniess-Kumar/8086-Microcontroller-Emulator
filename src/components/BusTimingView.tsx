import React, { useState } from 'react';
import { CPU8086 } from '../engine/cpu8086';
import { Activity, Clock, Terminal, ShieldAlert } from 'lucide-react';

interface BusTimingViewProps {
  cpu: CPU8086;
}

export const BusTimingView: React.FC<BusTimingViewProps> = ({ cpu }) => {
  const [subTab, setSubTab] = useState<'BUS_TIMING' | 'IO_PORTS' | 'IVT'>('BUS_TIMING');

  const ivtEntries = [
    { num: '00H (0)', name: 'Divide by Zero', type: 'Dedicated Internal Interrupt', addr: '0000:0000', handler: 'Built-in Halt Handler' },
    { num: '01H (1)', name: 'Single Step (TF)', type: 'Dedicated Internal Interrupt', addr: '0000:0004', handler: 'Debugger Step Trap' },
    { num: '02H (2)', name: 'Non-Maskable Interrupt (NMI)', type: 'Hardware Dedicated (Pin 17)', addr: '0000:0008', handler: 'Power Failure / Parity Alarm' },
    { num: '03H (3)', name: 'Breakpoint (1-Byte INT 3)', type: 'Dedicated Software Interrupt', addr: '0000:000C', handler: 'Breakpoint Trap' },
    { num: '04H (4)', name: 'Overflow (INTO with OF=1)', type: 'Dedicated Arithmetic Interrupt', addr: '0000:0010', handler: 'Arithmetic Overflow Exception' },
    { num: '08H (8)', name: '8254 Timer Channel 0 (IRQ0)', type: 'Hardware Maskable (via 8259)', addr: '0000:0020', handler: 'System Clock Tick' },
    { num: '09H (9)', name: 'Keyboard Data Ready (IRQ1)', type: 'Hardware Maskable (via 8259)', addr: '0000:0024', handler: 'Keyboard Scan Service' },
    { num: '10H (16)', name: 'Video Graphics BIOS', type: 'BIOS Software API', addr: '0000:0040', handler: 'Screen Teletype & Draw' },
    { num: '21H (33)', name: 'DOS System Services API', type: 'Operating System Kernel API', addr: '0000:0084', handler: 'Console I/O, Files, Exit' },
  ];

  return (
    <div id="bus-timing-view" className="flex flex-col h-full bg-slate-950 text-slate-100 p-4 gap-4 overflow-y-auto font-mono text-xs">
      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-semibold tracking-wide uppercase text-slate-300">
            Bus Cycles, I/O Subsystem & Interrupt Vectors
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setSubTab('BUS_TIMING')}
            className={`px-3 py-1 text-xs rounded transition ${
              subTab === 'BUS_TIMING' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            8086 Bus Cycle Timing Diagram (T1-T4)
          </button>
          <button
            onClick={() => setSubTab('IO_PORTS')}
            className={`px-3 py-1 text-xs rounded transition ${
              subTab === 'IO_PORTS' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            I/O Port Map (00H - FFH)
          </button>
          <button
            onClick={() => setSubTab('IVT')}
            className={`px-3 py-1 text-xs rounded transition ${
              subTab === 'IVT' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Interrupt Vector Table (IVT)
          </button>
        </div>
      </div>

      {/* SubTab 1: Bus Cycle Timing Waveform */}
      {subTab === 'BUS_TIMING' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
              <span className="font-bold text-amber-400 uppercase flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                8086 Minimum Mode Bus Cycle Waveform (Memory / I/O Read & Write)
              </span>
              <span className="text-[11px] text-slate-400">
                1 Basic Bus Cycle = 4 T-States (T1, T2, T3, T4)
              </span>
            </div>

            {/* Timing Diagram Table */}
            <div className="overflow-x-auto">
              <div className="min-w-[650px] space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                {/* T-States Header */}
                <div className="grid grid-cols-5 gap-2 border-b border-slate-800 pb-2 text-center text-xs font-bold">
                  <div className="text-left text-slate-400">Signal Line</div>
                  <div className="text-amber-400 bg-amber-950/40 py-1 rounded">T1 (Address Latch)</div>
                  <div className="text-cyan-400 bg-cyan-950/40 py-1 rounded">T2 (Control Assert)</div>
                  <div className="text-emerald-400 bg-emerald-950/40 py-1 rounded">T3 / Tw (Data Transfer)</div>
                  <div className="text-purple-400 bg-purple-950/40 py-1 rounded">T4 (Bus Recovery)</div>
                </div>

                {/* Signal 1: CLK */}
                <div className="grid grid-cols-5 gap-2 items-center text-[11px]">
                  <span className="text-slate-300 font-bold">CLK (System Clock)</span>
                  <div className="text-center font-mono text-emerald-400">HIGH / LOW</div>
                  <div className="text-center font-mono text-emerald-400">HIGH / LOW</div>
                  <div className="text-center font-mono text-emerald-400">HIGH / LOW</div>
                  <div className="text-center font-mono text-emerald-400">HIGH / LOW</div>
                </div>

                {/* Signal 2: ALE */}
                <div className="grid grid-cols-5 gap-2 items-center text-[11px] bg-slate-900/50 p-1.5 rounded">
                  <span className="text-amber-300 font-bold">ALE (Address Latch Enable)</span>
                  <div className="text-center font-bold text-emerald-400 bg-emerald-950/80 rounded py-0.5">HIGH (Pulse)</div>
                  <div className="text-center text-slate-500">LOW</div>
                  <div className="text-center text-slate-500">LOW</div>
                  <div className="text-center text-slate-500">LOW</div>
                </div>

                {/* Signal 3: AD0-AD15 */}
                <div className="grid grid-cols-5 gap-2 items-center text-[11px]">
                  <span className="text-cyan-300 font-bold">AD0 - AD15 (Mux Bus)</span>
                  <div className="text-center text-amber-300 font-semibold bg-slate-800 rounded py-0.5">Address A0-A15</div>
                  <div className="text-center text-slate-400">Float / Tri-State</div>
                  <div className="text-center text-emerald-400 font-bold bg-emerald-950/80 rounded py-0.5">Data D0-D15 (Read/Write)</div>
                  <div className="text-center text-slate-500">Hold / Float</div>
                </div>

                {/* Signal 4: A16-A19 / S3-S6 */}
                <div className="grid grid-cols-5 gap-2 items-center text-[11px] bg-slate-900/50 p-1.5 rounded">
                  <span className="text-purple-300 font-bold">A16-A19 / S3-S6</span>
                  <div className="text-center text-amber-300 font-semibold bg-slate-800 rounded py-0.5">Address A16-A19</div>
                  <div className="text-center text-purple-300 bg-purple-950/60 rounded py-0.5">Status S3-S6</div>
                  <div className="text-center text-purple-300 bg-purple-950/60 rounded py-0.5">Status S3-S6</div>
                  <div className="text-center text-slate-500">Float</div>
                </div>

                {/* Signal 5: /RD */}
                <div className="grid grid-cols-5 gap-2 items-center text-[11px]">
                  <span className="text-rose-300 font-bold">/RD (Read Strobe)</span>
                  <div className="text-center text-slate-500">HIGH (1)</div>
                  <div className="text-center text-rose-400 font-bold bg-rose-950/80 rounded py-0.5">LOW (0 - Active)</div>
                  <div className="text-center text-rose-400 font-bold bg-rose-950/80 rounded py-0.5">LOW (0 - Active)</div>
                  <div className="text-center text-slate-500">HIGH (1)</div>
                </div>

                {/* Signal 6: /WR */}
                <div className="grid grid-cols-5 gap-2 items-center text-[11px] bg-slate-900/50 p-1.5 rounded">
                  <span className="text-rose-300 font-bold">/WR (Write Strobe)</span>
                  <div className="text-center text-slate-500">HIGH (1)</div>
                  <div className="text-center text-rose-400 font-bold bg-rose-950/80 rounded py-0.5">LOW (0 - Active)</div>
                  <div className="text-center text-rose-400 font-bold bg-rose-950/80 rounded py-0.5">LOW (0 - Active)</div>
                  <div className="text-center text-slate-500">HIGH (1)</div>
                </div>

                {/* Signal 7: READY */}
                <div className="grid grid-cols-5 gap-2 items-center text-[11px]">
                  <span className="text-emerald-300 font-bold">READY (Wait States)</span>
                  <div className="text-center text-slate-400">Checked</div>
                  <div className="text-center text-slate-400">Sampled</div>
                  <div className="text-center text-emerald-400 font-bold bg-emerald-950/80 rounded py-0.5">HIGH (No Tw inserted)</div>
                  <div className="text-center text-slate-400">Complete</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: I/O Ports Map */}
      {subTab === 'IO_PORTS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
          <div className="font-bold text-amber-400 uppercase border-b border-slate-800 pb-2">
            64KB I/O Address Space (Common Micro-trainer Port Allocations)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="text-cyan-400 font-bold border-b border-slate-800 pb-1">
                8255A Programmable Peripheral Interface (PPI #1)
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Port 80H:</span> <span className="text-emerald-400 font-bold">Port A (8 Data LEDs / DAC) = 0x{cpu.ppi8255.portA.toString(16).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Port 82H:</span> <span className="text-cyan-400 font-bold">Port B (8 DIP Switches) = 0x{cpu.ppi8255.portB.toString(16).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Port 84H:</span> <span className="text-purple-400 font-bold">Port C (Traffic / 7-Seg / Keypad) = 0x{cpu.ppi8255.portC.toString(16).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Port 86H:</span> <span className="text-amber-400 font-bold">Control Word Register = 0x{cpu.ppi8255.controlWord.toString(16).toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="text-amber-400 font-bold border-b border-slate-800 pb-1">
                8254/8253 Programmable Interval Timer (PIT)
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Port 40H:</span> <span className="text-slate-300">Counter 0 (System Tick Clock)</span>
                </div>
                <div className="flex justify-between">
                  <span>Port 42H:</span> <span className="text-slate-300">Counter 1 (RAM Refresh Trigger)</span>
                </div>
                <div className="flex justify-between">
                  <span>Port 44H:</span> <span className="text-slate-300">Counter 2 (PC Speaker Tone)</span>
                </div>
                <div className="flex justify-between">
                  <span>Port 46H:</span> <span className="text-amber-400 font-bold">Timer Control Register</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 3: Interrupt Vector Table */}
      {subTab === 'IVT' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="font-bold text-amber-400 uppercase flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              8086 Interrupt Vector Table (IVT: 00000H to 003FFH • 256 Vectors × 4 Bytes)
            </span>
            <span className="text-[11px] text-slate-400">4 Bytes per Vector: Offset (2 Bytes) + CS (2 Bytes)</span>
          </div>

          <div className="divide-y divide-slate-800 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 p-2.5 bg-slate-900 text-slate-400 font-bold text-[11px]">
              <span className="col-span-2">INT Type</span>
              <span className="col-span-4">Interrupt Name</span>
              <span className="col-span-3">Category</span>
              <span className="col-span-3">IVT Physical Address</span>
            </div>
            {ivtEntries.map((e) => (
              <div key={e.num} className="grid grid-cols-12 gap-2 p-2.5 items-center text-xs hover:bg-slate-900/60">
                <span className="col-span-2 font-bold text-emerald-400">INT {e.num}</span>
                <span className="col-span-4 text-white font-semibold">{e.name}</span>
                <span className="col-span-3 text-cyan-300 text-[11px]">{e.type}</span>
                <span className="col-span-3 text-purple-300 font-mono text-[11px]">{e.addr}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

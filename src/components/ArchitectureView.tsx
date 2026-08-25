import React from 'react';
import { CPU8086 } from '../engine/cpu8086';
import { Cpu, ArrowRight, ArrowDown, Layers, Activity, Zap } from 'lucide-react';

interface ArchitectureViewProps {
  cpu: CPU8086;
}

export const ArchitectureView: React.FC<ArchitectureViewProps> = ({ cpu }) => {
  const cs = cpu.registers.cs;
  const ip = cpu.registers.ip;
  const physAddr = cpu.getPhysicalAddress(cs, ip);

  const queueBytes = cpu.biu.queue;
  const queueSlots = [0, 1, 2, 3, 4, 5];

  return (
    <div id="architecture-view" className="flex flex-col h-full bg-slate-950 text-slate-100 p-4 gap-4 overflow-y-auto">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-semibold tracking-wide uppercase text-slate-300">
            8086 Internal Architecture (BIU & EU Pipeline)
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
          <span className="bg-slate-900 px-3 py-1 rounded border border-slate-800">
            Pipeline: <span className="text-emerald-400 font-bold">Parallel Overlapped Execution</span>
          </span>
          <span className="bg-slate-900 px-3 py-1 rounded border border-slate-800">
            Cycle State: <span className="text-cyan-400 font-bold">{cpu.biu.tState}</span>
          </span>
        </div>
      </div>

      {/* Main Architecture Diagram: BIU (Top) & EU (Bottom) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* ============================================================ */}
        {/* 1. BUS INTERFACE UNIT (BIU) */}
        {/* ============================================================ */}
        <div className="bg-slate-900/90 border-2 border-indigo-900/60 rounded-2xl p-5 shadow-xl flex flex-col gap-4 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-indigo-800/40 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"></span>
              <h3 className="font-mono font-bold text-indigo-300 text-sm tracking-wider uppercase">
                Bus Interface Unit (BIU)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded border border-indigo-800/60">
              Responsible for Memory & I/O Bus Operations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Segment Registers & IP */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 font-mono text-xs">
              <div className="text-[11px] text-slate-400 uppercase font-semibold border-b border-slate-800 pb-1 flex justify-between">
                <span>Segment Registers & IP</span>
                <span className="text-indigo-400">16-Bit</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">CS (Code Segment)</div>
                  <div className="text-sm font-bold text-emerald-400">
                    0x{cpu.registers.cs.toString(16).toUpperCase().padStart(4, '0')}
                  </div>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">DS (Data Segment)</div>
                  <div className="text-sm font-bold text-cyan-400">
                    0x{cpu.registers.ds.toString(16).toUpperCase().padStart(4, '0')}
                  </div>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">SS (Stack Segment)</div>
                  <div className="text-sm font-bold text-purple-400">
                    0x{cpu.registers.ss.toString(16).toUpperCase().padStart(4, '0')}
                  </div>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">ES (Extra Segment)</div>
                  <div className="text-sm font-bold text-amber-400">
                    0x{cpu.registers.es.toString(16).toUpperCase().padStart(4, '0')}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/90 p-2 rounded border border-indigo-800/60 mt-1 flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-indigo-300 font-semibold">IP (Instruction Pointer)</div>
                  <div className="text-sm font-bold text-white">
                    0x{cpu.registers.ip.toString(16).toUpperCase().padStart(4, '0')}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 text-right">
                  Next Fetch Offset
                </div>
              </div>
            </div>

            {/* 20-Bit Physical Address Dedicated Adder */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between font-mono text-xs">
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-semibold border-b border-slate-800 pb-1 flex justify-between">
                  <span>20-Bit Address Generation Adder</span>
                  <span className="text-emerald-400">1MB Range</span>
                </div>
                
                <div className="mt-3 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Segment * 16 (CS &lt;&lt; 4):</span>
                    <span className="text-emerald-400 font-bold">
                      0x{(cs << 4).toString(16).toUpperCase().padStart(5, '0')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>+ Offset (IP):</span>
                    <span className="text-cyan-400 font-bold">
                      + 0x{ip.toString(16).toUpperCase().padStart(4, '0')}
                    </span>
                  </div>
                  <div className="border-t border-slate-700 pt-1.5 flex justify-between items-center">
                    <span className="font-bold text-slate-200">20-Bit Physical Addr:</span>
                    <span className="text-base font-bold text-yellow-300 bg-yellow-950/80 px-2 py-0.5 rounded border border-yellow-700/60">
                      0x{physAddr.toString(16).toUpperCase().padStart(5, '0')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 bg-slate-900 p-2 rounded border border-slate-800 mt-2">
                Physical Address = (Segment Base × 16) + Effective Offset
              </div>
            </div>
          </div>

          {/* 6-Byte Instruction Prefetch Queue */}
          <div className="bg-slate-950/90 border border-indigo-900/80 rounded-xl p-3 font-mono text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-300 uppercase flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                6-Byte Instruction Prefetch Queue (FIFO)
              </span>
              <span className="text-[10px] text-slate-400">
                {queueBytes.length} / 6 Bytes Queued
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2 text-center">
              {queueSlots.map((slot) => {
                const val = queueBytes[slot];
                const hasByte = val !== undefined;
                return (
                  <div
                    key={slot}
                    className={`p-2 rounded-lg border transition-all ${
                      hasByte
                        ? 'bg-indigo-950/60 border-indigo-600 text-indigo-200 shadow-sm'
                        : 'bg-slate-900/40 border-slate-800 text-slate-600'
                    }`}
                  >
                    <div className="text-[9px] text-slate-500 mb-0.5">Q{slot + 1}</div>
                    <div className="font-bold text-sm">
                      {hasByte ? `0x${val.toString(16).toUpperCase().padStart(2, '0')}` : '--'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
              <span>← Fetched from Memory into Queue</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                Dispatched to Execution Unit <ArrowDown className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. EXECUTION UNIT (EU) */}
        {/* ============================================================ */}
        <div className="bg-slate-900/90 border-2 border-emerald-900/60 rounded-2xl p-5 shadow-xl flex flex-col gap-4 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-emerald-800/40 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
              <h3 className="font-mono font-bold text-emerald-300 text-sm tracking-wider uppercase">
                Execution Unit (EU)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-800/60">
              Decodes & Executes 8086 Machine Instructions
            </span>
          </div>

          {/* ALU (Arithmetic Logic Unit) & Control Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 16-Bit ALU */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 font-mono text-xs">
              <div className="text-[11px] text-slate-400 uppercase font-semibold border-b border-slate-800 pb-1 flex justify-between">
                <span>16-Bit Arithmetic Logic Unit (ALU)</span>
                <span className="text-emerald-400 font-bold">{cpu.eu.aluOpName}</span>
              </div>

              <div className="space-y-2 mt-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Operand 1:</span>
                  <span className="text-cyan-300 font-bold">
                    0x{cpu.eu.aluOp1.toString(16).toUpperCase().padStart(4, '0')} ({cpu.eu.aluOp1})
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Operand 2:</span>
                  <span className="text-amber-300 font-bold">
                    0x{cpu.eu.aluOp2.toString(16).toUpperCase().padStart(4, '0')} ({cpu.eu.aluOp2})
                  </span>
                </div>
                <div className="border-t border-slate-700 pt-1.5 flex justify-between items-center">
                  <span className="font-bold text-slate-200">ALU Output Result:</span>
                  <span className="text-sm font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                    0x{cpu.eu.aluResult.toString(16).toUpperCase().padStart(4, '0')}
                  </span>
                </div>
              </div>
            </div>

            {/* Instruction Decoder & Micro-sequencer */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between font-mono text-xs">
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-semibold border-b border-slate-800 pb-1 flex justify-between">
                  <span>Instruction Decoder</span>
                  <span className="text-purple-400 font-bold">EU Control</span>
                </div>

                <div className="mt-2 space-y-1.5">
                  <div className="text-[10px] text-slate-400">Current Mnemonic:</div>
                  <div className="text-base font-bold text-white bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    {cpu.eu.currentMnemonic}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2">Active Microstep:</div>
                  <div className="text-[11px] text-emerald-300 leading-snug">
                    {cpu.eu.microStep}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                <Zap className="w-3 h-3 text-amber-400" />
                Total T-States: {cpu.totalCycles} | Inst Count: {cpu.instructionsExecuted}
              </div>
            </div>
          </div>

          {/* General Registers & Flags */}
          <div className="bg-slate-950/90 border border-emerald-900/80 rounded-xl p-3 font-mono text-xs">
            <div className="text-xs font-bold text-emerald-300 uppercase mb-2">
              EU Working Registers (AX, BX, CX, DX, SI, DI, BP, SP)
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500">AX (AH:AL)</div>
                <div className="font-bold text-white">0x{cpu.registers.ax.toString(16).toUpperCase().padStart(4, '0')}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500">BX (BH:BL)</div>
                <div className="font-bold text-white">0x{cpu.registers.bx.toString(16).toUpperCase().padStart(4, '0')}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500">CX (CH:CL)</div>
                <div className="font-bold text-white">0x{cpu.registers.cx.toString(16).toUpperCase().padStart(4, '0')}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500">DX (DH:DL)</div>
                <div className="font-bold text-white">0x{cpu.registers.dx.toString(16).toUpperCase().padStart(4, '0')}</div>
              </div>

              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500">SI (Source Idx)</div>
                <div className="font-bold text-cyan-300">0x{cpu.registers.si.toString(16).toUpperCase().padStart(4, '0')}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500">DI (Dest Idx)</div>
                <div className="font-bold text-cyan-300">0x{cpu.registers.di.toString(16).toUpperCase().padStart(4, '0')}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500">BP (Base Ptr)</div>
                <div className="font-bold text-amber-300">0x{cpu.registers.bp.toString(16).toUpperCase().padStart(4, '0')}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500">SP (Stack Ptr)</div>
                <div className="font-bold text-purple-300">0x{cpu.registers.sp.toString(16).toUpperCase().padStart(4, '0')}</div>
              </div>
            </div>

            {/* 16-Bit Flag Register Bits */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Flags Register:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { name: 'OF', val: cpu.flags.of, desc: 'Overflow Flag' },
                  { name: 'DF', val: cpu.flags.df, desc: 'Direction Flag' },
                  { name: 'IF', val: cpu.flags.if_, desc: 'Interrupt Enable' },
                  { name: 'TF', val: cpu.flags.tf, desc: 'Trap Flag' },
                  { name: 'SF', val: cpu.flags.sf, desc: 'Sign Flag' },
                  { name: 'ZF', val: cpu.flags.zf, desc: 'Zero Flag' },
                  { name: 'AF', val: cpu.flags.af, desc: 'Auxiliary Carry' },
                  { name: 'PF', val: cpu.flags.pf, desc: 'Parity Flag' },
                  { name: 'CF', val: cpu.flags.cf, desc: 'Carry Flag' },
                ].map((f) => (
                  <div
                    key={f.name}
                    title={`${f.desc}: ${f.val ? '1 (SET)' : '0 (CLEAR)'}`}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                      f.val
                        ? 'bg-emerald-500 text-slate-950 shadow-[0_0_6px_#10b981]'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {f.name}:{f.val ? '1' : '0'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

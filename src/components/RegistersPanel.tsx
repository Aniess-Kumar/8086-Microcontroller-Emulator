import React, { useState } from 'react';
import { CPU8086 } from '../engine/cpu8086';
import { Database, Check } from 'lucide-react';

interface RegistersPanelProps {
  cpu: CPU8086;
  onUpdate: () => void;
  isDark?: boolean;
}

export const RegistersPanel: React.FC<RegistersPanelProps> = ({ cpu, onUpdate, isDark = false }) => {
  const [numFormat, setNumFormat] = useState<'HEX' | 'DEC' | 'BIN'>('HEX');
  const [editingReg, setEditingReg] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const formatVal16 = (val: number) => {
    if (numFormat === 'HEX') return `0x${val.toString(16).toUpperCase().padStart(4, '0')}`;
    if (numFormat === 'DEC') return `${val.toString(10)}`;
    return `${val.toString(2).padStart(16, '0')}b`;
  };

  const formatVal8 = (val: number) => {
    if (numFormat === 'HEX') return `0x${val.toString(16).toUpperCase().padStart(2, '0')}`;
    if (numFormat === 'DEC') return `${val.toString(10)}`;
    return `${val.toString(2).padStart(8, '0')}b`;
  };

  const handleFlagToggle = (flagKey: keyof typeof cpu.flags) => {
    cpu.flags[flagKey] = !cpu.flags[flagKey];
    onUpdate();
  };

  const handleStartEdit = (regName: string, currentVal: number) => {
    setEditingReg(regName);
    setEditValue(currentVal.toString(16).toUpperCase());
  };

  const handleSaveEdit = (regName: string) => {
    const parsed = parseInt(editValue, 16);
    if (!isNaN(parsed)) {
      cpu.setRegister(regName, parsed);
      onUpdate();
    }
    setEditingReg(null);
  };

  return (
    <div
      id="registers-panel"
      className={`border rounded-xl p-3.5 flex flex-col gap-3 font-mono text-xs shadow-xs h-full overflow-y-auto transition-colors duration-200 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Top Title & Format Switch */}
      <div className={`flex items-center justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-1.5 font-bold text-xs">
          <Database className="w-3.5 h-3.5 text-blue-500" />
          <span className={isDark ? 'text-white' : 'text-slate-800'}>8086 Registers & Flags</span>
        </div>
        
        {/* Format Selector */}
        <div className={`flex items-center p-0.5 rounded-lg border text-[10px] ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
          {(['HEX', 'DEC', 'BIN'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setNumFormat(fmt)}
              className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                numFormat === fmt
                  ? isDark ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-white text-blue-700 font-bold shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* 1. General Purpose Registers (AX, BX, CX, DX) */}
      <div className="space-y-1.5">
        <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          General Purpose Registers
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'AX', val: cpu.registers.ax, h: 'AH', l: 'AL', hVal: (cpu.registers.ax >> 8) & 0xFF, lVal: cpu.registers.ax & 0xFF, desc: 'Accumulator' },
            { name: 'BX', val: cpu.registers.bx, h: 'BH', l: 'BL', hVal: (cpu.registers.bx >> 8) & 0xFF, lVal: cpu.registers.bx & 0xFF, desc: 'Base' },
            { name: 'CX', val: cpu.registers.cx, h: 'CH', l: 'CL', hVal: (cpu.registers.cx >> 8) & 0xFF, lVal: cpu.registers.cx & 0xFF, desc: 'Count' },
            { name: 'DX', val: cpu.registers.dx, h: 'DH', l: 'DL', hVal: (cpu.registers.dx >> 8) & 0xFF, lVal: cpu.registers.dx & 0xFF, desc: 'Data' },
          ].map((reg) => (
            <div
              key={reg.name}
              className={`border rounded-lg p-2 flex flex-col gap-1 transition ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{reg.name}</span>
                {editingReg === reg.name ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(reg.name)}
                      className={`w-16 rounded px-1 text-[11px] outline-none border ${
                        isDark ? 'bg-slate-800 text-white border-blue-500' : 'bg-white text-slate-900 border-blue-500'
                      }`}
                      autoFocus
                    />
                    <button onClick={() => handleSaveEdit(reg.name)} className="text-emerald-500 hover:text-emerald-400">
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span
                    onClick={() => handleStartEdit(reg.name, reg.val)}
                    className={`font-bold hover:underline cursor-pointer ${
                      isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-700 hover:text-blue-900'
                    }`}
                    title="Click to edit value in Hex"
                  >
                    {formatVal16(reg.val)}
                  </span>
                )}
              </div>

              {/* High & Low byte display */}
              <div className={`grid grid-cols-2 gap-1 text-[10px] border-t pt-1 ${isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200/80 text-slate-500'}`}>
                <div>
                  <span className="text-slate-500">{reg.h}:</span>{' '}
                  <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{formatVal8(reg.hVal)}</span>
                </div>
                <div>
                  <span className="text-slate-500">{reg.l}:</span>{' '}
                  <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{formatVal8(reg.lVal)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Pointer & Index Registers (SI, DI, BP, SP, IP) */}
      <div className="space-y-1.5">
        <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Pointer & Index Registers
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {[
            { name: 'SI', val: cpu.registers.si, desc: 'Source Index' },
            { name: 'DI', val: cpu.registers.di, desc: 'Dest Index' },
            { name: 'BP', val: cpu.registers.bp, desc: 'Base Pointer' },
            { name: 'SP', val: cpu.registers.sp, desc: 'Stack Pointer' },
            { name: 'IP', val: cpu.registers.ip, desc: 'Instruction Ptr' },
          ].map((reg) => (
            <div
              key={reg.name}
              className={`border rounded-lg px-2 py-1.5 flex items-center justify-between transition ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{reg.name}</span>
              <span
                onClick={() => handleStartEdit(reg.name, reg.val)}
                className={`font-bold cursor-pointer ${
                  isDark ? 'text-slate-100 hover:text-blue-400' : 'text-slate-900 hover:text-blue-700'
                }`}
                title="Click to edit"
              >
                {formatVal16(reg.val)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Segment Registers (CS, DS, SS, ES) */}
      <div className="space-y-1.5">
        <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Segment Registers & Base Addresses
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {[
            { name: 'CS', val: cpu.registers.cs, desc: 'Code Seg' },
            { name: 'DS', val: cpu.registers.ds, desc: 'Data Seg' },
            { name: 'SS', val: cpu.registers.ss, desc: 'Stack Seg' },
            { name: 'ES', val: cpu.registers.es, desc: 'Extra Seg' },
          ].map((reg) => (
            <div
              key={reg.name}
              className={`border rounded-lg px-2 py-1.5 flex flex-col transition ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{reg.name}</span>
                <span
                  onClick={() => handleStartEdit(reg.name, reg.val)}
                  className={`font-bold cursor-pointer ${
                    isDark ? 'text-slate-100 hover:text-blue-400' : 'text-slate-900 hover:text-blue-700'
                  }`}
                  title="Click to edit"
                >
                  {formatVal16(reg.val)}
                </span>
              </div>
              <span className="text-[9px] text-slate-500 font-sans">Base: 0x{(reg.val << 4).toString(16).toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Flags Register (CF, ZF, SF, OF, PF, AF, IF, DF) */}
      <div className="space-y-1.5">
        <div className={`flex items-center justify-between text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <span>Status & Control Flags</span>
          <span className="text-slate-500 font-normal font-sans">(Click flag to toggle)</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
          {[
            { key: 'cf', name: 'CF', desc: 'Carry Flag', active: cpu.flags.cf },
            { key: 'zf', name: 'ZF', desc: 'Zero Flag', active: cpu.flags.zf },
            { key: 'sf', name: 'SF', desc: 'Sign Flag', active: cpu.flags.sf },
            { key: 'of', name: 'OF', desc: 'Overflow Flag', active: cpu.flags.of },
            { key: 'pf', name: 'PF', desc: 'Parity Flag', active: cpu.flags.pf },
            { key: 'af', name: 'AF', desc: 'Aux Carry Flag', active: cpu.flags.af },
            { key: 'if', name: 'IF', desc: 'Interrupt Flag', active: cpu.flags.if },
            { key: 'df', name: 'DF', desc: 'Direction Flag', active: cpu.flags.df },
          ].map((flag) => (
            <button
              key={flag.name}
              onClick={() => handleFlagToggle(flag.key as any)}
              className={`p-1.5 rounded-lg border text-center font-bold text-xs transition cursor-pointer ${
                flag.active
                  ? isDark
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-2xs'
                    : 'bg-emerald-100 border-emerald-300 text-emerald-800 shadow-2xs'
                  : isDark
                  ? 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700'
              }`}
              title={`${flag.desc}: ${flag.active ? '1 (SET)' : '0 (RESET)'}`}
            >
              <div className="text-[10px]">{flag.name}</div>
              <div className="text-xs">{flag.active ? '1' : '0'}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

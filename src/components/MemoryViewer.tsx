import React, { useState } from 'react';
import { CPU8086 } from '../engine/cpu8086';
import { Database, ArrowRight } from 'lucide-react';

interface MemoryViewerProps {
  cpu: CPU8086;
  onUpdate: () => void;
  isDark?: boolean;
}

export const MemoryViewer: React.FC<MemoryViewerProps> = ({ cpu, onUpdate, isDark = false }) => {
  const [startAddress, setStartAddress] = useState<number>(0x07000); // Default CS:0000
  const [jumpInput, setJumpInput] = useState<string>('0700:0000');
  const [editingAddr, setEditingAddr] = useState<number | null>(null);
  const [editVal, setEditVal] = useState<string>('');

  const rowCount = 16; // 16 rows * 16 bytes = 256 bytes per view
  const currentPhysicalIP = cpu.getPhysicalAddress(cpu.registers.cs, cpu.registers.ip);
  const currentStackTop = cpu.getPhysicalAddress(cpu.registers.ss, cpu.registers.sp);
  const currentDataStart = cpu.getPhysicalAddress(cpu.registers.ds, 0);

  const handleJump = (inputStr: string) => {
    let clean = inputStr.trim().toUpperCase();
    if (clean.includes(':')) {
      const parts = clean.split(':');
      const seg = parseInt(parts[0], 16) || 0;
      const off = parseInt(parts[1], 16) || 0;
      setStartAddress(cpu.getPhysicalAddress(seg, off));
    } else {
      let addr = 0;
      if (clean.endsWith('H')) addr = parseInt(clean.slice(0, -1), 16) || 0;
      else if (clean.startsWith('0X')) addr = parseInt(clean.slice(2), 16) || 0;
      else addr = parseInt(clean, 16) || 0;
      setStartAddress(addr & 0xFFFFF);
    }
  };

  const handleSaveByte = (addr: number) => {
    const val = parseInt(editVal, 16);
    if (!isNaN(val)) {
      cpu.memory[addr] = val & 0xFF;
      onUpdate();
    }
    setEditingAddr(null);
  };

  return (
    <div
      id="memory-viewer"
      className={`flex flex-col h-full p-3.5 gap-3.5 overflow-y-auto font-mono text-xs transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'
      }`}
    >
      {/* Top Controls Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-500" />
          <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>
            1MB Memory Viewer & Hex Editor (20-Bit RAM)
          </span>
        </div>

        {/* Jump Address Input */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center rounded-lg px-2 py-1 shadow-2xs border ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
          }`}>
            <span className="text-slate-500 text-[11px] mr-1">Address:</span>
            <input
              type="text"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJump(jumpInput)}
              placeholder="0700:0000"
              className={`bg-transparent outline-none w-28 text-xs font-mono ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
            />
            <button
              onClick={() => handleJump(jumpInput)}
              className="text-blue-500 hover:text-blue-400 ml-1 cursor-pointer"
              title="Jump to Address"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Jump Shortcuts */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-slate-500 text-[11px] font-sans font-medium">Quick Jump:</span>
        <button
          onClick={() => {
            const addr = cpu.getPhysicalAddress(cpu.registers.cs, cpu.registers.ip);
            setStartAddress(addr & ~0x0F);
            setJumpInput(`0x${addr.toString(16).toUpperCase()}`);
          }}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
            isDark
              ? 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-800/60 text-emerald-300'
              : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
          }`}
        >
          CS:IP (Code: 0x{currentPhysicalIP.toString(16).toUpperCase()})
        </button>

        <button
          onClick={() => {
            const addr = currentDataStart;
            setStartAddress(addr & ~0x0F);
            setJumpInput(`0x${addr.toString(16).toUpperCase()}`);
          }}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
            isDark
              ? 'bg-blue-950/40 hover:bg-blue-900/60 border-blue-800/60 text-blue-300'
              : 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-800'
          }`}
        >
          DS:0000 (Data: 0x{currentDataStart.toString(16).toUpperCase()})
        </button>

        <button
          onClick={() => {
            const addr = currentStackTop;
            setStartAddress(addr & ~0x0F);
            setJumpInput(`0x${addr.toString(16).toUpperCase()}`);
          }}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
            isDark
              ? 'bg-purple-950/40 hover:bg-purple-900/60 border-purple-800/60 text-purple-300'
              : 'bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-800'
          }`}
        >
          SS:SP (Stack: 0x{currentStackTop.toString(16).toUpperCase()})
        </button>

        <button
          onClick={() => {
            setStartAddress(0x00000);
            setJumpInput('0x00000');
          }}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
          }`}
        >
          0000:0000 (IVT)
        </button>
      </div>

      {/* Hex Grid Table */}
      <div className={`border rounded-xl overflow-hidden shadow-2xs ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[11px] ${isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                <th className="py-2 px-3 font-semibold">Offset (20-bit)</th>
                {Array.from({ length: 16 }).map((_, i) => (
                  <th key={i} className="py-2 px-1 text-center font-bold">
                    +{i.toString(16).toUpperCase()}
                  </th>
                ))}
                <th className={`py-2 px-3 font-semibold border-l ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>ASCII</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-[11px] ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
              {Array.from({ length: rowCount }).map((_, rowIndex) => {
                const rowBase = (startAddress + rowIndex * 16) & 0xFFFFF;
                const rowBytes: number[] = [];
                for (let col = 0; col < 16; col++) {
                  rowBytes.push(cpu.memory[(rowBase + col) & 0xFFFFF] || 0);
                }

                return (
                  <tr key={rowBase} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                    <td className={`py-1.5 px-3 font-bold whitespace-nowrap ${isDark ? 'text-blue-400 bg-slate-900/60' : 'text-blue-700 bg-slate-50/50'}`}>
                      0x{rowBase.toString(16).toUpperCase().padStart(5, '0')}
                    </td>
                    {rowBytes.map((byteVal, colIndex) => {
                      const bytePhys = (rowBase + colIndex) & 0xFFFFF;
                      const isIP = bytePhys === currentPhysicalIP;
                      const isSP = bytePhys === currentStackTop;
                      const isDS = bytePhys >= currentDataStart && bytePhys < currentDataStart + 64;

                      return (
                        <td
                          key={colIndex}
                          className={`py-1.5 px-1 text-center font-mono cursor-pointer transition ${
                            isIP
                              ? isDark
                                ? 'bg-emerald-950/80 text-emerald-300 font-bold rounded ring-1 ring-emerald-400'
                                : 'bg-emerald-100 text-emerald-900 font-bold rounded ring-1 ring-emerald-400'
                              : isSP
                              ? isDark
                                ? 'bg-purple-950/80 text-purple-300 font-bold rounded ring-1 ring-purple-400'
                                : 'bg-purple-100 text-purple-900 font-bold rounded ring-1 ring-purple-400'
                              : isDS
                              ? isDark
                                ? 'bg-blue-950/60 text-blue-300 font-medium'
                                : 'bg-blue-50 text-blue-900 font-medium'
                              : isDark
                              ? 'text-slate-300 hover:bg-slate-800'
                              : 'text-slate-700 hover:bg-slate-200'
                          }`}
                          onClick={() => {
                            setEditingAddr(bytePhys);
                            setEditVal(byteVal.toString(16).toUpperCase().padStart(2, '0'));
                          }}
                        >
                          {editingAddr === bytePhys ? (
                            <input
                              type="text"
                              value={editVal}
                              onChange={(e) => setEditVal(e.target.value)}
                              onBlur={() => handleSaveByte(bytePhys)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveByte(bytePhys)}
                              className={`w-7 rounded text-center text-[10px] outline-none font-bold border ${
                                isDark
                                  ? 'bg-slate-800 text-white border-blue-400'
                                  : 'bg-white text-slate-900 border-blue-600'
                              }`}
                              autoFocus
                            />
                          ) : (
                            byteVal.toString(16).toUpperCase().padStart(2, '0')
                          )}
                        </td>
                      );
                    })}
                    <td className={`py-1.5 px-3 font-mono border-l whitespace-nowrap ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                      {rowBytes.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setStartAddress((prev) => Math.max(0, prev - 256))}
          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
          }`}
        >
          ▲ Prev 256 Bytes
        </button>
        <span className="text-slate-500 text-[11px]">
          Showing 256 bytes at 0x{startAddress.toString(16).toUpperCase().padStart(5, '0')}
        </span>
        <button
          onClick={() => setStartAddress((prev) => Math.min(0xFFF00, prev + 256))}
          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
          }`}
        >
          ▼ Next 256 Bytes
        </button>
      </div>
    </div>
  );
};

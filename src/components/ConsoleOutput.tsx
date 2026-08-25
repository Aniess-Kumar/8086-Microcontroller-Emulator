import React, { useState } from 'react';
import { CPU8086 } from '../engine/cpu8086';
import { Terminal, Send, Trash2, ShieldAlert } from 'lucide-react';

interface ConsoleOutputProps {
  cpu: CPU8086;
  onClear: () => void;
  onSendInput: (input: string) => void;
  onTriggerInterrupt: (irqNum: number) => void;
  isDark?: boolean;
}

export const ConsoleOutput: React.FC<ConsoleOutputProps> = ({
  cpu,
  onClear,
  onSendInput,
  onTriggerInterrupt,
  isDark = false,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText) return;
    onSendInput(inputText + '\r\n');
    setInputText('');
  };

  return (
    <div
      id="console-output-container"
      className={`flex flex-col rounded-xl overflow-hidden font-mono text-xs shadow-xs h-full border transition-colors duration-200 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Console Header */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b shrink-0 transition-colors ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-blue-500" />
          <span className={`font-bold uppercase tracking-wider text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            DOS Terminal & Output Console (INT 21H)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onTriggerInterrupt(8)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer border ${
              isDark
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/50'
                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
            title="Trigger INT 08H Timer Interrupt"
          >
            <ShieldAlert className="w-3 h-3 text-amber-500" />
            Fire INT 8
          </button>

          <button
            onClick={onClear}
            className={`p-1 rounded transition cursor-pointer border ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-200'
            }`}
            title="Clear Console Output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Screen (CRT Monitor style) */}
      <div className="flex-1 p-3 bg-[#0a0f18] text-emerald-400 font-mono text-xs overflow-y-auto whitespace-pre-wrap selection:bg-emerald-800 selection:text-white flex flex-col justify-between min-h-[110px]">
        <div>
          <div className="text-slate-600 mb-2 border-b border-slate-800/80 pb-1 text-[11px]">
            *** Intel 8086 MS-DOS Screen (CS:IP = 0x{cpu.registers.cs.toString(16).toUpperCase().padStart(4, '0')}:0x{cpu.registers.ip.toString(16).toUpperCase().padStart(4, '0')}) ***
          </div>
          {cpu.consoleOutput ? (
            <span className="leading-relaxed text-emerald-300 font-mono">{cpu.consoleOutput}</span>
          ) : (
            <span className="text-slate-600 italic">No output yet. Run a program with INT 21H (e.g., Lab 5) to display strings...</span>
          )}
        </div>
      </div>

      {/* Input line for DOS input simulation */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 border-t shrink-0 transition-colors ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <span className="text-blue-500 font-bold ml-1">&gt;</span>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type user input for INT 21H (AH=01H) and press Enter..."
          className={`flex-1 bg-transparent outline-none text-xs font-mono placeholder:text-slate-500 ${
            isDark ? 'text-slate-100' : 'text-slate-800'
          }`}
        />
        <button
          onClick={handleSend}
          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer shadow-xs"
        >
          <Send className="w-3 h-3" />
          Send
        </button>
      </div>
    </div>
  );
};

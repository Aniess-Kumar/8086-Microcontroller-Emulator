import React, { useState, useRef } from 'react';
import { CPU8086 } from '../engine/cpu8086';
import { SAMPLE_PROGRAMS, SampleProgram } from '../data/samplePrograms';
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  AlertTriangle,
  FileCode,
  Copy,
  Download,
  Sparkles,
  BookOpen,
  Maximize2,
  Minimize2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Check,
} from 'lucide-react';

interface CodeEditorProps {
  cpu: CPU8086;
  sourceCode: string;
  onChangeSourceCode: (code: string) => void;
  onAssembleAndLoad: () => void;
  onStep: () => void;
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
  isRunning: boolean;
  clockSpeedHz: number;
  onChangeClockSpeed: (speed: number) => void;
  onOpenDocModal: () => void;
  breakpoints: Set<number>;
  onToggleBreakpoint: (line: number) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  isDark?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  cpu,
  sourceCode,
  onChangeSourceCode,
  onAssembleAndLoad,
  onStep,
  onRun,
  onPause,
  onReset,
  isRunning,
  clockSpeedHz,
  onChangeClockSpeed,
  onOpenDocModal,
  breakpoints,
  onToggleBreakpoint,
  isMaximized = false,
  onToggleMaximize,
  isDark = false,
}) => {
  const [selectedProgramId, setSelectedProgramId] = useState<string>('lab1-add-sub');
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<number>(14);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineGutterRef = useRef<HTMLDivElement>(null);

  const lines = sourceCode.split('\n');
  const activePhysicalAddress = cpu.getPhysicalAddress(cpu.registers.cs, cpu.registers.ip);

  // Find which line corresponds to the current IP
  let activeLineNumber = -1;
  if (cpu.currentListing) {
    for (const [lineNum, phys] of cpu.currentListing.sourceToAddressMap.entries()) {
      if (phys === activePhysicalAddress) {
        activeLineNumber = lineNum;
        break;
      }
    }
  }

  const handleSelectProgram = (prog: SampleProgram) => {
    setSelectedProgramId(prog.id);
    onChangeSourceCode(prog.code);
    setTimeout(() => {
      onAssembleAndLoad();
    }, 50);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sourceCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'program_8086.asm';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm('Clear the code editor?')) {
      onChangeSourceCode('; Intel 8086 Assembly Program\n\nMOV AX, 0000H\nMOV DS, AX\n\n; Write your assembly code here\n\nHLT\n');
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineGutterRef.current) {
      lineGutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const lineItemHeight = fontSize >= 16 ? 24 : 20;

  return (
    <div
      id="code-editor-container"
      className={`flex flex-col h-full rounded-xl overflow-hidden shadow-sm font-mono border transition-colors duration-200 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* 1. TOP HEADER & EXPERIMENT SELECTOR */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b shrink-0 transition-colors ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        {/* Lab Program selector */}
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded border ${isDark ? 'bg-blue-950/60 border-blue-800 text-blue-400' : 'bg-blue-100 border-blue-200 text-blue-700'}`}>
            <FileCode className="w-4 h-4" />
          </div>
          <span className={`text-xs font-bold uppercase tracking-wide hidden sm:inline ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Lab Experiment:
          </span>
          <select
            id="sample-program-select"
            value={selectedProgramId}
            onChange={(e) => {
              const p = SAMPLE_PROGRAMS.find((item) => item.id === e.target.value);
              if (p) handleSelectProgram(p);
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-sans font-medium outline-none transition cursor-pointer max-w-[220px] sm:max-w-xs truncate shadow-xs border ${
              isDark
                ? 'bg-slate-800 text-slate-100 border-slate-700 hover:border-slate-600 focus:border-blue-500'
                : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400 focus:border-blue-500'
            }`}
          >
            <optgroup label="Basic Arithmetic (Lab 1 & 2)">
              {SAMPLE_PROGRAMS.filter((p) => p.category === 'ARITHMETIC').map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </optgroup>
            <optgroup label="Arrays & Sorting (Lab 3 & 4)">
              {SAMPLE_PROGRAMS.filter((p) => p.category === 'ARRAYS_SORTING').map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </optgroup>
            <optgroup label="DOS Interrupts & Strings (Lab 5)">
              {SAMPLE_PROGRAMS.filter((p) => p.category === 'STRINGS_DOS').map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </optgroup>
            <optgroup label="8255 Hardware Interfacing (Lab 6 & 7)">
              {SAMPLE_PROGRAMS.filter((p) => p.category === 'HARDWARE_LAB').map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Action icons & Font controls */}
        <div className="flex items-center gap-1.5 text-xs">
          {/* Font Zoom Controls */}
          <div className={`flex items-center rounded-lg p-0.5 shadow-xs border ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
          }`}>
            <button
              onClick={() => setFontSize((f) => Math.max(11, f - 1))}
              className={`p-1 rounded transition ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
              title="Decrease Font Size"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className={`px-1.5 text-[11px] font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {fontSize}px
            </span>
            <button
              onClick={() => setFontSize((f) => Math.min(20, f + 1))}
              className={`p-1 rounded transition ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
              title="Increase Font Size"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onOpenDocModal}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg border transition font-medium ${
              isDark
                ? 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 border-amber-800/60'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200'
            }`}
            title="8086 Instruction Help"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px]">Instruction Guide</span>
          </button>

          <button
            onClick={handleCopy}
            className={`p-1.5 rounded-lg border transition shadow-xs ${
              isDark
                ? 'bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700'
                : 'bg-white text-slate-600 hover:text-slate-900 border-slate-300 hover:bg-slate-100'
            }`}
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleDownload}
            className={`p-1.5 rounded-lg border transition shadow-xs ${
              isDark
                ? 'bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700'
                : 'bg-white text-slate-600 hover:text-slate-900 border-slate-300 hover:bg-slate-100'
            }`}
            title="Download .asm file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleClear}
            className={`p-1.5 rounded-lg border transition shadow-xs ${
              isDark
                ? 'bg-slate-800 text-slate-300 hover:text-rose-400 border-slate-700 hover:bg-rose-950/40'
                : 'bg-white text-slate-600 hover:text-rose-600 border-slate-300 hover:bg-rose-50'
            }`}
            title="Clear Code"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className={`p-1.5 rounded-lg border transition shadow-xs ${
                isDark
                  ? 'bg-slate-800 text-slate-300 hover:text-blue-400 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-slate-600 hover:text-blue-600 border-slate-300 hover:bg-slate-100'
              }`}
              title={isMaximized ? 'Restore View' : 'Maximize Code'}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* 2. EXECUTION TOOLBAR */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b text-xs shrink-0 transition-colors ${
          isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/80 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Assemble Button */}
          <button
            id="btn-assemble"
            onClick={onAssembleAndLoad}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition active:scale-95 text-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Assemble & Load
          </button>

          {/* Step Button */}
          <button
            id="btn-step"
            onClick={onStep}
            disabled={isRunning || cpu.isHalted}
            className={`flex items-center gap-1.5 px-3 py-1.5 disabled:opacity-50 font-semibold rounded-lg border shadow-xs transition active:scale-95 text-xs cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Execute single instruction step"
          >
            <StepForward className="w-3.5 h-3.5 text-blue-500" />
            Single Step
          </button>

          {/* Run / Pause Button */}
          {isRunning ? (
            <button
              id="btn-pause"
              onClick={onPause}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs transition active:scale-95 text-xs cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause
            </button>
          ) : (
            <button
              id="btn-run"
              onClick={onRun}
              disabled={cpu.isHalted}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-xs transition active:scale-95 text-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Run Program
            </button>
          )}

          {/* Reset Button */}
          <button
            id="btn-reset"
            onClick={onReset}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-lg border shadow-xs transition active:scale-95 text-xs cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Reset CPU to initial state"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
            Reset
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-2 text-xs">
          <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Speed:</span>
          <select
            value={clockSpeedHz}
            onChange={(e) => onChangeClockSpeed(Number(e.target.value))}
            className={`rounded-lg px-2.5 py-1 text-xs font-mono outline-none cursor-pointer shadow-xs border ${
              isDark
                ? 'bg-slate-800 text-slate-100 border-slate-700 hover:border-slate-600'
                : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400'
            }`}
          >
            <option value={1}>1 Hz (Slow Step)</option>
            <option value={5}>5 Hz</option>
            <option value={20}>20 Hz (Standard)</option>
            <option value={50}>50 Hz</option>
            <option value={200}>200 Hz (Fast)</option>
          </select>
        </div>
      </div>

      {/* 3. ERROR DIAGNOSTICS BANNER */}
      {cpu.currentListing && cpu.currentListing.errors.length > 0 && (
        <div className="p-3 bg-rose-500/10 border-b border-rose-500/30 text-rose-500 flex items-start gap-2.5 shrink-0">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-xs">Assembly Error ({cpu.currentListing.errors.length}):</span>
            {cpu.currentListing.errors.map((err, i) => (
              <div key={i} className="text-xs font-mono bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40">
                Line {err.line}: {err.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. EXPANSIVE CODE EDITOR & LINE NUMBER GUTTER */}
      <div className={`relative flex-1 flex overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        {/* Line Numbers & Breakpoints */}
        <div
          ref={lineGutterRef}
          className={`w-14 border-r py-3.5 select-none flex flex-col items-end pr-2.5 font-mono overflow-hidden shrink-0 transition-colors ${
            isDark ? 'bg-slate-950/70 border-slate-800 text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-400'
          }`}
          style={{ fontSize: `${fontSize}px` }}
        >
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const isActive = lineNum === activeLineNumber;
            const hasBreakpoint = breakpoints.has(lineNum);
            return (
              <div
                key={lineNum}
                onClick={() => onToggleBreakpoint(lineNum)}
                style={{ height: `${lineItemHeight}px` }}
                className={`w-full flex items-center justify-end gap-1.5 cursor-pointer transition ${
                  isActive
                    ? isDark ? 'text-emerald-400 font-bold bg-emerald-950/50' : 'text-emerald-700 font-bold bg-emerald-100/60'
                    : isDark ? 'hover:text-slate-300' : 'hover:text-slate-800'
                }`}
              >
                {hasBreakpoint && (
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs shrink-0" />
                )}
                {isActive && (
                  <span className="text-[11px] text-emerald-500 font-bold shrink-0">▶</span>
                )}
                <span className="tabular-nums">{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Code Text Area */}
        <textarea
          id="assembly-editor-input"
          ref={textareaRef}
          value={sourceCode}
          onChange={(e) => onChangeSourceCode(e.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          style={{ fontSize: `${fontSize}px`, lineHeight: `${lineItemHeight}px` }}
          placeholder="; Enter your 8086 Assembly code here..."
          className={`flex-1 p-3.5 font-mono resize-none outline-none focus:ring-0 overflow-y-auto whitespace-pre ${
            isDark
              ? 'bg-slate-900 text-slate-100 selection:bg-blue-900 selection:text-white'
              : 'bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900'
          }`}
        />
      </div>

      {/* 5. FOOTER STATUS BAR */}
      <div
        className={`flex flex-wrap justify-between items-center px-3.5 py-1.5 border-t text-[11px] shrink-0 transition-colors ${
          isDark ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-4">
          <span>Target: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Intel 8086 (16-Bit)</strong></span>
          <span>CS:IP Address: <strong className="text-blue-500 font-mono">0x{cpu.registers.cs.toString(16).toUpperCase().padStart(4, '0')}:0x{cpu.registers.ip.toString(16).toUpperCase().padStart(4, '0')}</strong></span>
          <span>Lines: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{lines.length}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span>Status: {cpu.isHalted ? <strong className="text-rose-500">HALTED</strong> : (isRunning ? <strong className="text-emerald-500">RUNNING</strong> : <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>READY</strong>)}</span>
        </div>
      </div>
    </div>
  );
};

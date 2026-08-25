import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CPU8086 } from './engine/cpu8086';
import { Assembler8086 } from './engine/assembler';
import { SAMPLE_PROGRAMS } from './data/samplePrograms';

import { CodeEditor } from './components/CodeEditor';
import { RegistersPanel } from './components/RegistersPanel';
import { ChipPinoutView } from './components/ChipPinoutView';
import { MemoryViewer } from './components/MemoryViewer';
import { ConsoleOutput } from './components/ConsoleOutput';
import { InstructionRefModal } from './components/InstructionRefModal';

import {
  Cpu,
  Database,
  BookOpen,
  Terminal,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
} from 'lucide-react';

type RightSideTab = 'CHIP_PINOUT' | 'MEMORY_MAP';
type LayoutMode = 'EXPANDED_CODE' | 'BALANCED' | 'FULL_CODE';
type ThemeMode = 'light' | 'dark';

export default function App() {
  const cpuRef = useRef<CPU8086>(new CPU8086());
  const cpu = cpuRef.current;

  // React re-render trigger
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  // Theme state with local storage persistence
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('8086_lab_theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('8086_lab_theme', next);
      } catch {}
      return next;
    });
  };

  const [activeTab, setActiveTab] = useState<RightSideTab>('CHIP_PINOUT');
  const [sourceCode, setSourceCode] = useState<string>(SAMPLE_PROGRAMS[0].code);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [clockSpeedHz, setClockSpeedHz] = useState<number>(20);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [outputTab, setOutputTab] = useState<'REGISTERS' | 'CONSOLE'>('REGISTERS');
  
  // Layout states for enlarged code editing experience
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('EXPANDED_CODE');
  const [isOutputPanelExpanded, setIsOutputPanelExpanded] = useState<boolean>(true);

  // Initial Assembly on load
  useEffect(() => {
    handleAssembleAndLoad(SAMPLE_PROGRAMS[0].code);
  }, []);

  // Assemble and load assembly into CPU RAM
  const handleAssembleAndLoad = (codeToAssemble?: string) => {
    const code = codeToAssemble ?? sourceCode;
    const listing = Assembler8086.assemble(code);
    cpu.loadProgram(listing);
    forceUpdate();
  };

  // Single Step execution
  const handleStep = useCallback(() => {
    if (cpu.isHalted) {
      setIsRunning(false);
      return;
    }
    const executed = cpu.step();
    forceUpdate();
    if (!executed || cpu.isHalted) {
      setIsRunning(false);
    }
  }, [cpu, forceUpdate]);

  // Run / Pause execution loop
  const handleRun = () => {
    if (cpu.isHalted) return;
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    handleAssembleAndLoad();
  };

  // Execution Timer Loop
  useEffect(() => {
    let timer: any = null;
    if (isRunning) {
      const intervalMs = Math.max(5, Math.floor(1000 / clockSpeedHz));
      timer = setInterval(() => {
        if (cpu.isHalted) {
          setIsRunning(false);
          clearInterval(timer);
          return;
        }

        // Check if current line has a breakpoint
        const currentPhys = cpu.getPhysicalAddress(cpu.registers.cs, cpu.registers.ip);
        let currentLine = -1;
        if (cpu.currentListing) {
          for (const [line, addr] of cpu.currentListing.sourceToAddressMap.entries()) {
            if (addr === currentPhys) {
              currentLine = line;
              break;
            }
          }
        }

        if (currentLine !== -1 && breakpoints.has(currentLine) && cpu.instructionsExecuted > 0) {
          setIsRunning(false);
          clearInterval(timer);
          return;
        }

        const executed = cpu.step();
        forceUpdate();

        if (!executed || cpu.isHalted) {
          setIsRunning(false);
          clearInterval(timer);
        }
      }, intervalMs);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, clockSpeedHz, cpu, breakpoints, forceUpdate]);

  const handleToggleBreakpoint = (line: number) => {
    setBreakpoints((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  };

  // External hardware interrupt
  const handleTriggerInterrupt = (irqNum: number) => {
    cpu.triggerInterrupt(irqNum);
    forceUpdate();
  };

  // Keyboard console input
  const handleSendInput = (text: string) => {
    cpu.keyboardBuffer += text;
    forceUpdate();
  };

  const handleClearConsole = () => {
    cpu.consoleOutput = '';
    forceUpdate();
  };

  // Compute Left Column Width based on layout mode
  const getLeftColumnClass = () => {
    if (layoutMode === 'FULL_CODE') {
      return 'w-full h-full';
    }
    if (layoutMode === 'EXPANDED_CODE') {
      return 'w-full lg:w-[58%] xl:w-[62%]';
    }
    return 'w-full lg:w-[50%] xl:w-[50%]';
  };

  return (
    <div
      id="app-container"
      className={`flex flex-col h-screen w-screen font-sans overflow-hidden select-none transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* ============================================================ */}
      {/* 1. TOP GLOBAL NAVIGATION & HEADER */}
      {/* ============================================================ */}
      <header
        className={`h-14 border-b flex items-center justify-between px-4 z-20 shrink-0 shadow-2xs transition-colors duration-200 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* College Microprocessor Lab Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs">
            <Cpu className="w-5 h-5 text-white font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`font-bold text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                8086 & 8051 <span className="text-blue-500 font-normal">Microprocessor & Microcontroller Lab</span>
              </h1>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full hidden sm:inline border ${
                isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800/60' : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                College Lab Simulator
              </span>
            </div>
            <p className={`text-[11px] font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Assembly Program Editor • Live Registers & Flags • DIP-40 IC Pinouts
            </p>
          </div>
        </div>

        {/* Center Tabs Navigation */}
        <nav className={`hidden md:flex items-center gap-1 p-1 rounded-xl border text-xs ${
          isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            id="nav-chip-pinout"
            onClick={() => { setActiveTab('CHIP_PINOUT'); if (layoutMode === 'FULL_CODE') setLayoutMode('EXPANDED_CODE'); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
              activeTab === 'CHIP_PINOUT'
                ? isDark ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-white text-blue-700 font-bold shadow-xs'
                : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>IC Pinouts & 8255 Board</span>
          </button>

          <button
            id="nav-memory-map"
            onClick={() => { setActiveTab('MEMORY_MAP'); if (layoutMode === 'FULL_CODE') setLayoutMode('EXPANDED_CODE'); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
              activeTab === 'MEMORY_MAP'
                ? isDark ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-white text-blue-700 font-bold shadow-xs'
                : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>1MB RAM Memory Map</span>
          </button>
        </nav>

        {/* Right Status, Layout View Presets, Theme Toggle & Instruction Guide */}
        <div className="flex items-center gap-2 text-xs">
          {/* Theme Switcher Toggle */}
          <button
            id="btn-theme-toggle"
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer shadow-2xs ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline text-slate-200">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline text-slate-700">Dark</span>
              </>
            )}
          </button>

          {/* Layout Mode Switcher */}
          <div className={`hidden lg:flex items-center p-0.5 rounded-lg border text-[11px] ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setLayoutMode('EXPANDED_CODE')}
              className={`px-2 py-1 rounded transition cursor-pointer ${
                layoutMode === 'EXPANDED_CODE'
                  ? isDark ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-white text-blue-700 font-bold shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Wide Code Editor Mode"
            >
              Large Editor
            </button>
            <button
              onClick={() => setLayoutMode('BALANCED')}
              className={`px-2 py-1 rounded transition cursor-pointer ${
                layoutMode === 'BALANCED'
                  ? isDark ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-white text-blue-700 font-bold shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="50/50 Balanced Split"
            >
              50/50 Split
            </button>
            <button
              onClick={() => setLayoutMode(layoutMode === 'FULL_CODE' ? 'EXPANDED_CODE' : 'FULL_CODE')}
              className={`px-2 py-1 rounded transition cursor-pointer ${
                layoutMode === 'FULL_CODE'
                  ? isDark ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-white text-blue-700 font-bold shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Full Code Screen View"
            >
              Full Code
            </button>
          </div>

          <button
            onClick={() => setIsDocModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer shadow-2xs ${
              isDark
                ? 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-800/60 text-amber-300'
                : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800'
            }`}
            title="8086 Instruction Reference Guide"
          >
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Instruction Guide</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab bar */}
      <div className={`flex md:hidden border-b px-2 py-1 gap-1 overflow-x-auto text-xs shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <button
          onClick={() => setActiveTab('CHIP_PINOUT')}
          className={`px-2.5 py-1 rounded whitespace-nowrap font-medium ${
            activeTab === 'CHIP_PINOUT'
              ? 'bg-blue-600 text-white'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600'
          }`}
        >
          IC Pinouts & 8255 Lab
        </button>
        <button
          onClick={() => setActiveTab('MEMORY_MAP')}
          className={`px-2.5 py-1 rounded whitespace-nowrap font-medium ${
            activeTab === 'MEMORY_MAP'
              ? 'bg-blue-600 text-white'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600'
          }`}
        >
          1MB RAM Hex
        </button>
      </div>

      {/* ============================================================ */}
      {/* 2. MAIN SPLIT WORKSPACE */}
      {/* ============================================================ */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 gap-3">
        
        {/* LEFT COLUMN: Large Code Editor (Top) & Registers/Console (Bottom) */}
        <div className={`${getLeftColumnClass()} flex flex-col gap-3 shrink-0 h-full overflow-hidden transition-all duration-200`}>
          
          {/* Top: Large Assembly Code Editor */}
          <div className="flex-1 min-h-[340px] overflow-hidden">
            <CodeEditor
              cpu={cpu}
              sourceCode={sourceCode}
              onChangeSourceCode={setSourceCode}
              onAssembleAndLoad={() => handleAssembleAndLoad()}
              onStep={handleStep}
              onRun={handleRun}
              onPause={handlePause}
              onReset={handleReset}
              isRunning={isRunning}
              clockSpeedHz={clockSpeedHz}
              onChangeClockSpeed={setClockSpeedHz}
              onOpenDocModal={() => setIsDocModalOpen(true)}
              breakpoints={breakpoints}
              onToggleBreakpoint={handleToggleBreakpoint}
              isMaximized={layoutMode === 'FULL_CODE'}
              onToggleMaximize={() => setLayoutMode(layoutMode === 'FULL_CODE' ? 'EXPANDED_CODE' : 'FULL_CODE')}
              isDark={isDark}
            />
          </div>

          {/* Bottom: Registers Panel & Console Output */}
          <div
            className={`transition-all duration-200 flex flex-col border rounded-xl overflow-hidden shadow-xs shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            } ${
              isOutputPanelExpanded ? 'h-[230px]' : 'h-10'
            }`}
          >
            {/* Output Tab Header */}
            <div className={`flex items-center justify-between px-3 py-1.5 border-b text-xs shrink-0 ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-1.5">
                <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
                }`}>
                  <button
                    id="tab-output-registers"
                    onClick={() => { setOutputTab('REGISTERS'); setIsOutputPanelExpanded(true); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                      outputTab === 'REGISTERS' && isOutputPanelExpanded
                        ? isDark ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-700 shadow-2xs'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Cpu className="w-3 h-3" />
                    <span>Registers & Flags</span>
                  </button>
                  <button
                    id="tab-output-console"
                    onClick={() => { setOutputTab('CONSOLE'); setIsOutputPanelExpanded(true); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                      outputTab === 'CONSOLE' && isOutputPanelExpanded
                        ? isDark ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-700 shadow-2xs'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Terminal className="w-3 h-3" />
                    <span>DOS Output Console</span>
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-[11px] ml-2">
                  <span className={`w-2 h-2 rounded-full ${cpu.isHalted ? 'bg-rose-500' : isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  <span className={`uppercase font-semibold text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {cpu.isHalted ? 'CPU HALTED' : isRunning ? 'RUNNING' : 'READY'}
                  </span>
                </div>
              </div>

              {/* Minimize / Expand Toggle Button */}
              <button
                onClick={() => setIsOutputPanelExpanded(!isOutputPanelExpanded)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded transition text-[11px] cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={isOutputPanelExpanded ? 'Collapse panel' : 'Expand panel'}
              >
                <span className="text-[10px] uppercase font-bold text-slate-500">{isOutputPanelExpanded ? 'Collapse' : 'Expand'}</span>
                {isOutputPanelExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Content Body: Registers or Console */}
            {isOutputPanelExpanded && (
              <div className="flex-1 min-h-0">
                {outputTab === 'REGISTERS' ? (
                  <RegistersPanel cpu={cpu} onUpdate={forceUpdate} isDark={isDark} />
                ) : (
                  <ConsoleOutput
                    cpu={cpu}
                    onClear={handleClearConsole}
                    onSendInput={handleSendInput}
                    onTriggerInterrupt={handleTriggerInterrupt}
                    isDark={isDark}
                  />
                )}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Microcontroller & IC Visualizer or Memory Map */}
        {layoutMode !== 'FULL_CODE' && (
          <div className="flex-1 flex flex-col gap-3 min-w-0 h-full overflow-hidden">
            <div className={`flex-1 min-h-0 border rounded-xl overflow-hidden shadow-xs ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              {activeTab === 'CHIP_PINOUT' && (
                <ChipPinoutView cpu={cpu} isDark={isDark} />
              )}
              {activeTab === 'MEMORY_MAP' && (
                <MemoryViewer cpu={cpu} onUpdate={forceUpdate} isDark={isDark} />
              )}
            </div>
          </div>
        )}

      </main>

      {/* Instruction Reference Modal */}
      <InstructionRefModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        isDark={isDark}
      />
    </div>
  );
}

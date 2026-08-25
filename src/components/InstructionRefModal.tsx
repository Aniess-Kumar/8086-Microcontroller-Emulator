import React, { useState } from 'react';
import { X, Search, BookOpen, Code } from 'lucide-react';

interface InstructionRefModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

interface InstructionDoc {
  mnemonic: string;
  syntax: string;
  category: string;
  flags: string;
  cycles: string;
  description: string;
  example: string;
}

const INSTRUCTION_DOCS: InstructionDoc[] = [
  {
    mnemonic: 'MOV',
    syntax: 'MOV dest, src',
    category: 'Data Transfer',
    flags: 'None',
    cycles: '2 - 14 T-States',
    description: 'Copies byte or word from source operand to destination operand without modifying flags.',
    example: 'MOV AX, 1234H\nMOV DS, AX\nMOV [BX + SI], CX'
  },
  {
    mnemonic: 'ADD',
    syntax: 'ADD dest, src',
    category: 'Arithmetic',
    flags: 'CF, PF, AF, ZF, SF, OF',
    cycles: '3 - 24 T-States',
    description: 'Adds source operand to destination operand and stores the result in destination.',
    example: 'ADD AL, 05H\nADD AX, BX\nADD [SI], DX'
  },
  {
    mnemonic: 'ADC',
    syntax: 'ADC dest, src',
    category: 'Arithmetic',
    flags: 'CF, PF, AF, ZF, SF, OF',
    cycles: '3 - 24 T-States',
    description: 'Adds destination, source, and Carry Flag (CF) together: dest = dest + src + CF.',
    example: 'ADD AX, BX\nADC DX, CX ; High-word addition with carry'
  },
  {
    mnemonic: 'SUB',
    syntax: 'SUB dest, src',
    category: 'Arithmetic',
    flags: 'CF, PF, AF, ZF, SF, OF',
    cycles: '3 - 24 T-States',
    description: 'Subtracts source operand from destination operand: dest = dest - src.',
    example: 'SUB AL, 10H\nSUB BX, CX'
  },
  {
    mnemonic: 'CMP',
    syntax: 'CMP dest, src',
    category: 'Arithmetic / Compare',
    flags: 'CF, PF, AF, ZF, SF, OF',
    cycles: '3 - 14 T-States',
    description: 'Compares destination with source by computing (dest - src) and setting flags without modifying operands.',
    example: 'CMP AL, 0AH\nJE EQUAL_LABEL\nJB SMALLER_LABEL'
  },
  {
    mnemonic: 'MUL',
    syntax: 'MUL src',
    category: 'Arithmetic',
    flags: 'CF, OF',
    cycles: '70 - 133 T-States',
    description: 'Unsigned multiplication: 8-bit multiplies AL * src -> AX; 16-bit multiplies AX * src -> DX:AX.',
    example: 'MOV AL, 05H\nMOV BL, 04H\nMUL BL ; AX = 20 (14H)'
  },
  {
    mnemonic: 'DIV',
    syntax: 'DIV src',
    category: 'Arithmetic',
    flags: 'Undefined',
    cycles: '80 - 162 T-States',
    description: 'Unsigned division: 8-bit divides AX by src -> AL=Quotient, AH=Remainder; 16-bit divides DX:AX by src -> AX=Quotient, DX=Remainder.',
    example: 'MOV AX, 0019H ; 25\nMOV BL, 04H\nDIV BL ; AL=6 (quot), AH=1 (rem)'
  },
  {
    mnemonic: 'INC',
    syntax: 'INC dest',
    category: 'Arithmetic',
    flags: 'AF, OF, PF, SF, ZF (CF unaffected)',
    cycles: '2 - 15 T-States',
    description: 'Increments operand by 1.',
    example: 'INC SI\nINC AX'
  },
  {
    mnemonic: 'DEC',
    syntax: 'DEC dest',
    category: 'Arithmetic',
    flags: 'AF, OF, PF, SF, ZF (CF unaffected)',
    cycles: '2 - 15 T-States',
    description: 'Decrements operand by 1.',
    example: 'DEC CL\nDEC BX'
  },
  {
    mnemonic: 'LEA',
    syntax: 'LEA reg16, memory',
    category: 'Data Transfer',
    flags: 'None',
    cycles: '2 - 6 T-States',
    description: 'Load Effective Address of operand into 16-bit register.',
    example: 'LEA SI, ARRAY\nLEA DX, MSG'
  },
  {
    mnemonic: 'OUT',
    syntax: 'OUT port, AL/AX',
    category: 'I/O Hardware',
    flags: 'None',
    cycles: '8 - 14 T-States',
    description: 'Transfers byte or word from AL/AX to an I/O port address (e.g. 8255 PPI, LEDs).',
    example: 'MOV AL, 82H\nOUT 86H, AL ; Configure 8255 PPI\nMOV AL, 0FFH\nOUT 80H, AL ; Output to LEDs'
  },
  {
    mnemonic: 'IN',
    syntax: 'IN AL/AX, port',
    category: 'I/O Hardware',
    flags: 'None',
    cycles: '8 - 14 T-States',
    description: 'Transfers byte or word from an I/O port address (e.g. 8255 DIP switches) into AL/AX.',
    example: 'IN AL, 82H ; Read DIP switches on Port B'
  },
  {
    mnemonic: 'INT',
    syntax: 'INT interrupt_num',
    category: 'Control / Interrupt',
    flags: 'IF=0, TF=0',
    cycles: '51 - 71 T-States',
    description: 'Software interrupt call: pushes Flags, CS, IP and jumps to Interrupt Vector Table entry.',
    example: 'MOV AH, 09H\nINT 21H ; DOS print string\nMOV AH, 4CH\nINT 21H ; DOS exit'
  },
  {
    mnemonic: 'HLT',
    syntax: 'HLT',
    category: 'Processor Control',
    flags: 'None',
    cycles: '2 T-States',
    description: 'Halts CPU execution until an external hardware interrupt (NMI or INTR) or Reset occurs.',
    example: 'HLT'
  }
];

export const InstructionRefModal: React.FC<InstructionRefModalProps> = ({
  isOpen,
  onClose,
  isDark = false,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');

  if (!isOpen) return null;

  const categories = ['ALL', 'Data Transfer', 'Arithmetic', 'Arithmetic / Compare', 'I/O Hardware', 'Control / Interrupt', 'Processor Control'];

  const filtered = INSTRUCTION_DOCS.filter((item) => {
    const matchesSearch =
      item.mnemonic.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.syntax.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === 'ALL' || item.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className={`w-full max-w-3xl border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              isDark ? 'bg-amber-950/60 border-amber-800/60 text-amber-400' : 'bg-amber-100 border-amber-200 text-amber-700'
            }`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>8086 Instruction Reference Guide</h2>
              <p className={`text-xs font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Opcode syntax, affected status flags, and college lab examples</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter bar */}
        <div className={`p-4 border-b flex flex-wrap items-center gap-3 ${
          isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/50 border-slate-200'
        }`}>
          <div className={`flex-1 min-w-[200px] flex items-center border rounded-lg px-3 py-1.5 shadow-2xs ${
            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search opcodes (e.g. MOV, ADD, CMP, OUT, INT)..."
              className="bg-transparent text-xs outline-none w-full font-sans placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-2.5 py-1 rounded-md text-xs transition cursor-pointer whitespace-nowrap ${
                  selectedCat === cat
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Instruction List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
          {filtered.map((item) => (
            <div
              key={item.mnemonic}
              className={`p-3.5 border rounded-xl transition ${
                isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-base ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>{item.mnemonic}</span>
                  <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${
                    isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-white text-slate-700 border-slate-300'
                  }`}>
                    {item.syntax}
                  </span>
                </div>
                <span className={`text-[11px] font-sans px-2 py-0.5 rounded-full font-medium ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  {item.category}
                </span>
              </div>

              <p className={`font-sans text-xs leading-relaxed mb-2.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {item.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mb-2.5">
                <div className={`p-2 rounded border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className="text-slate-400 block font-sans text-[10px]">Flags Affected:</span>
                  <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.flags}</span>
                </div>
                <div className={`p-2 rounded border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className="text-slate-400 block font-sans text-[10px]">Execution Cycles:</span>
                  <span className="font-bold text-amber-500">{item.cycles}</span>
                </div>
              </div>

              <div className="bg-[#0a0f18] text-emerald-300 p-2.5 rounded-lg text-xs overflow-x-auto whitespace-pre border border-slate-800">
                {item.example}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-400 font-sans">
              No matching 8086 instructions found for "{search}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

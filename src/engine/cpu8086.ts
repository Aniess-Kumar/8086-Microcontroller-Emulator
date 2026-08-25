import {
  AssembledInstruction,
  BIUState,
  BusCycleType,
  EUState,
  Flags,
  PIC8259,
  PinState,
  PIT8254,
  PPI8255,
  ProgramListing,
  Registers,
  SymbolEntry,
  TrainerHardware,
} from '../types/simulator';

export class CPU8086 {
  public memory: Uint8Array = new Uint8Array(1024 * 1024); // 1MB RAM
  public ioPorts: Uint8Array = new Uint8Array(65536); // 64KB I/O

  public registers: Registers = {
    ax: 0x0000,
    bx: 0x0000,
    cx: 0x0000,
    dx: 0x0000,
    si: 0x0000,
    di: 0x0000,
    bp: 0x0000,
    sp: 0xFFFE,
    ip: 0x0000,
    cs: 0x0700,
    ds: 0x0800,
    ss: 0x0900,
    es: 0x0800,
  };

  public flags: Flags = {
    cf: false,
    pf: false,
    af: false,
    zf: false,
    sf: false,
    tf: false,
    if_: true,
    df: false,
    of: false,
  };

  public biu: BIUState = {
    queue: [],
    queueCapacity: 6,
    activeCycle: 'IDLE',
    tState: 'Ti',
    lastAddress: 0x07000,
    lastData: 0x0000,
    ale: false,
    rd: true, // active low
    wr: true, // active low
    m_io: true, // 1 = Mem, 0 = IO
    den: true, // active low
    dt_r: true, // 1 = Transmit, 0 = Receive
    inta: true, // active low
    bhe: true, // active low
  };

  public eu: EUState = {
    aluOp1: 0,
    aluOp2: 0,
    aluResult: 0,
    aluOpName: 'NONE',
    currentMnemonic: 'NOP',
    microStep: 'Fetch next opcode',
    isBusy: false,
  };

  public ppi8255: PPI8255 = {
    portA: 0x00,
    portB: 0x00,
    portC: 0x00,
    controlWord: 0x82, // Mode 0, Port A Out, Port B In, Port C Out
    modeA: 0,
    modeB: 0,
    portADirection: 'OUT',
    portBDirection: 'IN',
    portCHighDirection: 'OUT',
    portCLowDirection: 'OUT',
  };

  public pit8254: PIT8254 = {
    counter0: { count: 0, initialCount: 1000, mode: 2, bcd: false, readState: 'LSB', writeState: 'LSB', latchedCount: null, out: true, gate: true },
    counter1: { count: 0, initialCount: 100, mode: 2, bcd: false, readState: 'LSB', writeState: 'LSB', latchedCount: null, out: true, gate: true },
    counter2: { count: 0, initialCount: 50, mode: 3, bcd: false, readState: 'LSB', writeState: 'LSB', latchedCount: null, out: false, gate: true },
    controlWord: 0x36,
  };

  public pic8259: PIC8259 = {
    irr: 0x00,
    isr: 0x00,
    imr: 0x00,
    vectorBase: 0x08,
    activeIRQ: null,
  };

  public trainer: TrainerHardware = {
    leds: 0x00,
    switches: 0x00,
    sevenSegDigits: [0, 0, 0, 0],
    sevenSegRawPatterns: [0x3F, 0x3F, 0x3F, 0x3F], // '0' in 7-seg
    matrixKeypadPressedKey: null,
    stepperMotorAngle: 0,
    stepperMotorStep: 0,
    trafficLights: {
      northRed: true,
      northYellow: false,
      northGreen: false,
      eastRed: false,
      eastYellow: false,
      eastGreen: true,
    },
    lcd: {
      line1: '8086 TRAINER KIT',
      line2: 'SYSTEM READY...',
      cursorPos: 0,
      enabled: true,
    },
    dacOutput: Array(64).fill(128),
    buzzer: false,
  };

  public isHalted: boolean = false;
  public totalCycles: number = 0;
  public instructionsExecuted: number = 0;
  public consoleOutput: string = '';
  public keyboardBuffer: string = '';
  public currentListing: ProgramListing | null = null;

  // Pin state cache (40 pins)
  public pins: PinState[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.registers = {
      ax: 0x0000,
      bx: 0x0000,
      cx: 0x0000,
      dx: 0x0000,
      si: 0x0000,
      di: 0x0000,
      bp: 0x0000,
      sp: 0xFFFE,
      ip: 0x0000,
      cs: 0x0700,
      ds: 0x0800,
      ss: 0x0900,
      es: 0x0800,
    };

    this.flags = {
      cf: false,
      pf: false,
      af: false,
      zf: false,
      sf: false,
      tf: false,
      if_: true,
      df: false,
      of: false,
    };

    this.isHalted = false;
    this.totalCycles = 0;
    this.instructionsExecuted = 0;
    this.consoleOutput = '';
    this.biu.queue = [];
    this.biu.activeCycle = 'IDLE';

    // Reset peripherals
    this.ppi8255.portA = 0x00;
    this.ppi8255.portB = 0x00;
    this.ppi8255.portC = 0x00;
    this.trainer.leds = 0x00;
    this.trainer.sevenSegDigits = [0, 0, 0, 0];
    this.trainer.sevenSegRawPatterns = [0x3F, 0x3F, 0x3F, 0x3F];
    this.trainer.stepperMotorAngle = 0;
    this.trainer.stepperMotorStep = 0;
    this.trainer.lcd.line1 = '8086 TRAINER KIT';
    this.trainer.lcd.line2 = 'READY FOR CODE';

    this.updatePins();
  }

  public loadProgram(listing: ProgramListing): void {
    this.currentListing = listing;
    this.reset();

    // Clear code area in memory
    const codeBase = (listing.entryPoint.segment << 4);
    for (let i = 0; i < 4096; i++) {
      this.memory[codeBase + i] = 0x90; // NOP
    }

    // Write assembled instructions into simulated RAM
    for (const inst of listing.instructions) {
      const phys = inst.address;
      for (let b = 0; b < inst.bytes.length; b++) {
        if (phys + b < this.memory.length) {
          this.memory[phys + b] = inst.bytes[b];
        }
      }
    }

    // Write symbol data variables into DATA segment
    const dataBase = (this.registers.ds << 4);
    listing.symbols.forEach((sym) => {
      if (sym.segment === 'DATA' && (sym.type === 'VARIABLE_BYTE' || sym.type === 'VARIABLE_WORD')) {
        const addr = dataBase + sym.offset;
        if (sym.type === 'VARIABLE_BYTE') {
          this.memory[addr] = sym.value & 0xFF;
        } else {
          this.memory[addr] = sym.value & 0xFF;
          this.memory[addr + 1] = (sym.value >> 8) & 0xFF;
        }
      }
    });

    this.registers.cs = listing.entryPoint.segment;
    this.registers.ip = listing.entryPoint.offset;

    // Fill BIU Prefetch Queue
    this.fillPrefetchQueue();
    this.updatePins();
  }

  private fillPrefetchQueue(): void {
    this.biu.queue = [];
    const pc = this.getPhysicalAddress(this.registers.cs, this.registers.ip);
    for (let i = 0; i < this.biu.queueCapacity; i++) {
      this.biu.queue.push(this.memory[pc + i] || 0x90);
    }
  }

  public getPhysicalAddress(segment: number, offset: number): number {
    return ((segment & 0xFFFF) << 4) + (offset & 0xFFFF);
  }

  public getRegister(name: string): number {
    const n = name.toUpperCase().trim();
    switch (n) {
      case 'AX': return this.registers.ax;
      case 'BX': return this.registers.bx;
      case 'CX': return this.registers.cx;
      case 'DX': return this.registers.dx;
      case 'SI': return this.registers.si;
      case 'DI': return this.registers.di;
      case 'BP': return this.registers.bp;
      case 'SP': return this.registers.sp;
      case 'IP': return this.registers.ip;
      case 'CS': return this.registers.cs;
      case 'DS': return this.registers.ds;
      case 'SS': return this.registers.ss;
      case 'ES': return this.registers.es;
      case 'AL': return this.registers.ax & 0xFF;
      case 'AH': return (this.registers.ax >> 8) & 0xFF;
      case 'BL': return this.registers.bx & 0xFF;
      case 'BH': return (this.registers.bx >> 8) & 0xFF;
      case 'CL': return this.registers.cx & 0xFF;
      case 'CH': return (this.registers.cx >> 8) & 0xFF;
      case 'DL': return this.registers.dx & 0xFF;
      case 'DH': return (this.registers.dx >> 8) & 0xFF;
      default: return 0;
    }
  }

  public setRegister(name: string, value: number): void {
    const n = name.toUpperCase().trim();
    value = value & 0xFFFF;
    switch (n) {
      case 'AX': this.registers.ax = value; break;
      case 'BX': this.registers.bx = value; break;
      case 'CX': this.registers.cx = value; break;
      case 'DX': this.registers.dx = value; break;
      case 'SI': this.registers.si = value; break;
      case 'DI': this.registers.di = value; break;
      case 'BP': this.registers.bp = value; break;
      case 'SP': this.registers.sp = value; break;
      case 'IP': this.registers.ip = value; break;
      case 'CS': this.registers.cs = value; break;
      case 'DS': this.registers.ds = value; break;
      case 'SS': this.registers.ss = value; break;
      case 'ES': this.registers.es = value; break;
      case 'AL': this.registers.ax = (this.registers.ax & 0xFF00) | (value & 0xFF); break;
      case 'AH': this.registers.ax = (this.registers.ax & 0x00FF) | ((value & 0xFF) << 8); break;
      case 'BL': this.registers.bx = (this.registers.bx & 0xFF00) | (value & 0xFF); break;
      case 'BH': this.registers.bx = (this.registers.bx & 0x00FF) | ((value & 0xFF) << 8); break;
      case 'CL': this.registers.cx = (this.registers.cx & 0xFF00) | (value & 0xFF); break;
      case 'CH': this.registers.cx = (this.registers.cx & 0x00FF) | ((value & 0xFF) << 8); break;
      case 'DL': this.registers.dx = (this.registers.dx & 0xFF00) | (value & 0xFF); break;
      case 'DH': this.registers.dx = (this.registers.dx & 0x00FF) | ((value & 0xFF) << 8); break;
    }
  }

  public readMemoryByte(address: number): number {
    address = address & 0xFFFFF; // 20-bit wrap
    this.biu.activeCycle = 'MEM_READ';
    this.biu.lastAddress = address;
    this.biu.m_io = true;
    this.biu.rd = false;
    this.biu.wr = true;
    const val = this.memory[address];
    this.biu.lastData = val;
    return val;
  }

  public writeMemoryByte(address: number, value: number): void {
    address = address & 0xFFFFF;
    value = value & 0xFF;
    this.biu.activeCycle = 'MEM_WRITE';
    this.biu.lastAddress = address;
    this.biu.lastData = value;
    this.biu.m_io = true;
    this.biu.rd = true;
    this.biu.wr = false;
    this.memory[address] = value;
  }

  public readMemoryWord(address: number): number {
    const lsb = this.readMemoryByte(address);
    const msb = this.readMemoryByte(address + 1);
    return (msb << 8) | lsb;
  }

  public writeMemoryWord(address: number, value: number): void {
    this.writeMemoryByte(address, value & 0xFF);
    this.writeMemoryByte(address + 1, (value >> 8) & 0xFF);
  }

  // Push to stack
  public push(value: number): void {
    this.registers.sp = (this.registers.sp - 2) & 0xFFFF;
    const addr = this.getPhysicalAddress(this.registers.ss, this.registers.sp);
    this.writeMemoryWord(addr, value);
  }

  // Pop from stack
  public pop(): number {
    const addr = this.getPhysicalAddress(this.registers.ss, this.registers.sp);
    const val = this.readMemoryWord(addr);
    this.registers.sp = (this.registers.sp + 2) & 0xFFFF;
    return val;
  }

  // IO Port Operations (integrated with 8255 / 8254 / 8259)
  public readIOPort(port: number): number {
    port = port & 0xFFFF;
    this.biu.activeCycle = 'IO_READ';
    this.biu.m_io = false;
    this.biu.rd = false;
    this.biu.wr = true;
    this.biu.lastAddress = port;

    // 8255 PPI Ports (0x80 = Port A, 0x82 = Port B, 0x84 = Port C, 0x86 = Control)
    if (port === 0x80) {
      if (this.ppi8255.portADirection === 'IN') {
        return this.ppi8255.portA;
      }
      return this.ppi8255.portA;
    }
    if (port === 0x82) {
      // Port B connected to 8 DIP logic switches
      this.ppi8255.portB = this.trainer.switches & 0xFF;
      return this.ppi8255.portB;
    }
    if (port === 0x84) {
      // Port C matrix keypad / handshakes
      return this.ppi8255.portC;
    }

    // 8254 PIT Ports (0x40, 0x42, 0x44, 0x46)
    if (port === 0x40) {
      return this.pit8254.counter0.count & 0xFF;
    }

    // Generic IO port
    const val = this.ioPorts[port] || 0;
    this.biu.lastData = val;
    return val;
  }

  public writeIOPort(port: number, value: number): void {
    port = port & 0xFFFF;
    value = value & 0xFF;
    this.biu.activeCycle = 'IO_WRITE';
    this.biu.m_io = false;
    this.biu.rd = true;
    this.biu.wr = false;
    this.biu.lastAddress = port;
    this.biu.lastData = value;
    this.ioPorts[port] = value;

    // 8255 PPI Ports
    if (port === 0x80) {
      this.ppi8255.portA = value;
      // Output to 8 Data LEDs
      this.trainer.leds = value;
      // Also update DAC waveform buffer
      this.trainer.dacOutput.shift();
      this.trainer.dacOutput.push(value);
      
      // Update Stepper Motor sequence (lower nibble)
      const phase = value & 0x0F;
      if (phase === 0x01) { this.trainer.stepperMotorStep = 0; this.trainer.stepperMotorAngle = (this.trainer.stepperMotorAngle + 7.5) % 360; }
      else if (phase === 0x02) { this.trainer.stepperMotorStep = 1; this.trainer.stepperMotorAngle = (this.trainer.stepperMotorAngle + 7.5) % 360; }
      else if (phase === 0x04) { this.trainer.stepperMotorStep = 2; this.trainer.stepperMotorAngle = (this.trainer.stepperMotorAngle + 7.5) % 360; }
      else if (phase === 0x08) { this.trainer.stepperMotorStep = 3; this.trainer.stepperMotorAngle = (this.trainer.stepperMotorAngle + 7.5) % 360; }

      // Update 7-segment patterns
      const digitSelect = this.ppi8255.portC & 0x0F;
      for (let d = 0; d < 4; d++) {
        if ((digitSelect & (1 << d)) === 0) { // Active low digit enable
          this.trainer.sevenSegRawPatterns[d] = value;
          this.trainer.sevenSegDigits[d] = this.decode7SegPattern(value);
        }
      }
    } else if (port === 0x82) {
      this.ppi8255.portB = value;
    } else if (port === 0x84) {
      this.ppi8255.portC = value;
      // Traffic lights simulation on Port C
      this.trainer.trafficLights.northRed = (value & 0x01) !== 0;
      this.trainer.trafficLights.northYellow = (value & 0x02) !== 0;
      this.trainer.trafficLights.northGreen = (value & 0x04) !== 0;
      this.trainer.trafficLights.eastRed = (value & 0x08) !== 0;
      this.trainer.trafficLights.eastYellow = (value & 0x10) !== 0;
      this.trainer.trafficLights.eastGreen = (value & 0x20) !== 0;
    } else if (port === 0x86) {
      // 8255 Control Word
      this.ppi8255.controlWord = value;
      if (value & 0x80) { // Mode set flag
        this.ppi8255.portADirection = (value & 0x10) ? 'IN' : 'OUT';
        this.ppi8255.portBDirection = (value & 0x02) ? 'IN' : 'OUT';
        this.ppi8255.portCHighDirection = (value & 0x08) ? 'IN' : 'OUT';
        this.ppi8255.portCLowDirection = (value & 0x01) ? 'IN' : 'OUT';
      }
    }
  }

  private decode7SegPattern(pat: number): number {
    // Standard 7-seg hex patterns: 0x3F=0, 0x06=1, 0x5B=2, 0x4F=3, 0x66=4, 0x6D=5, 0x7D=6, 0x07=7, 0x7F=8, 0x6F=9
    const map: { [key: number]: number } = {
      0x3F: 0, 0x06: 1, 0x5B: 2, 0x4F: 3, 0x66: 4,
      0x6D: 5, 0x7D: 6, 0x07: 7, 0x7F: 8, 0x6F: 9,
      0x77: 10, 0x7C: 11, 0x39: 12, 0x5E: 13, 0x79: 14, 0x71: 15
    };
    return map[pat & 0x7F] ?? (pat & 0x0F);
  }

  // Parse effective address e.g. `[BX]`, `[SI]`, `[BX+SI+4]`, `[1000H]`, `VAR[SI]`
  public resolveAddress(operand: string, symbols: Map<string, SymbolEntry>): { physical: number; isWord: boolean } {
    let clean = operand.trim();
    let isWord = false;

    if (clean.toUpperCase().includes('WORD PTR')) {
      isWord = true;
      clean = clean.replace(/WORD\s+PTR/i, '').trim();
    } else if (clean.toUpperCase().includes('BYTE PTR')) {
      isWord = false;
      clean = clean.replace(/BYTE\s+PTR/i, '').trim();
    }

    clean = clean.replace(/[\[\]]/g, ' ').trim();
    const parts = clean.split(/[\s+]+/);
    let offset = 0;
    let seg = this.registers.ds;

    for (const part of parts) {
      const pUpper = part.toUpperCase();
      if (pUpper === 'BX') offset += this.registers.bx;
      else if (pUpper === 'SI') offset += this.registers.si;
      else if (pUpper === 'DI') offset += this.registers.di;
      else if (pUpper === 'BP') { offset += this.registers.bp; seg = this.registers.ss; }
      else if (pUpper === 'SP') { offset += this.registers.sp; seg = this.registers.ss; }
      else if (symbols.has(pUpper)) {
        const sym = symbols.get(pUpper)!;
        offset += sym.offset;
        if (sym.type === 'VARIABLE_WORD') isWord = true;
      } else if (/^[0-9A-Fa-f]+[Hh]?$/.test(pUpper) || /^[0-9]+$/.test(pUpper)) {
        let val = 0;
        if (pUpper.endsWith('H')) val = parseInt(pUpper.slice(0, -1), 16) || 0;
        else val = parseInt(pUpper, 10) || 0;
        offset += val;
      }
    }

    return { physical: this.getPhysicalAddress(seg, offset), isWord };
  }

  // Execute a single step / instruction
  public step(): boolean {
    if (this.isHalted) return false;

    const currentPhys = this.getPhysicalAddress(this.registers.cs, this.registers.ip);
    let inst: AssembledInstruction | undefined;

    if (this.currentListing) {
      inst = this.currentListing.addressToInstructionMap.get(currentPhys);
    }

    if (!inst) {
      // Dynamic instruction fetch from memory
      const opcode = this.memory[currentPhys];
      if (opcode === 0xF4) { // HLT
        this.isHalted = true;
        this.eu.currentMnemonic = 'HLT';
        this.eu.microStep = 'Processor halted';
        this.updatePins();
        return false;
      }
      // Advance 1 byte NOP fallback
      this.registers.ip = (this.registers.ip + 1) & 0xFFFF;
      this.instructionsExecuted++;
      this.totalCycles += 3;
      this.updatePins();
      return true;
    }

    // Execute instruction
    this.eu.currentMnemonic = inst.mnemonic;
    this.eu.isBusy = true;
    const symbols = this.currentListing ? this.currentListing.symbols : new Map();

    const initialIP = this.registers.ip;
    const nextIP = (initialIP + inst.bytes.length) & 0xFFFF;
    this.registers.ip = nextIP;

    const mnemonic = inst.mnemonic.toUpperCase();
    const operands = inst.operands ? inst.operands.split(',').map(s => s.trim()) : [];

    switch (mnemonic) {
      case 'NOP':
        this.eu.microStep = 'No operation performed';
        break;

      case 'HLT':
        this.isHalted = true;
        this.eu.microStep = 'CPU in Halt State (Bus Passive)';
        this.biu.activeCycle = 'HALT';
        break;

      case 'CLC':
        this.flags.cf = false;
        break;
      case 'STC':
        this.flags.cf = true;
        break;
      case 'CMC':
        this.flags.cf = !this.flags.cf;
        break;
      case 'CLD':
        this.flags.df = false;
        break;
      case 'STD':
        this.flags.df = true;
        break;
      case 'CLI':
        this.flags.if_ = false;
        break;
      case 'STI':
        this.flags.if_ = true;
        break;

      case 'CBW': {
        const al = this.registers.ax & 0xFF;
        const sign = (al & 0x80) ? 0xFF00 : 0x0000;
        this.registers.ax = sign | al;
        break;
      }
      case 'CWD': {
        const ax = this.registers.ax;
        this.registers.dx = (ax & 0x8000) ? 0xFFFF : 0x0000;
        break;
      }
      case 'LAHF': {
        let ah = 0;
        if (this.flags.sf) ah |= 0x80;
        if (this.flags.zf) ah |= 0x40;
        if (this.flags.af) ah |= 0x10;
        if (this.flags.pf) ah |= 0x04;
        if (this.flags.cf) ah |= 0x01;
        ah |= 0x02; // bit 1 is always 1 in 8086 flags byte
        this.setRegister('AH', ah);
        break;
      }
      case 'SAHF': {
        const ah = this.getRegister('AH');
        this.flags.sf = (ah & 0x80) !== 0;
        this.flags.zf = (ah & 0x40) !== 0;
        this.flags.af = (ah & 0x10) !== 0;
        this.flags.pf = (ah & 0x04) !== 0;
        this.flags.cf = (ah & 0x01) !== 0;
        break;
      }
      case 'PUSHF': {
        let f = 0;
        if (this.flags.of) f |= 0x0800;
        if (this.flags.df) f |= 0x0400;
        if (this.flags.if_) f |= 0x0200;
        if (this.flags.tf) f |= 0x0100;
        if (this.flags.sf) f |= 0x0080;
        if (this.flags.zf) f |= 0x0040;
        if (this.flags.af) f |= 0x0010;
        if (this.flags.pf) f |= 0x0004;
        if (this.flags.cf) f |= 0x0001;
        this.push(f);
        break;
      }
      case 'POPF': {
        const f = this.pop();
        this.flags.of = (f & 0x0800) !== 0;
        this.flags.df = (f & 0x0400) !== 0;
        this.flags.if_ = (f & 0x0200) !== 0;
        this.flags.tf = (f & 0x0100) !== 0;
        this.flags.sf = (f & 0x0080) !== 0;
        this.flags.zf = (f & 0x0040) !== 0;
        this.flags.af = (f & 0x0010) !== 0;
        this.flags.pf = (f & 0x0004) !== 0;
        this.flags.cf = (f & 0x0001) !== 0;
        break;
      }

      case 'MOV': {
        const dest = operands[0];
        const src = operands[1];
        const val = this.getOperandValue(src, symbols);
        this.setOperandValue(dest, val, symbols);
        this.eu.microStep = `Transferred ${val.toString(16).toUpperCase()}h to ${dest}`;
        break;
      }

      case 'XCHG': {
        const op1 = operands[0];
        const op2 = operands[1];
        const val1 = this.getOperandValue(op1, symbols);
        const val2 = this.getOperandValue(op2, symbols);
        this.setOperandValue(op1, val2, symbols);
        this.setOperandValue(op2, val1, symbols);
        break;
      }

      case 'LEA': {
        const dest = operands[0];
        const src = operands[1];
        const addrObj = this.resolveAddress(src, symbols);
        const offset = addrObj.physical - (this.registers.ds << 4);
        this.setRegister(dest, offset & 0xFFFF);
        break;
      }

      case 'LDS':
      case 'LES': {
        const dest = operands[0];
        const src = operands[1];
        const addrObj = this.resolveAddress(src, symbols);
        const offset = this.readMemoryWord(addrObj.physical);
        const seg = this.readMemoryWord(addrObj.physical + 2);
        this.setRegister(dest, offset);
        if (mnemonic === 'LDS') this.registers.ds = seg;
        else this.registers.es = seg;
        break;
      }

      case 'XLAT':
      case 'XLATB': {
        const bx = this.registers.bx;
        const al = this.registers.ax & 0xFF;
        const addr = this.getPhysicalAddress(this.registers.ds, (bx + al) & 0xFFFF);
        const val = this.readMemoryByte(addr);
        this.setRegister('AL', val);
        break;
      }

      case 'ADD':
      case 'ADC': {
        const dest = operands[0];
        const src = operands[1];
        const isWord = this.isWordOperand(dest, symbols);
        const v1 = this.getOperandValue(dest, symbols);
        let v2 = this.getOperandValue(src, symbols);
        const carry = (mnemonic === 'ADC' && this.flags.cf) ? 1 : 0;
        const res = v1 + v2 + carry;
        this.updateAluFlagsAdd(v1, v2, res, isWord, carry);
        this.setOperandValue(dest, res, symbols);
        this.eu.aluOpName = mnemonic;
        this.eu.aluOp1 = v1;
        this.eu.aluOp2 = v2;
        this.eu.aluResult = res;
        break;
      }

      case 'SUB':
      case 'SBB':
      case 'CMP': {
        const dest = operands[0];
        const src = operands[1];
        const isWord = this.isWordOperand(dest, symbols);
        const v1 = this.getOperandValue(dest, symbols);
        let v2 = this.getOperandValue(src, symbols);
        const borrow = (mnemonic === 'SBB' && this.flags.cf) ? 1 : 0;
        const res = v1 - v2 - borrow;
        this.updateAluFlagsSub(v1, v2, res, isWord, borrow);
        if (mnemonic !== 'CMP') {
          this.setOperandValue(dest, res, symbols);
        }
        this.eu.aluOpName = mnemonic;
        this.eu.aluOp1 = v1;
        this.eu.aluOp2 = v2;
        this.eu.aluResult = res;
        break;
      }

      case 'INC': {
        const op = operands[0];
        const isWord = this.isWordOperand(op, symbols);
        const v = this.getOperandValue(op, symbols);
        const res = v + 1;
        const savedCF = this.flags.cf; // INC does not affect CF
        this.updateAluFlagsAdd(v, 1, res, isWord, 0);
        this.flags.cf = savedCF;
        this.setOperandValue(op, res, symbols);
        break;
      }

      case 'DEC': {
        const op = operands[0];
        const isWord = this.isWordOperand(op, symbols);
        const v = this.getOperandValue(op, symbols);
        const res = v - 1;
        const savedCF = this.flags.cf; // DEC does not affect CF
        this.updateAluFlagsSub(v, 1, res, isWord, 0);
        this.flags.cf = savedCF;
        this.setOperandValue(op, res, symbols);
        break;
      }

      case 'NEG': {
        const op = operands[0];
        const isWord = this.isWordOperand(op, symbols);
        const v = this.getOperandValue(op, symbols);
        const res = 0 - v;
        this.updateAluFlagsSub(0, v, res, isWord, 0);
        this.flags.cf = v !== 0;
        this.setOperandValue(op, res, symbols);
        break;
      }

      case 'MUL': {
        const op = operands[0];
        const isWord = this.isWordOperand(op, symbols);
        const v = this.getOperandValue(op, symbols);
        if (isWord) {
          const res = this.registers.ax * v;
          this.registers.ax = res & 0xFFFF;
          this.registers.dx = (res >> 16) & 0xFFFF;
          this.flags.cf = this.flags.of = this.registers.dx !== 0;
        } else {
          const res = (this.registers.ax & 0xFF) * (v & 0xFF);
          this.registers.ax = res & 0xFFFF;
          this.flags.cf = this.flags.of = (res & 0xFF00) !== 0;
        }
        break;
      }

      case 'DIV': {
        const op = operands[0];
        const isWord = this.isWordOperand(op, symbols);
        const v = this.getOperandValue(op, symbols);
        if (v === 0) {
          // Divide by zero interrupt (INT 0)
          this.triggerInterrupt(0);
          return true;
        }
        if (isWord) {
          const num = (this.registers.dx << 16) | this.registers.ax;
          const quot = Math.floor(num / v);
          const rem = num % v;
          this.registers.ax = quot & 0xFFFF;
          this.registers.dx = rem & 0xFFFF;
        } else {
          const num = this.registers.ax;
          const quot = Math.floor(num / v);
          const rem = num % v;
          this.registers.ax = ((rem & 0xFF) << 8) | (quot & 0xFF);
        }
        break;
      }

      case 'DAA': {
        // Decimal Adjust AL after Addition
        let al = this.registers.ax & 0xFF;
        let oldAL = al;
        let oldCF = this.flags.cf;
        this.flags.cf = false;

        if ((al & 0x0F) > 9 || this.flags.af) {
          al += 6;
          this.flags.af = true;
        } else {
          this.flags.af = false;
        }

        if (oldAL > 0x99 || oldCF) {
          al += 0x60;
          this.flags.cf = true;
        } else {
          this.flags.cf = false;
        }
        this.setRegister('AL', al & 0xFF);
        this.updateFlagsLogical(al & 0xFF, false);
        break;
      }

      case 'AND':
      case 'OR':
      case 'XOR':
      case 'TEST': {
        const dest = operands[0];
        const src = operands[1];
        const isWord = this.isWordOperand(dest, symbols);
        const v1 = this.getOperandValue(dest, symbols);
        const v2 = this.getOperandValue(src, symbols);
        let res = 0;
        if (mnemonic === 'AND' || mnemonic === 'TEST') res = v1 & v2;
        else if (mnemonic === 'OR') res = v1 | v2;
        else if (mnemonic === 'XOR') res = v1 ^ v2;

        this.updateFlagsLogical(res, isWord);
        if (mnemonic !== 'TEST') {
          this.setOperandValue(dest, res, symbols);
        }
        break;
      }

      case 'NOT': {
        const op = operands[0];
        const isWord = this.isWordOperand(op, symbols);
        const v = this.getOperandValue(op, symbols);
        const res = ~v;
        this.setOperandValue(op, res, symbols);
        break;
      }

      case 'SHL':
      case 'SAL':
      case 'SHR':
      case 'SAR':
      case 'ROL':
      case 'ROR':
      case 'RCL':
      case 'RCR': {
        const dest = operands[0];
        const countOp = operands[1] || '1';
        const isWord = this.isWordOperand(dest, symbols);
        let val = this.getOperandValue(dest, symbols);
        const count = (countOp.toUpperCase() === 'CL') ? (this.registers.cx & 0xFF) : (parseInt(countOp, 10) || 1);
        const maxBits = isWord ? 16 : 8;
        const mask = isWord ? 0xFFFF : 0xFF;
        const signMask = isWord ? 0x8000 : 0x80;

        for (let c = 0; c < count; c++) {
          if (mnemonic === 'SHL' || mnemonic === 'SAL') {
            this.flags.cf = (val & signMask) !== 0;
            val = (val << 1) & mask;
          } else if (mnemonic === 'SHR') {
            this.flags.cf = (val & 0x01) !== 0;
            val = (val >>> 1) & mask;
          } else if (mnemonic === 'SAR') {
            this.flags.cf = (val & 0x01) !== 0;
            const sign = val & signMask;
            val = ((val >> 1) & (mask >>> 1)) | sign;
          } else if (mnemonic === 'ROL') {
            const highBit = (val & signMask) ? 1 : 0;
            val = ((val << 1) & mask) | highBit;
            this.flags.cf = highBit === 1;
          } else if (mnemonic === 'ROR') {
            const lowBit = (val & 0x01) ? 1 : 0;
            val = (val >>> 1) | (lowBit ? signMask : 0);
            this.flags.cf = lowBit === 1;
          }
        }
        this.updateFlagsLogical(val, isWord);
        this.setOperandValue(dest, val, symbols);
        break;
      }

      case 'PUSH': {
        const val = this.getOperandValue(operands[0], symbols);
        this.push(val);
        break;
      }
      case 'POP': {
        const val = this.pop();
        this.setOperandValue(operands[0], val, symbols);
        break;
      }

      // Branching & Control flow
      case 'JMP': {
        const target = this.resolveJumpTarget(operands[0], symbols);
        this.registers.ip = target & 0xFFFF;
        break;
      }
      case 'JE':
      case 'JZ':
        if (this.flags.zf) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JNE':
      case 'JNZ':
        if (!this.flags.zf) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JC':
      case 'JB':
      case 'JNAE':
        if (this.flags.cf) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JNC':
      case 'JAE':
      case 'JNB':
        if (!this.flags.cf) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JA':
      case 'JNBE':
        if (!this.flags.cf && !this.flags.zf) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JBE':
      case 'JNA':
        if (this.flags.cf || this.flags.zf) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JG':
      case 'JNLE':
        if (!this.flags.zf && (this.flags.sf === this.flags.of)) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JGE':
      case 'JNL':
        if (this.flags.sf === this.flags.of) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JL':
      case 'JNGE':
        if (this.flags.sf !== this.flags.of) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JLE':
      case 'JNG':
        if (this.flags.zf || (this.flags.sf !== this.flags.of)) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JO':
        if (this.flags.of) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JNO':
        if (!this.flags.of) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JS':
        if (this.flags.sf) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JNS':
        if (!this.flags.sf) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JP':
      case 'JPE':
        if (this.flags.pf) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JNP':
      case 'JPO':
        if (!this.flags.pf) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;
      case 'JCXZ':
        if (this.registers.cx === 0) this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        break;

      case 'LOOP':
        this.registers.cx = (this.registers.cx - 1) & 0xFFFF;
        if (this.registers.cx !== 0) {
          this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        }
        break;
      case 'LOOPE':
      case 'LOOPZ':
        this.registers.cx = (this.registers.cx - 1) & 0xFFFF;
        if (this.registers.cx !== 0 && this.flags.zf) {
          this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        }
        break;
      case 'LOOPNE':
      case 'LOOPNZ':
        this.registers.cx = (this.registers.cx - 1) & 0xFFFF;
        if (this.registers.cx !== 0 && !this.flags.zf) {
          this.registers.ip = this.resolveJumpTarget(operands[0], symbols);
        }
        break;

      case 'CALL': {
        const target = this.resolveJumpTarget(operands[0], symbols);
        this.push(this.registers.ip);
        this.registers.ip = target & 0xFFFF;
        break;
      }

      case 'RET': {
        this.registers.ip = this.pop();
        break;
      }

      case 'INT': {
        const intNum = parseInt(operands[0], 16) || 0x21;
        this.handleInterrupt(intNum);
        break;
      }

      case 'IRET': {
        this.registers.ip = this.pop();
        this.registers.cs = this.pop();
        const f = this.pop();
        this.flags.of = (f & 0x0800) !== 0;
        this.flags.df = (f & 0x0400) !== 0;
        this.flags.if_ = (f & 0x0200) !== 0;
        this.flags.tf = (f & 0x0100) !== 0;
        this.flags.sf = (f & 0x0080) !== 0;
        this.flags.zf = (f & 0x0040) !== 0;
        this.flags.af = (f & 0x0010) !== 0;
        this.flags.pf = (f & 0x0004) !== 0;
        this.flags.cf = (f & 0x0001) !== 0;
        break;
      }

      case 'IN': {
        const dest = operands[0].toUpperCase();
        const port = (operands[1]?.toUpperCase() === 'DX') ? this.registers.dx : (parseInt(operands[1], 16) || 0);
        const val = this.readIOPort(port);
        this.setRegister(dest, val);
        break;
      }

      case 'OUT': {
        const port = (operands[0]?.toUpperCase() === 'DX') ? this.registers.dx : (parseInt(operands[0], 16) || 0);
        const src = operands[1].toUpperCase();
        const val = this.getRegister(src);
        this.writeIOPort(port, val);
        break;
      }

      // String instructions
      case 'MOVSB':
      case 'MOVSW': {
        const isWord = mnemonic === 'MOVSW';
        const srcAddr = this.getPhysicalAddress(this.registers.ds, this.registers.si);
        const destAddr = this.getPhysicalAddress(this.registers.es, this.registers.di);
        if (isWord) {
          const val = this.readMemoryWord(srcAddr);
          this.writeMemoryWord(destAddr, val);
          const inc = this.flags.df ? -2 : 2;
          this.registers.si = (this.registers.si + inc) & 0xFFFF;
          this.registers.di = (this.registers.di + inc) & 0xFFFF;
        } else {
          const val = this.readMemoryByte(srcAddr);
          this.writeMemoryByte(destAddr, val);
          const inc = this.flags.df ? -1 : 1;
          this.registers.si = (this.registers.si + inc) & 0xFFFF;
          this.registers.di = (this.registers.di + inc) & 0xFFFF;
        }
        break;
      }

      case 'LODSB':
      case 'LODSW': {
        const isWord = mnemonic === 'LODSW';
        const srcAddr = this.getPhysicalAddress(this.registers.ds, this.registers.si);
        if (isWord) {
          this.registers.ax = this.readMemoryWord(srcAddr);
          const inc = this.flags.df ? -2 : 2;
          this.registers.si = (this.registers.si + inc) & 0xFFFF;
        } else {
          this.setRegister('AL', this.readMemoryByte(srcAddr));
          const inc = this.flags.df ? -1 : 1;
          this.registers.si = (this.registers.si + inc) & 0xFFFF;
        }
        break;
      }

      case 'STOSB':
      case 'STOSW': {
        const isWord = mnemonic === 'STOSW';
        const destAddr = this.getPhysicalAddress(this.registers.es, this.registers.di);
        if (isWord) {
          this.writeMemoryWord(destAddr, this.registers.ax);
          const inc = this.flags.df ? -2 : 2;
          this.registers.di = (this.registers.di + inc) & 0xFFFF;
        } else {
          this.writeMemoryByte(destAddr, this.registers.ax & 0xFF);
          const inc = this.flags.df ? -1 : 1;
          this.registers.di = (this.registers.di + inc) & 0xFFFF;
        }
        break;
      }

      case 'CMPSB':
      case 'CMPSW': {
        const isWord = mnemonic === 'CMPSW';
        const s1 = this.readMemoryByte(this.getPhysicalAddress(this.registers.ds, this.registers.si));
        const s2 = this.readMemoryByte(this.getPhysicalAddress(this.registers.es, this.registers.di));
        this.updateAluFlagsSub(s1, s2, s1 - s2, isWord, 0);
        const inc = this.flags.df ? (isWord ? -2 : -1) : (isWord ? 2 : 1);
        this.registers.si = (this.registers.si + inc) & 0xFFFF;
        this.registers.di = (this.registers.di + inc) & 0xFFFF;
        break;
      }

      case 'SCASB':
      case 'SCASW': {
        const isWord = mnemonic === 'SCASW';
        const al = isWord ? this.registers.ax : (this.registers.ax & 0xFF);
        const destVal = isWord 
          ? this.readMemoryWord(this.getPhysicalAddress(this.registers.es, this.registers.di))
          : this.readMemoryByte(this.getPhysicalAddress(this.registers.es, this.registers.di));
        this.updateAluFlagsSub(al, destVal, al - destVal, isWord, 0);
        const inc = this.flags.df ? (isWord ? -2 : -1) : (isWord ? 2 : 1);
        this.registers.di = (this.registers.di + inc) & 0xFFFF;
        break;
      }
    }

    this.instructionsExecuted++;
    this.totalCycles += inst.cycles || 4;
    this.fillPrefetchQueue();
    this.updatePins();
    return true;
  }

  // Handle DOS / BIOS interrupts
  private handleInterrupt(intNum: number): void {
    if (intNum === 0x21) {
      // DOS API
      const ah = (this.registers.ax >> 8) & 0xFF;
      if (ah === 0x01) {
        // Read character from STDIN with echo
        const char = this.keyboardBuffer.length > 0 ? this.keyboardBuffer[0] : '\n';
        this.keyboardBuffer = this.keyboardBuffer.slice(1);
        this.setRegister('AL', char.charCodeAt(0));
        this.consoleOutput += char;
      } else if (ah === 0x02) {
        // Print character in DL
        const dl = this.registers.dx & 0xFF;
        this.consoleOutput += String.fromCharCode(dl);
      } else if (ah === 0x09) {
        // Print $-terminated string at DS:DX
        let addr = this.getPhysicalAddress(this.registers.ds, this.registers.dx);
        let str = '';
        for (let i = 0; i < 2048; i++) {
          const ch = this.memory[addr + i];
          if (ch === 0x24) break; // '$'
          str += String.fromCharCode(ch);
        }
        this.consoleOutput += str;
      } else if (ah === 0x4C) {
        // Terminate program
        this.isHalted = true;
        this.consoleOutput += '\n[Program Terminated with exit code ' + (this.registers.ax & 0xFF) + ']\n';
      }
    } else if (intNum === 0x10) {
      // Video BIOS
      const ah = (this.registers.ax >> 8) & 0xFF;
      if (ah === 0x0E) {
        // Teletype output AL
        const al = this.registers.ax & 0xFF;
        this.consoleOutput += String.fromCharCode(al);
      }
    } else {
      this.triggerInterrupt(intNum);
    }
  }

  public triggerInterrupt(intNum: number): void {
    if (!this.flags.if_ && intNum !== 2) return; // NMI cannot be masked
    let f = 0;
    if (this.flags.of) f |= 0x0800;
    if (this.flags.df) f |= 0x0400;
    if (this.flags.if_) f |= 0x0200;
    if (this.flags.tf) f |= 0x0100;
    if (this.flags.sf) f |= 0x0080;
    if (this.flags.zf) f |= 0x0040;
    if (this.flags.af) f |= 0x0010;
    if (this.flags.pf) f |= 0x0004;
    if (this.flags.cf) f |= 0x0001;

    this.push(f);
    this.push(this.registers.cs);
    this.push(this.registers.ip);

    this.flags.if_ = false;
    this.flags.tf = false;

    // Read Interrupt Vector Table (IVT at 0000:4*N)
    const ivtAddr = (intNum * 4) & 0x3FF;
    const newIP = this.readMemoryWord(ivtAddr);
    const newCS = this.readMemoryWord(ivtAddr + 2);

    if (newCS !== 0 || newIP !== 0) {
      this.registers.ip = newIP;
      this.registers.cs = newCS;
    }
  }

  // Helpers for flags calculation
  private updateAluFlagsAdd(v1: number, v2: number, res: number, isWord: boolean, carry: number): void {
    const mask = isWord ? 0xFFFF : 0xFF;
    const signBit = isWord ? 0x8000 : 0x80;
    const cleanRes = res & mask;

    this.flags.zf = cleanRes === 0;
    this.flags.sf = (cleanRes & signBit) !== 0;
    this.flags.cf = res > mask;
    this.flags.pf = this.calculateParity(cleanRes & 0xFF);
    this.flags.af = ((v1 & 0x0F) + (v2 & 0x0F) + carry) > 0x0F;
    // Overflow: (+A) + (+B) = -C or (-A) + (-B) = +C
    const s1 = (v1 & signBit) !== 0;
    const s2 = (v2 & signBit) !== 0;
    const sr = (cleanRes & signBit) !== 0;
    this.flags.of = (s1 === s2) && (s1 !== sr);
  }

  private updateAluFlagsSub(v1: number, v2: number, res: number, isWord: boolean, borrow: number): void {
    const mask = isWord ? 0xFFFF : 0xFF;
    const signBit = isWord ? 0x8000 : 0x80;
    const cleanRes = res & mask;

    this.flags.zf = cleanRes === 0;
    this.flags.sf = (cleanRes & signBit) !== 0;
    this.flags.cf = res < 0;
    this.flags.pf = this.calculateParity(cleanRes & 0xFF);
    this.flags.af = ((v1 & 0x0F) - (v2 & 0x0F) - borrow) < 0;
    const s1 = (v1 & signBit) !== 0;
    const s2 = (v2 & signBit) !== 0;
    const sr = (cleanRes & signBit) !== 0;
    this.flags.of = (s1 !== s2) && (s1 !== sr);
  }

  private updateFlagsLogical(res: number, isWord: boolean): void {
    const mask = isWord ? 0xFFFF : 0xFF;
    const signBit = isWord ? 0x8000 : 0x80;
    const clean = res & mask;

    this.flags.zf = clean === 0;
    this.flags.sf = (clean & signBit) !== 0;
    this.flags.cf = false;
    this.flags.of = false;
    this.flags.pf = this.calculateParity(clean & 0xFF);
  }

  private calculateParity(byte: number): boolean {
    let count = 0;
    for (let i = 0; i < 8; i++) {
      if ((byte >> i) & 1) count++;
    }
    return count % 2 === 0; // True if even number of 1 bits
  }

  private isWordOperand(op: string, symbols: Map<string, SymbolEntry>): boolean {
    const u = op.toUpperCase().trim();
    if (['AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'BP', 'SP', 'CS', 'DS', 'SS', 'ES', 'IP'].includes(u)) return true;
    if (['AL', 'AH', 'BL', 'BH', 'CL', 'CH', 'DL', 'DH'].includes(u)) return false;
    if (u.includes('WORD PTR')) return true;
    if (u.includes('BYTE PTR')) return false;
    if (symbols.has(u)) return symbols.get(u)?.type === 'VARIABLE_WORD';
    return false;
  }

  private getOperandValue(op: string, symbols: Map<string, SymbolEntry>): number {
    const u = op.toUpperCase().trim();
    if (this.isRegister(u)) {
      return this.getRegister(u);
    }
    if (u.startsWith('[') || symbols.has(u) || u.includes('PTR')) {
      const addrObj = this.resolveAddress(op, symbols);
      return addrObj.isWord ? this.readMemoryWord(addrObj.physical) : this.readMemoryByte(addrObj.physical);
    }
    if (u.startsWith('OFFSET ')) {
      const symName = u.substring(7).trim();
      return symbols.get(symName)?.offset ?? 0;
    }
    if (u === '@DATA') return 0x0800;

    // Number literal
    if (u.endsWith('H')) return parseInt(u.slice(0, -1), 16) || 0;
    if (u.endsWith('B')) return parseInt(u.slice(0, -1), 2) || 0;
    if (u.startsWith("'") && u.endsWith("'") && u.length === 3) return u.charCodeAt(1);
    return parseInt(u, 10) || 0;
  }

  private setOperandValue(dest: string, value: number, symbols: Map<string, SymbolEntry>): void {
    const u = dest.toUpperCase().trim();
    if (this.isRegister(u)) {
      this.setRegister(u, value);
      return;
    }
    if (u.startsWith('[') || symbols.has(u) || u.includes('PTR')) {
      const addrObj = this.resolveAddress(dest, symbols);
      if (addrObj.isWord) {
        this.writeMemoryWord(addrObj.physical, value);
      } else {
        this.writeMemoryByte(addrObj.physical, value & 0xFF);
      }
    }
  }

  private isRegister(name: string): boolean {
    return ['AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'BP', 'SP', 'IP', 'CS', 'DS', 'SS', 'ES', 'AL', 'AH', 'BL', 'BH', 'CL', 'CH', 'DL', 'DH'].includes(name.toUpperCase());
  }

  private resolveJumpTarget(target: string, symbols: Map<string, SymbolEntry>): number {
    const u = target.toUpperCase().trim();
    if (symbols.has(u)) {
      return symbols.get(u)!.offset;
    }
    if (u.endsWith('H')) return parseInt(u.slice(0, -1), 16) || 0;
    return parseInt(u, 10) || 0;
  }

  // Update 40-Pin DIP Intel 8086 state
  public updatePins(): void {
    const phys = this.biu.lastAddress;
    const data = this.biu.lastData;
    const isMem = this.biu.m_io;
    const isRD = !this.biu.rd;
    const isWR = !this.biu.wr;

    this.pins = [
      { pinNumber: 1, pinName: 'GND', pinType: 'GROUND', description: 'Ground Reference (0V)', level: 'LOW', voltage: 0 },
      { pinNumber: 2, pinName: 'AD14', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 14', level: (phys & 0x4000) ? 'HIGH' : 'LOW' },
      { pinNumber: 3, pinName: 'AD13', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 13', level: (phys & 0x2000) ? 'HIGH' : 'LOW' },
      { pinNumber: 4, pinName: 'AD12', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 12', level: (phys & 0x1000) ? 'HIGH' : 'LOW' },
      { pinNumber: 5, pinName: 'AD11', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 11', level: (phys & 0x0800) ? 'HIGH' : 'LOW' },
      { pinNumber: 6, pinName: 'AD10', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 10', level: (phys & 0x0400) ? 'HIGH' : 'LOW' },
      { pinNumber: 7, pinName: 'AD9', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 9', level: (phys & 0x0200) ? 'HIGH' : 'LOW' },
      { pinNumber: 8, pinName: 'AD8', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 8', level: (phys & 0x0100) ? 'HIGH' : 'LOW' },
      { pinNumber: 9, pinName: 'AD7', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 7', level: (phys & 0x0080) ? 'HIGH' : 'LOW' },
      { pinNumber: 10, pinName: 'AD6', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 6', level: (phys & 0x0040) ? 'HIGH' : 'LOW' },
      { pinNumber: 11, pinName: 'AD5', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 5', level: (phys & 0x0020) ? 'HIGH' : 'LOW' },
      { pinNumber: 12, pinName: 'AD4', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 4', level: (phys & 0x0010) ? 'HIGH' : 'LOW' },
      { pinNumber: 13, pinName: 'AD3', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 3', level: (phys & 0x0008) ? 'HIGH' : 'LOW' },
      { pinNumber: 14, pinName: 'AD2', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 2', level: (phys & 0x0004) ? 'HIGH' : 'LOW' },
      { pinNumber: 15, pinName: 'AD1', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 1', level: (phys & 0x0002) ? 'HIGH' : 'LOW' },
      { pinNumber: 16, pinName: 'AD0', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 0', level: (phys & 0x0001) ? 'HIGH' : 'LOW' },
      { pinNumber: 17, pinName: 'NMI', pinType: 'INPUT', description: 'Non-Maskable Interrupt Request (Edge triggered)', level: 'LOW' },
      { pinNumber: 18, pinName: 'INTR', pinType: 'INPUT', description: 'Interrupt Request (Level triggered)', level: this.pic8259.irr !== 0 ? 'HIGH' : 'LOW' },
      { pinNumber: 19, pinName: 'CLK', pinType: 'INPUT', description: 'System Clock Input (33% Duty Cycle)', level: (this.totalCycles % 2 === 0) ? 'HIGH' : 'LOW' },
      { pinNumber: 20, pinName: 'GND', pinType: 'GROUND', description: 'Ground Reference (0V)', level: 'LOW', voltage: 0 },

      // Right column (Pins 21-40)
      { pinNumber: 21, pinName: 'RESET', pinType: 'INPUT', description: 'Processor Reset (Sync with CLK)', level: 'LOW' },
      { pinNumber: 22, pinName: 'READY', pinType: 'INPUT', description: 'Bus Ready Acknowledge from Memory/Peripherals', level: 'HIGH' },
      { pinNumber: 23, pinName: 'TEST', pinType: 'INPUT', description: 'Test input for WAIT instruction', level: 'HIGH' },
      { pinNumber: 24, pinName: 'INTA', pinType: 'OUTPUT', description: 'Interrupt Acknowledge (Active Low)', level: this.biu.inta ? 'HIGH' : 'LOW' },
      { pinNumber: 25, pinName: 'ALE', pinType: 'OUTPUT', description: 'Address Latch Enable (Latches AD0-AD15 to 74LS373)', level: (this.biu.tState === 'T1' || this.biu.ale) ? 'HIGH' : 'LOW' },
      { pinNumber: 26, pinName: 'DEN', pinType: 'OUTPUT', description: 'Data Enable for 74LS245 Transceiver (Active Low)', level: (isRD || isWR) ? 'LOW' : 'HIGH' },
      { pinNumber: 27, pinName: 'DT/R', pinType: 'OUTPUT', description: 'Data Transmit/Receive (High=Transmit, Low=Receive)', level: isWR ? 'HIGH' : 'LOW' },
      { pinNumber: 28, pinName: 'M/IO', pinType: 'OUTPUT', description: 'Memory/IO Status (High=Memory, Low=IO Port)', level: isMem ? 'HIGH' : 'LOW' },
      { pinNumber: 29, pinName: 'WR', pinType: 'OUTPUT', description: 'Write Strobe (Active Low)', level: isWR ? 'LOW' : 'HIGH' },
      { pinNumber: 30, pinName: 'HLDA', pinType: 'OUTPUT', description: 'Hold Acknowledge (DMA Transfer Active)', level: 'LOW' },
      { pinNumber: 31, pinName: 'HOLD', pinType: 'INPUT', description: 'Hold Request (Bus Master Request)', level: 'LOW' },
      { pinNumber: 32, pinName: 'RD', pinType: 'OUTPUT', description: 'Read Strobe (Active Low)', level: isRD ? 'LOW' : 'HIGH' },
      { pinNumber: 33, pinName: 'MN/MX', pinType: 'INPUT', description: 'Minimum/Maximum Mode Select (Tie High for Min Mode)', level: 'HIGH', voltage: 5.0 },
      { pinNumber: 34, pinName: 'BHE/S7', pinType: 'OUTPUT', description: 'Bus High Enable / Status S7 (Active Low for high byte)', level: 'LOW' },
      { pinNumber: 35, pinName: 'A19/S6', pinType: 'OUTPUT', description: 'Address Line A19 / Status Line S6', level: (phys & 0x80000) ? 'HIGH' : 'LOW' },
      { pinNumber: 36, pinName: 'A18/S5', pinType: 'OUTPUT', description: 'Address Line A18 / Status Line S5 (Interrupt Flag Status)', level: (phys & 0x40000) ? 'HIGH' : 'LOW' },
      { pinNumber: 37, pinName: 'A17/S4', pinType: 'OUTPUT', description: 'Address Line A17 / Status Line S4 (Segment Identifier)', level: (phys & 0x20000) ? 'HIGH' : 'LOW' },
      { pinNumber: 38, pinName: 'A16/S3', pinType: 'OUTPUT', description: 'Address Line A16 / Status Line S3 (Segment Identifier)', level: (phys & 0x10000) ? 'HIGH' : 'LOW' },
      { pinNumber: 39, pinName: 'AD15', pinType: 'INOUT', description: 'Multiplexed Address/Data Bit 15', level: (phys & 0x8000) ? 'HIGH' : 'LOW' },
      { pinNumber: 40, pinName: 'VCC', pinType: 'POWER', description: 'Power Supply (+5V DC)', level: 'HIGH', voltage: 5.0 },
    ];
  }
}

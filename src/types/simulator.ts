export interface Registers {
  ax: number; // 16-bit
  bx: number;
  cx: number;
  dx: number;
  si: number;
  di: number;
  bp: number;
  sp: number;
  ip: number;
  cs: number;
  ds: number;
  ss: number;
  es: number;
}

export interface Flags {
  cf: boolean; // Carry Flag
  pf: boolean; // Parity Flag
  af: boolean; // Auxiliary Carry Flag
  zf: boolean; // Zero Flag
  sf: boolean; // Sign Flag
  tf: boolean; // Trap Flag
  if_: boolean; // Interrupt Enable Flag
  df: boolean; // Direction Flag
  of: boolean; // Overflow Flag
}

export type BusCycleType = 
  | 'IDLE'
  | 'CODE_FETCH'
  | 'MEM_READ'
  | 'MEM_WRITE'
  | 'IO_READ'
  | 'IO_WRITE'
  | 'INT_ACK'
  | 'HALT';

export interface PinState {
  pinNumber: number;
  pinName: string;
  pinType: 'INPUT' | 'OUTPUT' | 'INOUT' | 'POWER' | 'GROUND';
  description: string;
  level: 'HIGH' | 'LOW' | 'TRI_STATE';
  voltage?: number;
}

export interface BIUState {
  queue: number[]; // 6-byte instruction prefetch queue
  queueCapacity: number;
  activeCycle: BusCycleType;
  tState: 'T1' | 'T2' | 'T3' | 'Tw' | 'T4' | 'Ti';
  lastAddress: number; // 20-bit
  lastData: number; // 16-bit
  ale: boolean;
  rd: boolean;
  wr: boolean;
  m_io: boolean; // 1=Memory, 0=I/O
  den: boolean;  // Data enable
  dt_r: boolean; // Data Transmit/Receive (1=Trans, 0=Rec)
  inta: boolean;
  bhe: boolean;  // Bus High Enable
}

export interface EUState {
  aluOp1: number;
  aluOp2: number;
  aluResult: number;
  aluOpName: string;
  currentMnemonic: string;
  microStep: string;
  isBusy: boolean;
}

export interface PPI8255 {
  portA: number; // 8-bit (0x80)
  portB: number; // 8-bit (0x82)
  portC: number; // 8-bit (0x84)
  controlWord: number; // 0x86
  modeA: number; // 0, 1, 2
  modeB: number; // 0, 1
  portADirection: 'IN' | 'OUT';
  portBDirection: 'IN' | 'OUT';
  portCHighDirection: 'IN' | 'OUT';
  portCLowDirection: 'IN' | 'OUT';
}

export interface PIT8254Counter {
  count: number;
  initialCount: number;
  mode: number; // 0-5
  bcd: boolean;
  readState: 'LSB' | 'MSB' | 'BOTH_LSB' | 'BOTH_MSB';
  writeState: 'LSB' | 'MSB' | 'BOTH_LSB' | 'BOTH_MSB';
  latchedCount: number | null;
  out: boolean;
  gate: boolean;
}

export interface PIT8254 {
  counter0: PIT8254Counter;
  counter1: PIT8254Counter;
  counter2: PIT8254Counter;
  controlWord: number;
}

export interface PIC8259 {
  irr: number; // Interrupt Request Register (8-bit)
  isr: number; // In-Service Register (8-bit)
  imr: number; // Interrupt Mask Register (8-bit)
  vectorBase: number; // ICW2 base vector (default 0x08)
  activeIRQ: number | null;
}

export interface TrainerHardware {
  leds: number; // 8 LEDs (Port A output or custom)
  switches: number; // 8 DIP switches (Port B input)
  sevenSegDigits: [number, number, number, number]; // 4 digits 7-segment values
  sevenSegRawPatterns: [number, number, number, number];
  matrixKeypadPressedKey: string | null;
  stepperMotorAngle: number; // 0 - 360 deg
  stepperMotorStep: number; // 0-3 phase
  trafficLights: {
    northRed: boolean;
    northYellow: boolean;
    northGreen: boolean;
    eastRed: boolean;
    eastYellow: boolean;
    eastGreen: boolean;
  };
  lcd: {
    line1: string;
    line2: string;
    cursorPos: number;
    enabled: boolean;
  };
  dacOutput: number[]; // circular buffer for analog scope
  buzzer: boolean;
}

export interface AssembledInstruction {
  address: number; // 20-bit physical
  segment: number;
  offset: number;
  bytes: number[];
  mnemonic: string;
  operands: string;
  sourceLine: number;
  sourceText: string;
  cycles: number;
  isJumpTarget?: boolean;
}

export interface SymbolEntry {
  name: string;
  type: 'LABEL' | 'VARIABLE_BYTE' | 'VARIABLE_WORD' | 'CONSTANT' | 'PROCEDURE';
  value: number;
  segment: string;
  offset: number;
  size: number;
}

export interface ProgramListing {
  instructions: AssembledInstruction[];
  sourceToAddressMap: Map<number, number>; // line -> physical address
  addressToInstructionMap: Map<number, AssembledInstruction>;
  symbols: Map<string, SymbolEntry>;
  errors: AssemblyError[];
  codeSize: number;
  dataSize: number;
  entryPoint: { segment: number; offset: number };
}

export interface AssemblyError {
  line: number;
  message: string;
  column?: number;
}

export interface ExecutionLog {
  id: string;
  cycle: number;
  address: string;
  instruction: string;
  ax: string;
  bx: string;
  cx: string;
  dx: string;
  flags: string;
}

export type ViewTab = 
  | 'CHIP_PINOUT'
  | 'ARCHITECTURE'
  | 'TRAINER_BOARD'
  | 'MEMORY_MAP'
  | 'BUS_TIMING'
  | 'INTERRUPTS';

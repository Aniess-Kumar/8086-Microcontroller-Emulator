import { AssembledInstruction, AssemblyError, ProgramListing, SymbolEntry } from '../types/simulator';

// 8086 Instruction Set Opcode & Byte Encoder
export class Assembler8086 {
  public static assemble(source: string): ProgramListing {
    const lines = source.split('\n');
    const instructions: AssembledInstruction[] = [];
    const sourceToAddressMap = new Map<number, number>();
    const addressToInstructionMap = new Map<number, AssembledInstruction>();
    const symbols = new Map<string, SymbolEntry>();
    const errors: AssemblyError[] = [];

    let currentSegment = 'CODE';
    let codeSegmentBase = 0x0700; // Typical 8086 CS base
    let dataSegmentBase = 0x0800; // Typical 8086 DS base
    let stackSegmentBase = 0x0900; // Typical 8086 SS base
    
    let codeOffset = 0x0000;
    let dataOffset = 0x0000;
    let stackOffset = 0x0100;
    let entryPoint = { segment: codeSegmentBase, offset: 0x0000 };

    // PASS 1: Scan for segments, directives, labels, and data declarations
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const rawLine = lines[lineIndex];
      const lineNum = lineIndex + 1;
      
      // Strip comments
      let cleanLine = rawLine.split(';')[0].trim();
      if (!cleanLine) continue;

      // Check section directives
      const upperLine = cleanLine.toUpperCase();
      if (upperLine.startsWith('.DATA') || upperLine.includes('DATA SEGMENT')) {
        currentSegment = 'DATA';
        continue;
      }
      if (upperLine.startsWith('.CODE') || upperLine.includes('CODE SEGMENT')) {
        currentSegment = 'CODE';
        continue;
      }
      if (upperLine.startsWith('.STACK') || upperLine.includes('STACK SEGMENT')) {
        currentSegment = 'STACK';
        continue;
      }
      if (upperLine.endsWith('ENDS') || upperLine === 'DATA ENDS' || upperLine === 'CODE ENDS' || upperLine === 'STACK ENDS') {
        continue;
      }
      if (upperLine.startsWith('ASSUME') || upperLine.startsWith('ENDP') || upperLine.startsWith('END')) {
        if (upperLine.startsWith('END') && upperLine.length > 4) {
          const entryLabel = cleanLine.substring(3).trim();
          if (entryLabel && symbols.has(entryLabel.toUpperCase())) {
            const sym = symbols.get(entryLabel.toUpperCase())!;
            entryPoint = { segment: codeSegmentBase, offset: sym.offset };
          }
        }
        continue;
      }

      // Check ORG directive
      const orgMatch = cleanLine.match(/^ORG\s+([0-9A-Fa-f]+[Hh]?|[0-9]+)/i);
      if (orgMatch) {
        const val = this.parseNumber(orgMatch[1]);
        if (currentSegment === 'CODE') codeOffset = val;
        else if (currentSegment === 'DATA') dataOffset = val;
        continue;
      }

      // Check EQU directive
      const equMatch = cleanLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+EQU\s+(.+)$/i);
      if (equMatch) {
        const name = equMatch[1].toUpperCase();
        const val = this.parseNumber(equMatch[2].trim());
        symbols.set(name, {
          name,
          type: 'CONSTANT',
          value: val,
          segment: currentSegment,
          offset: val,
          size: 2,
        });
        continue;
      }

      // Check Label definition (e.g. `START:` or `LOOP_1:`)
      const labelMatch = cleanLine.match(/^([A-Za-z_][A-Za-z0-9_]*):/i);
      if (labelMatch) {
        const labelName = labelMatch[1].toUpperCase();
        symbols.set(labelName, {
          name: labelName,
          type: 'LABEL',
          value: codeOffset,
          segment: 'CODE',
          offset: codeOffset,
          size: 0,
        });
        cleanLine = cleanLine.substring(labelMatch[0].length).trim();
        if (!cleanLine) continue;
      }

      // Check PROC directive
      const procMatch = cleanLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+PROC/i);
      if (procMatch) {
        const procName = procMatch[1].toUpperCase();
        symbols.set(procName, {
          name: procName,
          type: 'PROCEDURE',
          value: codeOffset,
          segment: 'CODE',
          offset: codeOffset,
          size: 0,
        });
        continue;
      }

      // Check DB / DW data definitions in DATA segment (or inline)
      const dataDefMatch = cleanLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(DB|DW)\s+(.+)$/i);
      if (dataDefMatch) {
        const varName = dataDefMatch[1].toUpperCase();
        const type = dataDefMatch[2].toUpperCase();
        const rawValues = dataDefMatch[3].trim();
        const sizeBytes = this.calculateDataSize(type, rawValues);

        symbols.set(varName, {
          name: varName,
          type: type === 'DB' ? 'VARIABLE_BYTE' : 'VARIABLE_WORD',
          value: dataOffset,
          segment: 'DATA',
          offset: dataOffset,
          size: sizeBytes,
        });
        dataOffset += sizeBytes;
        continue;
      }

      // In CODE segment, rough estimate for offset advance
      if (currentSegment === 'CODE' && cleanLine) {
        // Estimate 1 to 4 bytes per instruction
        codeOffset += this.estimateInstructionSize(cleanLine);
      }
    }

    // PASS 2: Assemble Instructions and map to exact addresses
    currentSegment = 'CODE';
    codeOffset = 0x0000;
    dataOffset = 0x0000;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const rawLine = lines[lineIndex];
      const lineNum = lineIndex + 1;
      
      let cleanLine = rawLine.split(';')[0].trim();
      if (!cleanLine) continue;

      const upperLine = cleanLine.toUpperCase();
      if (upperLine.startsWith('.DATA') || upperLine.includes('DATA SEGMENT')) {
        currentSegment = 'DATA';
        continue;
      }
      if (upperLine.startsWith('.CODE') || upperLine.includes('CODE SEGMENT')) {
        currentSegment = 'CODE';
        continue;
      }
      if (upperLine.startsWith('.STACK') || upperLine.includes('STACK SEGMENT')) {
        currentSegment = 'STACK';
        continue;
      }
      if (upperLine.endsWith('ENDS') || upperLine.startsWith('ASSUME') || upperLine.startsWith('ENDP') || upperLine.startsWith('END') || upperLine.startsWith('EQU')) {
        continue;
      }

      // Handle ORG
      const orgMatch = cleanLine.match(/^ORG\s+([0-9A-Fa-f]+[Hh]?|[0-9]+)/i);
      if (orgMatch) {
        const val = this.parseNumber(orgMatch[1]);
        if (currentSegment === 'CODE') codeOffset = val;
        else if (currentSegment === 'DATA') dataOffset = val;
        continue;
      }

      // Strip leading labels
      const labelMatch = cleanLine.match(/^([A-Za-z_][A-Za-z0-9_]*):/i);
      if (labelMatch) {
        cleanLine = cleanLine.substring(labelMatch[0].length).trim();
        if (!cleanLine) continue;
      }

      // Skip standalone PROC
      if (cleanLine.match(/^[A-Za-z_][A-Za-z0-9_]*\s+PROC/i)) {
        continue;
      }

      // Process Data in DATA segment
      const dataDefMatch = cleanLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(DB|DW)\s+(.+)$/i);
      if (dataDefMatch) {
        const type = dataDefMatch[2].toUpperCase();
        const rawValues = dataDefMatch[3].trim();
        const sizeBytes = this.calculateDataSize(type, rawValues);
        dataOffset += sizeBytes;
        continue;
      }

      if (currentSegment === 'CODE') {
        try {
          const inst = this.parseAndEncodeInstruction(cleanLine, codeSegmentBase, codeOffset, lineNum, rawLine, symbols);
          if (inst) {
            instructions.push(inst);
            const physicalAddr = (codeSegmentBase << 4) + codeOffset;
            sourceToAddressMap.set(lineNum, physicalAddr);
            addressToInstructionMap.set(physicalAddr, inst);
            codeOffset += inst.bytes.length;
          }
        } catch (err: any) {
          errors.push({
            line: lineNum,
            message: err.message || 'Syntax error in instruction',
          });
        }
      }
    }

    if (instructions.length > 0 && entryPoint.offset === 0) {
      entryPoint.offset = instructions[0].offset;
    }

    return {
      instructions,
      sourceToAddressMap,
      addressToInstructionMap,
      symbols,
      errors,
      codeSize: codeOffset,
      dataSize: dataOffset,
      entryPoint,
    };
  }

  private static parseNumber(str: string): number {
    str = str.trim();
    if (!str) return 0;
    if (str.endsWith('H') || str.endsWith('h')) {
      return parseInt(str.slice(0, -1), 16) || 0;
    }
    if (str.endsWith('B') || str.endsWith('b')) {
      return parseInt(str.slice(0, -1), 2) || 0;
    }
    if (str.startsWith('0x') || str.startsWith('0X')) {
      return parseInt(str.slice(2), 16) || 0;
    }
    if (str.startsWith("'") && str.endsWith("'") && str.length === 3) {
      return str.charCodeAt(1);
    }
    return parseInt(str, 10) || 0;
  }

  private static calculateDataSize(type: string, rawValues: string): number {
    let size = 0;
    // Check DUP e.g. `10 DUP(0)` or `5 DUP(?)`
    const dupMatch = rawValues.match(/([0-9]+)\s+DUP\s*\((.*)\)/i);
    if (dupMatch) {
      const count = parseInt(dupMatch[1], 10);
      const unitSize = type === 'DB' ? 1 : 2;
      return count * unitSize;
    }

    // Split commas (respecting strings)
    const tokens = this.tokenizeOperands(rawValues);
    for (const token of tokens) {
      if (token.startsWith("'") && token.endsWith("'")) {
        // String literal
        size += (token.length - 2) * (type === 'DB' ? 1 : 2);
      } else if (token.startsWith('"') && token.endsWith('"')) {
        size += (token.length - 2) * (type === 'DB' ? 1 : 2);
      } else {
        size += type === 'DB' ? 1 : 2;
      }
    }
    return Math.max(size, type === 'DB' ? 1 : 2);
  }

  private static tokenizeOperands(operandsStr: string): string[] {
    const tokens: string[] = [];
    let cur = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < operandsStr.length; i++) {
      const ch = operandsStr[i];
      if ((ch === "'" || ch === '"') && !inString) {
        inString = true;
        stringChar = ch;
        cur += ch;
      } else if (ch === stringChar && inString) {
        inString = false;
        cur += ch;
      } else if (ch === ',' && !inString) {
        tokens.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    if (cur.trim()) {
      tokens.push(cur.trim());
    }
    return tokens;
  }

  private static estimateInstructionSize(line: string): number {
    const parts = line.split(/\s+/);
    const mnemonic = parts[0]?.toUpperCase() || '';
    if (['NOP', 'HLT', 'CLC', 'STC', 'CMC', 'CLD', 'STD', 'CLI', 'STI', 'CBW', 'CWD', 'LAHF', 'SAHF', 'PUSHF', 'POPF', 'RET', 'IRET', 'MOVSB', 'MOVSW', 'LODSB', 'LODSW', 'STOSB', 'STOSW', 'CMPSB', 'CMPSW', 'SCASB', 'SCASW'].includes(mnemonic)) {
      return 1;
    }
    if (['INC', 'DEC', 'PUSH', 'POP'].includes(mnemonic)) {
      return 1;
    }
    if (['JMP', 'JE', 'JZ', 'JNE', 'JNZ', 'JC', 'JNC', 'JA', 'JB', 'JG', 'JL', 'LOOP', 'CALL', 'INT'].includes(mnemonic)) {
      return 2;
    }
    return 3;
  }

  private static parseAndEncodeInstruction(
    line: string,
    segment: number,
    offset: number,
    sourceLine: number,
    sourceText: string,
    symbols: Map<string, SymbolEntry>
  ): AssembledInstruction | null {
    const firstSpace = line.search(/\s/);
    let mnemonic = '';
    let operandsStr = '';

    if (firstSpace === -1) {
      mnemonic = line.toUpperCase();
      operandsStr = '';
    } else {
      mnemonic = line.substring(0, firstSpace).toUpperCase();
      operandsStr = line.substring(firstSpace).trim();
    }

    const operands = this.tokenizeOperands(operandsStr);
    const bytes: number[] = [];
    let cycles = 4; // Default baseline cycles

    // 8086 Opcode Encoding Map
    switch (mnemonic) {
      case 'NOP':
        bytes.push(0x90);
        cycles = 3;
        break;
      case 'HLT':
        bytes.push(0xF4);
        cycles = 2;
        break;
      case 'CLC':
        bytes.push(0xF8);
        cycles = 2;
        break;
      case 'STC':
        bytes.push(0xF9);
        cycles = 2;
        break;
      case 'CMC':
        bytes.push(0xF5);
        cycles = 2;
        break;
      case 'CLD':
        bytes.push(0xFC);
        cycles = 2;
        break;
      case 'STD':
        bytes.push(0xFD);
        cycles = 2;
        break;
      case 'CLI':
        bytes.push(0xFA);
        cycles = 2;
        break;
      case 'STI':
        bytes.push(0xFB);
        cycles = 2;
        break;
      case 'CBW':
        bytes.push(0x98);
        cycles = 2;
        break;
      case 'CWD':
        bytes.push(0x99);
        cycles = 5;
        break;
      case 'LAHF':
        bytes.push(0x9F);
        cycles = 4;
        break;
      case 'SAHF':
        bytes.push(0x9E);
        cycles = 4;
        break;
      case 'PUSHF':
        bytes.push(0x9C);
        cycles = 10;
        break;
      case 'POPF':
        bytes.push(0x9D);
        cycles = 8;
        break;
      case 'RET':
        bytes.push(0xC3);
        cycles = 8;
        break;
      case 'IRET':
        bytes.push(0xCF);
        cycles = 24;
        break;
      case 'MOVSB':
        bytes.push(0xA4);
        cycles = 18;
        break;
      case 'MOVSW':
        bytes.push(0xA5);
        cycles = 18;
        break;
      case 'LODSB':
        bytes.push(0xAC);
        cycles = 12;
        break;
      case 'LODSW':
        bytes.push(0xAD);
        cycles = 12;
        break;
      case 'STOSB':
        bytes.push(0xAA);
        cycles = 11;
        break;
      case 'STOSW':
        bytes.push(0xAB);
        cycles = 11;
        break;
      case 'CMPSB':
        bytes.push(0xA6);
        cycles = 22;
        break;
      case 'CMPSW':
        bytes.push(0xA7);
        cycles = 22;
        break;
      case 'SCASB':
        bytes.push(0xAE);
        cycles = 15;
        break;
      case 'SCASW':
        bytes.push(0xAF);
        cycles = 15;
        break;
      case 'XLAT':
      case 'XLATB':
        bytes.push(0xD7);
        cycles = 11;
        break;

      case 'INT': {
        const intNum = this.resolveValue(operands[0] || '21H', symbols);
        bytes.push(0xCD, intNum & 0xFF);
        cycles = 51;
        break;
      }

      case 'IN': {
        // IN AL, imm8 / IN AL, DX / IN AX, DX
        const dest = operands[0]?.toUpperCase();
        const src = operands[1]?.toUpperCase();
        if (dest === 'AL' && src === 'DX') {
          bytes.push(0xEC);
          cycles = 8;
        } else if (dest === 'AX' && src === 'DX') {
          bytes.push(0xED);
          cycles = 8;
        } else {
          const port = this.resolveValue(operands[1], symbols);
          if (dest === 'AL') {
            bytes.push(0xE4, port & 0xFF);
            cycles = 10;
          } else {
            bytes.push(0xE5, port & 0xFF);
            cycles = 10;
          }
        }
        break;
      }

      case 'OUT': {
        // OUT DX, AL / OUT imm8, AL
        const dest = operands[0]?.toUpperCase();
        const src = operands[1]?.toUpperCase();
        if (dest === 'DX' && src === 'AL') {
          bytes.push(0xEE);
          cycles = 8;
        } else if (dest === 'DX' && src === 'AX') {
          bytes.push(0xEF);
          cycles = 8;
        } else {
          const port = this.resolveValue(operands[0], symbols);
          if (src === 'AL') {
            bytes.push(0xE6, port & 0xFF);
            cycles = 10;
          } else {
            bytes.push(0xE7, port & 0xFF);
            cycles = 10;
          }
        }
        break;
      }

      case 'MOV': {
        const dest = operands[0];
        const src = operands[1];
        const encoded = this.encodeMov(dest, src, symbols, offset);
        bytes.push(...encoded.bytes);
        cycles = encoded.cycles;
        break;
      }

      case 'ADD':
      case 'ADC':
      case 'SUB':
      case 'SBB':
      case 'CMP':
      case 'AND':
      case 'OR':
      case 'XOR':
      case 'TEST': {
        const dest = operands[0];
        const src = operands[1];
        const encoded = this.encodeAlu(mnemonic, dest, src, symbols, offset);
        bytes.push(...encoded.bytes);
        cycles = encoded.cycles;
        break;
      }

      case 'INC':
      case 'DEC': {
        const op = operands[0];
        const isWordReg = this.is16BitReg(op);
        if (isWordReg) {
          const regCode = this.getRegCode16(op);
          const base = mnemonic === 'INC' ? 0x40 : 0x48;
          bytes.push(base + regCode);
          cycles = 2;
        } else {
          const isByteReg = this.is8BitReg(op);
          if (isByteReg) {
            const regCode = this.getRegCode8(op);
            const subCode = mnemonic === 'INC' ? 0 : 1;
            bytes.push(0xFE, 0xC0 | (subCode << 3) | regCode);
            cycles = 3;
          } else {
            // Memory e.g. INC BYTE PTR [BX]
            const subCode = mnemonic === 'INC' ? 0 : 1;
            bytes.push(0xFE, 0x00 | (subCode << 3) | 0x07);
            cycles = 15;
          }
        }
        break;
      }

      case 'NEG':
      case 'NOT': {
        const op = operands[0];
        const subCode = mnemonic === 'NOT' ? 2 : 3;
        if (this.is16BitReg(op)) {
          bytes.push(0xF7, 0xC0 | (subCode << 3) | this.getRegCode16(op));
          cycles = 3;
        } else if (this.is8BitReg(op)) {
          bytes.push(0xF6, 0xC0 | (subCode << 3) | this.getRegCode8(op));
          cycles = 3;
        } else {
          bytes.push(0xF6, (subCode << 3) | 0x07);
          cycles = 16;
        }
        break;
      }

      case 'MUL':
      case 'IMUL':
      case 'DIV':
      case 'IDIV': {
        const op = operands[0];
        let subCode = 4; // MUL
        if (mnemonic === 'IMUL') subCode = 5;
        if (mnemonic === 'DIV') subCode = 6;
        if (mnemonic === 'IDIV') subCode = 7;

        if (this.is16BitReg(op)) {
          bytes.push(0xF7, 0xC0 | (subCode << 3) | this.getRegCode16(op));
          cycles = mnemonic.includes('MUL') ? 118 : 144;
        } else {
          bytes.push(0xF6, 0xC0 | (subCode << 3) | this.getRegCode8(op));
          cycles = mnemonic.includes('MUL') ? 70 : 80;
        }
        break;
      }

      case 'DAA':
        bytes.push(0x27);
        cycles = 4;
        break;
      case 'DAS':
        bytes.push(0x2F);
        cycles = 4;
        break;
      case 'AAA':
        bytes.push(0x37);
        cycles = 4;
        break;
      case 'AAS':
        bytes.push(0x3F);
        cycles = 4;
        break;

      case 'SHL':
      case 'SAL':
      case 'SHR':
      case 'SAR':
      case 'ROL':
      case 'ROR':
      case 'RCL':
      case 'RCR': {
        const dest = operands[0];
        const count = operands[1]?.toUpperCase() || '1';
        let subCode = 4; // SHL/SAL
        if (mnemonic === 'SHR') subCode = 5;
        if (mnemonic === 'SAR') subCode = 7;
        if (mnemonic === 'ROL') subCode = 0;
        if (mnemonic === 'ROR') subCode = 1;
        if (mnemonic === 'RCL') subCode = 2;
        if (mnemonic === 'RCR') subCode = 3;

        const isByCL = count === 'CL';
        const isWord = this.is16BitReg(dest);
        const opByte = isWord ? (isByCL ? 0xD3 : 0xD1) : (isByCL ? 0xD2 : 0xD0);
        const regCode = isWord ? this.getRegCode16(dest) : this.getRegCode8(dest);
        bytes.push(opByte, 0xC0 | (subCode << 3) | regCode);
        cycles = isByCL ? 8 : 2;
        break;
      }

      case 'PUSH': {
        const op = operands[0];
        if (this.is16BitReg(op)) {
          bytes.push(0x50 + this.getRegCode16(op));
          cycles = 10;
        } else if (this.isSegmentReg(op)) {
          const segCode = this.getSegCode(op);
          bytes.push(0x06 | (segCode << 3));
          cycles = 10;
        } else {
          bytes.push(0xFF, 0x30);
          cycles = 16;
        }
        break;
      }

      case 'POP': {
        const op = operands[0];
        if (this.is16BitReg(op)) {
          bytes.push(0x58 + this.getRegCode16(op));
          cycles = 8;
        } else if (this.isSegmentReg(op)) {
          const segCode = this.getSegCode(op);
          bytes.push(0x07 | (segCode << 3));
          cycles = 8;
        } else {
          bytes.push(0x8F, 0x00);
          cycles = 17;
        }
        break;
      }

      case 'LEA': {
        const dest = operands[0];
        const src = operands[1];
        const regCode = this.getRegCode16(dest);
        bytes.push(0x8D, 0x00 | (regCode << 3) | 0x06); // Generic direct/indirect displacement
        const val = this.resolveValue(src, symbols);
        bytes.push(val & 0xFF, (val >> 8) & 0xFF);
        cycles = 2;
        break;
      }

      case 'XCHG': {
        const op1 = operands[0];
        const op2 = operands[1];
        if (op1.toUpperCase() === 'AX' && this.is16BitReg(op2)) {
          bytes.push(0x90 + this.getRegCode16(op2));
          cycles = 3;
        } else if (op2.toUpperCase() === 'AX' && this.is16BitReg(op1)) {
          bytes.push(0x90 + this.getRegCode16(op1));
          cycles = 3;
        } else {
          const isWord = this.is16BitReg(op1);
          bytes.push(isWord ? 0x87 : 0x86, 0xC0 | (this.getRegCode16(op1) << 3) | this.getRegCode16(op2));
          cycles = 4;
        }
        break;
      }

      // Jumps and Branching
      case 'JMP':
      case 'JE':
      case 'JZ':
      case 'JNE':
      case 'JNZ':
      case 'JC':
      case 'JB':
      case 'JNAE':
      case 'JNC':
      case 'JAE':
      case 'JNB':
      case 'JA':
      case 'JNBE':
      case 'JBE':
      case 'JNA':
      case 'JG':
      case 'JNLE':
      case 'JGE':
      case 'JNL':
      case 'JL':
      case 'JNGE':
      case 'JLE':
      case 'JNG':
      case 'JO':
      case 'JNO':
      case 'JS':
      case 'JNS':
      case 'JP':
      case 'JPE':
      case 'JNP':
      case 'JPO':
      case 'JCXZ':
      case 'LOOP':
      case 'LOOPE':
      case 'LOOPZ':
      case 'LOOPNE':
      case 'LOOPNZ':
      case 'CALL': {
        const target = operands[0];
        const targetVal = this.resolveTargetOffset(target, symbols, offset + 2);
        const rel = targetVal - (offset + 2);
        const rel8 = rel & 0xFF;

        const jumpOpcodes: { [key: string]: number } = {
          'JO': 0x70, 'JNO': 0x71, 'JB': 0x72, 'JC': 0x72, 'JNAE': 0x72,
          'JNB': 0x73, 'JAE': 0x73, 'JNC': 0x73, 'JE': 0x74, 'JZ': 0x74,
          'JNE': 0x75, 'JNZ': 0x75, 'JBE': 0x76, 'JNA': 0x76,
          'JA': 0x77, 'JNBE': 0x77, 'JS': 0x78, 'JNS': 0x79,
          'JP': 0x7A, 'JPE': 0x7A, 'JNP': 0x7B, 'JPO': 0x7B,
          'JL': 0x7C, 'JNGE': 0x7C, 'JGE': 0x7D, 'JNL': 0x7D,
          'JLE': 0x7E, 'JNG': 0x7E, 'JG': 0x7F, 'JNLE': 0x7F,
          'JCXZ': 0xE3, 'LOOP': 0xE2, 'LOOPZ': 0xE1, 'LOOPE': 0xE1,
          'LOOPNZ': 0xE0, 'LOOPNE': 0xE0
        };

        if (mnemonic === 'JMP') {
          // Short jump 0xEB or Near jump 0xE9
          bytes.push(0xEB, rel8);
          cycles = 15;
        } else if (mnemonic === 'CALL') {
          // Direct near call 0xE8 rel16
          const rel16 = targetVal - (offset + 3);
          bytes.push(0xE8, rel16 & 0xFF, (rel16 >> 8) & 0xFF);
          cycles = 19;
        } else {
          const opc = jumpOpcodes[mnemonic] || 0x74;
          bytes.push(opc, rel8);
          cycles = 16;
        }
        break;
      }

      default:
        // Generic fallback instruction
        bytes.push(0x90);
        break;
    }

    return {
      address: (segment << 4) + offset,
      segment,
      offset,
      bytes,
      mnemonic,
      operands: operandsStr,
      sourceLine,
      sourceText,
      cycles,
    };
  }

  private static encodeMov(dest: string, src: string, symbols: Map<string, SymbolEntry>, currentOffset: number): { bytes: number[]; cycles: number } {
    const dUpper = dest.toUpperCase().trim();
    const sUpper = src.toUpperCase().trim();

    // 1. MOV reg16, imm16
    if (this.is16BitReg(dUpper) && this.isImmediate(src, symbols)) {
      const regCode = this.getRegCode16(dUpper);
      const imm = this.resolveValue(src, symbols);
      return {
        bytes: [0xB8 + regCode, imm & 0xFF, (imm >> 8) & 0xFF],
        cycles: 4,
      };
    }

    // 2. MOV reg8, imm8
    if (this.is8BitReg(dUpper) && this.isImmediate(src, symbols)) {
      const regCode = this.getRegCode8(dUpper);
      const imm = this.resolveValue(src, symbols);
      return {
        bytes: [0xB0 + regCode, imm & 0xFF],
        cycles: 4,
      };
    }

    // 3. MOV reg16, reg16
    if (this.is16BitReg(dUpper) && this.is16BitReg(sUpper)) {
      const dCode = this.getRegCode16(dUpper);
      const sCode = this.getRegCode16(sUpper);
      return {
        bytes: [0x89, 0xC0 | (sCode << 3) | dCode],
        cycles: 2,
      };
    }

    // 4. MOV reg8, reg8
    if (this.is8BitReg(dUpper) && this.is8BitReg(sUpper)) {
      const dCode = this.getRegCode8(dUpper);
      const sCode = this.getRegCode8(sUpper);
      return {
        bytes: [0x88, 0xC0 | (sCode << 3) | dCode],
        cycles: 2,
      };
    }

    // 5. MOV SegReg, reg16
    if (this.isSegmentReg(dUpper) && this.is16BitReg(sUpper)) {
      const segCode = this.getSegCode(dUpper);
      const sCode = this.getRegCode16(sUpper);
      return {
        bytes: [0x8E, 0xC0 | (segCode << 3) | sCode],
        cycles: 2,
      };
    }

    // 6. MOV reg16, SegReg
    if (this.is16BitReg(dUpper) && this.isSegmentReg(sUpper)) {
      const segCode = this.getSegCode(sUpper);
      const dCode = this.getRegCode16(dUpper);
      return {
        bytes: [0x8C, 0xC0 | (segCode << 3) | dCode],
        cycles: 2,
      };
    }

    // 7. Memory operations (e.g. MOV [BX], AL or MOV AX, [1000H] or MOV VAR, AX)
    if (dUpper.startsWith('[') || symbols.has(dUpper)) {
      // Store to memory
      const isWord = this.is16BitReg(sUpper) || dUpper.includes('WORD PTR');
      const opc = isWord ? 0x89 : 0x88;
      const regCode = isWord ? this.getRegCode16(sUpper) : this.getRegCode8(sUpper);
      const disp = this.resolveValue(dest.replace(/[\[\]]/g, ''), symbols);
      return {
        bytes: [opc, 0x06 | (regCode << 3), disp & 0xFF, (disp >> 8) & 0xFF],
        cycles: 9,
      };
    }

    if (sUpper.startsWith('[') || symbols.has(sUpper)) {
      // Load from memory
      const isWord = this.is16BitReg(dUpper) || sUpper.includes('WORD PTR');
      const opc = isWord ? 0x8B : 0x8A;
      const regCode = isWord ? this.getRegCode16(dUpper) : this.getRegCode8(dUpper);
      const disp = this.resolveValue(src.replace(/[\[\]]/g, ''), symbols);
      return {
        bytes: [opc, 0x06 | (regCode << 3), disp & 0xFF, (disp >> 8) & 0xFF],
        cycles: 8,
      };
    }

    // Default fallback
    return { bytes: [0x88, 0xC0], cycles: 2 };
  }

  private static encodeAlu(
    mnemonic: string,
    dest: string,
    src: string,
    symbols: Map<string, SymbolEntry>,
    currentOffset: number
  ): { bytes: number[]; cycles: number } {
    const dUpper = dest.toUpperCase().trim();
    const sUpper = src.toUpperCase().trim();

    const aluCodes: { [key: string]: number } = {
      'ADD': 0, 'OR': 1, 'ADC': 2, 'SBB': 3,
      'AND': 4, 'SUB': 5, 'XOR': 6, 'CMP': 7, 'TEST': 0
    };
    const aluSub = aluCodes[mnemonic] ?? 0;

    // Reg, Reg
    if (this.is16BitReg(dUpper) && this.is16BitReg(sUpper)) {
      const dCode = this.getRegCode16(dUpper);
      const sCode = this.getRegCode16(sUpper);
      return {
        bytes: [0x01 | (aluSub << 3), 0xC0 | (sCode << 3) | dCode],
        cycles: 3,
      };
    }

    if (this.is8BitReg(dUpper) && this.is8BitReg(sUpper)) {
      const dCode = this.getRegCode8(dUpper);
      const sCode = this.getRegCode8(sUpper);
      return {
        bytes: [0x00 | (aluSub << 3), 0xC0 | (sCode << 3) | dCode],
        cycles: 3,
      };
    }

    // Reg, Imm
    if (this.is16BitReg(dUpper) && this.isImmediate(src, symbols)) {
      const dCode = this.getRegCode16(dUpper);
      const imm = this.resolveValue(src, symbols);
      return {
        bytes: [0x81, 0xC0 | (aluSub << 3) | dCode, imm & 0xFF, (imm >> 8) & 0xFF],
        cycles: 4,
      };
    }

    if (this.is8BitReg(dUpper) && this.isImmediate(src, symbols)) {
      const dCode = this.getRegCode8(dUpper);
      const imm = this.resolveValue(src, symbols);
      return {
        bytes: [0x80, 0xC0 | (aluSub << 3) | dCode, imm & 0xFF],
        cycles: 4,
      };
    }

    // Memory, Imm / Memory, Reg
    return {
      bytes: [0x80, 0xC0 | (aluSub << 3), 0x00],
      cycles: 10,
    };
  }

  private static is16BitReg(name: string): boolean {
    return ['AX', 'BX', 'CX', 'DX', 'SP', 'BP', 'SI', 'DI', 'IP'].includes(name.toUpperCase());
  }

  private static is8BitReg(name: string): boolean {
    return ['AL', 'CL', 'DL', 'BL', 'AH', 'CH', 'DH', 'BH'].includes(name.toUpperCase());
  }

  private static isSegmentReg(name: string): boolean {
    return ['ES', 'CS', 'SS', 'DS'].includes(name.toUpperCase());
  }

  private static getRegCode16(name: string): number {
    const map: { [key: string]: number } = {
      'AX': 0, 'CX': 1, 'DX': 2, 'BX': 3,
      'SP': 4, 'BP': 5, 'SI': 6, 'DI': 7,
    };
    return map[name.toUpperCase()] ?? 0;
  }

  private static getRegCode8(name: string): number {
    const map: { [key: string]: number } = {
      'AL': 0, 'CL': 1, 'DL': 2, 'BL': 3,
      'AH': 4, 'CH': 5, 'DH': 6, 'BH': 7,
    };
    return map[name.toUpperCase()] ?? 0;
  }

  private static getSegCode(name: string): number {
    const map: { [key: string]: number } = {
      'ES': 0, 'CS': 1, 'SS': 2, 'DS': 3,
    };
    return map[name.toUpperCase()] ?? 0;
  }

  private static isImmediate(str: string, symbols: Map<string, SymbolEntry>): boolean {
    const s = str.trim().toUpperCase();
    if (s.startsWith('OFFSET ') || s.startsWith('@DATA')) return true;
    if (symbols.has(s) && symbols.get(s)?.type === 'CONSTANT') return true;
    if (/^[0-9]/.test(s) || s.startsWith("'") || s.startsWith('"') || s.startsWith('-')) return true;
    return false;
  }

  public static resolveValue(str: string, symbols: Map<string, SymbolEntry>): number {
    str = str.trim();
    if (!str) return 0;

    if (str.toUpperCase().startsWith('OFFSET ')) {
      const symName = str.substring(7).trim().toUpperCase();
      if (symbols.has(symName)) {
        return symbols.get(symName)!.offset;
      }
      return 0;
    }

    if (str.toUpperCase() === '@DATA') {
      return 0x0800; // Typical DS base
    }

    if (symbols.has(str.toUpperCase())) {
      const sym = symbols.get(str.toUpperCase())!;
      return sym.value;
    }

    // Check expression like `OFFSET ARR + 2`
    if (str.includes('+')) {
      const parts = str.split('+');
      return this.resolveValue(parts[0], symbols) + this.resolveValue(parts[1], symbols);
    }
    if (str.includes('-')) {
      const parts = str.split('-');
      return this.resolveValue(parts[0], symbols) - this.resolveValue(parts[1], symbols);
    }

    return this.parseNumber(str);
  }

  private static resolveTargetOffset(target: string, symbols: Map<string, SymbolEntry>, currentOffset: number): number {
    const clean = target.trim().toUpperCase();
    if (symbols.has(clean)) {
      return symbols.get(clean)!.offset;
    }
    return this.parseNumber(clean);
  }
}

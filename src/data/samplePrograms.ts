export interface SampleProgram {
  id: string;
  title: string;
  category: 'ARITHMETIC' | 'ARRAYS_SORTING' | 'STRINGS_DOS' | 'HARDWARE_LAB';
  description: string;
  code: string;
}

export const SAMPLE_PROGRAMS: SampleProgram[] = [
  {
    id: 'lab1-add-sub',
    title: 'Lab 1: 16-bit Addition & Subtraction',
    category: 'ARITHMETIC',
    description: 'Performs 16-bit addition and subtraction using AX and BX registers, storing result in memory.',
    code: `; ==========================================
; LAB 1: 16-Bit Addition & Subtraction
; ==========================================
.DATA
  NUM1 DW 4321H
  NUM2 DW 1234H
  SUM  DW ?
  DIFF DW ?

.CODE
  MOV AX, @DATA
  MOV DS, AX

  ; --- 16-Bit Addition ---
  MOV AX, NUM1       ; Load 4321H into AX
  MOV BX, NUM2       ; Load 1234H into BX
  ADD AX, BX         ; AX = AX + BX (5555H)
  MOV SUM, AX        ; Store sum in memory

  ; --- 16-Bit Subtraction ---
  MOV AX, NUM1       ; Reload NUM1 into AX
  SUB AX, BX         ; AX = AX - BX (30EDH)
  MOV DIFF, AX       ; Store difference in memory

  HLT                ; Halt CPU
`
  },
  {
    id: 'lab2-mul-div',
    title: 'Lab 2: 16-bit Multiplication & Division',
    category: 'ARITHMETIC',
    description: 'Demonstrates unsigned multiplication (MUL) and division (DIV) using AX and DX registers.',
    code: `; ==========================================
; LAB 2: Multiplication and Division
; ==========================================
.DATA
  A DW 0025H
  B DW 0005H
  PROD_L DW ?
  PROD_H DW ?
  QUOT   DW ?
  REM    DW ?

.CODE
  MOV AX, @DATA
  MOV DS, AX

  ; --- Multiplication (A * B) ---
  MOV AX, A          ; AX = 0025H (37 decimal)
  MOV BX, B          ; BX = 0005H (5 decimal)
  MUL BX             ; DX:AX = AX * BX
  MOV PROD_L, AX     ; Store low word
  MOV PROD_H, DX     ; Store high word

  ; --- Division (A / B) ---
  MOV AX, A          ; Dividend low word
  MOV DX, 0000H      ; Dividend high word
  MOV BX, B          ; Divisor
  DIV BX             ; AX = Quotient, DX = Remainder
  MOV QUOT, AX
  MOV REM, DX

  HLT
`
  },
  {
    id: 'lab3-largest-num',
    title: 'Lab 3: Find Largest Number in Array',
    category: 'ARRAYS_SORTING',
    description: 'Iterates through an array of 5 numbers and finds the maximum value using SI index register and CMP.',
    code: `; ==========================================
; LAB 3: Find Largest Number in Array
; ==========================================
.DATA
  ARRAY DB 25H, 89H, 12H, 9AH, 45H
  COUNT EQU 5
  MAX   DB ?

.CODE
  MOV AX, @DATA
  MOV DS, AX

  LEA SI, ARRAY      ; Point SI to start of array
  MOV CL, COUNT      ; Set loop counter CL = 5
  MOV AL, [SI]       ; Assume first element is MAX
  DEC CL             ; 4 comparisons remaining
  INC SI

FIND_MAX:
  CMP [SI], AL       ; Compare current element with AL
  JBE SKIP           ; If [SI] <= AL, skip
  MOV AL, [SI]       ; Otherwise, update AL with new MAX

SKIP:
  INC SI             ; Next element
  DEC CL             ; Decrement counter
  JNZ FIND_MAX       ; Repeat until CL == 0

  MOV MAX, AL        ; Store highest number (9AH) in MAX
  HLT
`
  },
  {
    id: 'lab4-bubble-sort',
    title: 'Lab 4: Array Bubble Sort (Ascending)',
    category: 'ARRAYS_SORTING',
    description: 'Sorts a 5-byte array into ascending order using nested loops and comparison swaps.',
    code: `; ==========================================
; LAB 4: Bubble Sort (Ascending Order)
; ==========================================
.DATA
  ARR DB 54H, 12H, 89H, 33H, 02H
  LEN EQU 5

.CODE
  MOV AX, @DATA
  MOV DS, AX

  MOV CH, LEN - 1    ; Outer loop counter (N-1 passes)

OUTER_LOOP:
  MOV CL, LEN - 1    ; Inner loop counter
  LEA SI, ARR        ; SI points to array start

INNER_LOOP:
  MOV AL, [SI]       ; Current element
  MOV BL, [SI+1]     ; Next element
  CMP AL, BL         ; Compare AL with BL
  JBE NO_SWAP        ; If AL <= BL, already sorted

  ; Swap elements
  MOV [SI], BL
  MOV [SI+1], AL

NO_SWAP:
  INC SI             ; Move to next element
  DEC CL
  JNZ INNER_LOOP     ; Continue inner loop

  DEC CH
  JNZ OUTER_LOOP     ; Continue outer loop

  HLT                ; Array is now sorted: 02H, 12H, 33H, 54H, 89H
`
  },
  {
    id: 'lab5-hello-dos',
    title: 'Lab 5: Display String using INT 21H',
    category: 'STRINGS_DOS',
    description: 'Uses DOS Function 09H (Display String) to print a message on the system output console.',
    code: `; ==========================================
; LAB 5: Display String (INT 21H / AH=09H)
; ==========================================
.DATA
  MSG DB 'WELCOME TO MICROPROCESSOR LAB!$'

.CODE
  MOV AX, @DATA
  MOV DS, AX

  ; Function 09H: Display $-terminated string
  LEA DX, MSG        ; Load effective address of MSG into DX
  MOV AH, 09H        ; DOS print string function
  INT 21H            ; Call DOS interrupt

  ; Terminate program
  MOV AH, 4CH        ; DOS exit function
  INT 21H
`
  },
  {
    id: 'lab6-8255-led-counter',
    title: 'Lab 6: 8255 PPI - 8-Bit Binary LED Up-Counter',
    category: 'HARDWARE_LAB',
    description: 'Initializes 8255 PPI Mode 0 and continuously outputs an incrementing binary count to Port A (0x80) connected to LEDs.',
    code: `; ==========================================
; LAB 6: 8255 PPI - Binary LED Up-Counter
; ==========================================
; Control Word: Port 86H = 82H (Mode 0: Port A=Out, Port B=In)
; Port A Address = 80H (Data LEDs)

.CODE
  ; 1. Initialize 8255 Control Register
  MOV AL, 82H        ; Mode 0: Port A Output
  OUT 86H, AL        ; Write to Control Register

  MOV BL, 00H        ; Start counter at 0

COUNT_LOOP:
  MOV AL, BL
  OUT 80H, AL        ; Send binary count to Port A LEDs

  ; Small delay loop
  MOV CX, 05H
DELAY:
  NOP
  DEC CX
  JNZ DELAY

  INC BL             ; Increment count
  CMP BL, 20H        ; Count up to 32
  JNE COUNT_LOOP

  HLT
`
  },
  {
    id: 'lab7-8255-switch-to-led',
    title: 'Lab 7: 8255 PPI - Read Switches & Display on LEDs',
    category: 'HARDWARE_LAB',
    description: 'Reads 8-bit switch states from Port B (0x82) and mirrors the binary value directly to Port A LEDs (0x80).',
    code: `; ==========================================
; LAB 7: 8255 PPI - Switch to LED Interface
; ==========================================
; Port A = Output (LEDs) at 80H
; Port B = Input (DIP Switches) at 82H

.CODE
  ; 1. Initialize 8255 (CW = 82H)
  MOV AL, 82H
  OUT 86H, AL

READ_LOOP:
  IN AL, 82H         ; Read switch inputs from Port B
  OUT 80H, AL        ; Output directly to Port A LEDs

  ; Repeat loop
  MOV CX, 03H
DELAY:
  NOP
  DEC CX
  JNZ DELAY

  ; Toggle switches in hardware panel to see LEDs change!
  JMP READ_LOOP
`
  },
];

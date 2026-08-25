import React, { useState } from 'react';
import { CPU8086 } from '../engine/cpu8086';
import { Info, Zap, Cpu, Sparkles, Layers, Sliders, CheckCircle2, Shield, Eye } from 'lucide-react';

interface ChipPinoutViewProps {
  cpu: CPU8086;
  isDark?: boolean;
}

type SupportedChip = '8086' | '8051' | '8255' | 'HARDWARE_KIT';
type PackageStyle = 'CERAMIC' | 'PLASTIC';

export const ChipPinoutView: React.FC<ChipPinoutViewProps> = ({ cpu, isDark = false }) => {
  const [activeChip, setActiveChip] = useState<SupportedChip>('8086');
  const [packageStyle, setPackageStyle] = useState<PackageStyle>('CERAMIC');
  const [selectedPin, setSelectedPin] = useState<{
    num: number;
    name: string;
    type: string;
    desc: string;
    level: 'HIGH' | 'LOW';
    voltage: string;
    category?: string;
  } | null>(null);

  // 8086 CPU Pins
  const cpu8086Pins = cpu.pins;
  const left8086 = cpu8086Pins.slice(0, 20); // 1-20
  const right8086 = cpu8086Pins.slice(20, 40).reverse(); // 40-21

  // 8051 Microcontroller Pins (40-Pin DIP)
  const left8051 = [
    { num: 1, name: 'P1.0', type: 'I/O Bidirectional', desc: 'Port 1 Bit 0 (General Purpose I/O with internal pull-up)', level: 'HIGH' as const, voltage: '+5.0V', category: 'I/O Port 1' },
    { num: 2, name: 'P1.1', type: 'I/O Bidirectional', desc: 'Port 1 Bit 1 (T2: Timer 2 External Count Input on 8052)', level: 'HIGH' as const, voltage: '+5.0V', category: 'I/O Port 1' },
    { num: 3, name: 'P1.2', type: 'I/O Bidirectional', desc: 'Port 1 Bit 2 (T2EX: Timer 2 Reload Trigger)', level: 'HIGH' as const, voltage: '+5.0V', category: 'I/O Port 1' },
    { num: 4, name: 'P1.3', type: 'I/O Bidirectional', desc: 'Port 1 Bit 3', level: 'HIGH' as const, voltage: '+5.0V', category: 'I/O Port 1' },
    { num: 5, name: 'P1.4', type: 'I/O Bidirectional', desc: 'Port 1 Bit 4', level: 'HIGH' as const, voltage: '+5.0V', category: 'I/O Port 1' },
    { num: 6, name: 'P1.5', type: 'I/O Bidirectional', desc: 'Port 1 Bit 5', level: 'HIGH' as const, voltage: '+5.0V', category: 'I/O Port 1' },
    { num: 7, name: 'P1.6', type: 'I/O Bidirectional', desc: 'Port 1 Bit 6', level: 'HIGH' as const, voltage: '+5.0V', category: 'I/O Port 1' },
    { num: 8, name: 'P1.7', type: 'I/O Bidirectional', desc: 'Port 1 Bit 7', level: 'HIGH' as const, voltage: '+5.0V', category: 'I/O Port 1' },
    { num: 9, name: 'RST', type: 'Input', desc: 'Reset Input (Active HIGH for 2 machine cycles to reset 8051 MCU)', level: 'LOW' as const, voltage: '0.0V', category: 'Control' },
    { num: 10, name: 'P3.0 / RXD', type: 'I/O Bidirectional', desc: 'Port 3 Bit 0 or Serial UART Data Receive', level: 'HIGH' as const, voltage: '+5.0V', category: 'I/O Port 3 / Serial' },
    { num: 11, name: 'P3.1 / TXD', type: 'I/O Bidirectional', desc: 'Port 3 Bit 1 or Serial UART Data Transmit', level: 'HIGH' as const, voltage: '+5.0V', category: 'I/O Port 3 / Serial' },
    { num: 12, name: 'P3.2 / /INT0', type: 'I/O Bidirectional', desc: 'Port 3 Bit 2 or External Interrupt 0 (Active Low)', level: 'HIGH' as const, voltage: '+5.0V', category: 'I/O Port 3 / Interrupt' },
    { num: 13, name: 'P3.3 / /INT1', type: 'I/O Bidirectional', desc: 'Port 3 Bit 3 or External Interrupt 1 (Active Low)', level: 'HIGH' as const, voltage: '+5.0V', category: 'I/O Port 3 / Interrupt' },
    { num: 14, name: 'P3.4 / T0', type: 'I/O Bidirectional', desc: 'Port 3 Bit 4 or Timer 0 External Clock Input', level: 'HIGH' as const, voltage: '+5.0V', category: 'I/O Port 3 / Timer' },
    { num: 15, name: 'P3.5 / T1', type: 'I/O Bidirectional', desc: 'Port 3 Bit 5 or Timer 1 External Clock Input', level: 'HIGH' as const, voltage: '+5.0V', category: 'I/O Port 3 / Timer' },
    { num: 16, name: 'P3.6 / /WR', type: 'I/O Bidirectional', desc: 'Port 3 Bit 6 or External RAM Write Strobe', level: cpu.biu.wr ? 'HIGH' as const : 'LOW' as const, voltage: cpu.biu.wr ? '+5.0V' : '0.0V', category: 'Bus Control' },
    { num: 17, name: 'P3.7 / /RD', type: 'I/O Bidirectional', desc: 'Port 3 Bit 7 or External RAM Read Strobe', level: cpu.biu.rd ? 'HIGH' as const : 'LOW' as const, voltage: cpu.biu.rd ? '+5.0V' : '0.0V', category: 'Bus Control' },
    { num: 18, name: 'XTAL2', type: 'Input/Oscillator', desc: 'Crystal Oscillator Output (12 MHz typical internal inverter feedback)', level: 'HIGH' as const, voltage: '+3.2V', category: 'Clock' },
    { num: 19, name: 'XTAL1', type: 'Input/Oscillator', desc: 'Crystal Oscillator Input to internal clock generator', level: 'LOW' as const, voltage: '+1.8V', category: 'Clock' },
    { num: 20, name: 'GND (VSS)', type: 'Power Ground', desc: 'Ground Reference (0V DC System Ground)', level: 'LOW' as const, voltage: '0.0V', category: 'Power' },
  ];

  const right8051 = [
    { num: 40, name: 'VCC', type: 'Power Supply', desc: 'Main Power Supply (+5V DC ±10%)', level: 'HIGH' as const, voltage: '+5.0V', category: 'Power' },
    { num: 39, name: 'P0.0 / AD0', type: 'I/O Multiplexed', desc: 'Port 0 Bit 0 or Multiplexed Low Address/Data Line AD0', level: (cpu.biu.lastData & 0x01) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x01) ? '+5.0V' : '0.0V', category: 'Address/Data Bus' },
    { num: 38, name: 'P0.1 / AD1', type: 'I/O Multiplexed', desc: 'Port 0 Bit 1 or Multiplexed Low Address/Data Line AD1', level: (cpu.biu.lastData & 0x02) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x02) ? '+5.0V' : '0.0V', category: 'Address/Data Bus' },
    { num: 37, name: 'P0.2 / AD2', type: 'I/O Multiplexed', desc: 'Port 0 Bit 2 or Multiplexed Low Address/Data Line AD2', level: (cpu.biu.lastData & 0x04) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x04) ? '+5.0V' : '0.0V', category: 'Address/Data Bus' },
    { num: 36, name: 'P0.3 / AD3', type: 'I/O Multiplexed', desc: 'Port 0 Bit 3 or Multiplexed Low Address/Data Line AD3', level: (cpu.biu.lastData & 0x08) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x08) ? '+5.0V' : '0.0V', category: 'Address/Data Bus' },
    { num: 35, name: 'P0.4 / AD4', type: 'I/O Multiplexed', desc: 'Port 0 Bit 4 or Multiplexed Low Address/Data Line AD4', level: (cpu.biu.lastData & 0x10) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x10) ? '+5.0V' : '0.0V', category: 'Address/Data Bus' },
    { num: 34, name: 'P0.5 / AD5', type: 'I/O Multiplexed', desc: 'Port 0 Bit 5 or Multiplexed Low Address/Data Line AD5', level: (cpu.biu.lastData & 0x20) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x20) ? '+5.0V' : '0.0V', category: 'Address/Data Bus' },
    { num: 33, name: 'P0.6 / AD6', type: 'I/O Multiplexed', desc: 'Port 0 Bit 6 or Multiplexed Low Address/Data Line AD6', level: (cpu.biu.lastData & 0x40) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x40) ? '+5.0V' : '0.0V', category: 'Address/Data Bus' },
    { num: 32, name: 'P0.7 / AD7', type: 'I/O Multiplexed', desc: 'Port 0 Bit 7 or Multiplexed Low Address/Data Line AD7', level: (cpu.biu.lastData & 0x80) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x80) ? '+5.0V' : '0.0V', category: 'Address/Data Bus' },
    { num: 31, name: '/EA / VPP', type: 'Input', desc: 'External Access Enable (GND = fetch instructions from external ROM, +5V = execute internal 4KB ROM)', level: 'HIGH' as const, voltage: '+5.0V', category: 'Control' },
    { num: 30, name: 'ALE / /PROG', type: 'Output', desc: 'Address Latch Enable (Latches low-order address A0-A7 into external 74LS373 latch at 1/6 oscillator frequency)', level: cpu.biu.ale ? 'HIGH' as const : 'LOW' as const, voltage: cpu.biu.ale ? '+5.0V' : '0.0V', category: 'Bus Timing' },
    { num: 29, name: '/PSEN', type: 'Output', desc: 'Program Store Enable (Read strobe active LOW for fetching instructions from external ROM)', level: 'HIGH' as const, voltage: '+5.0V', category: 'Bus Timing' },
    { num: 28, name: 'P2.7 / A15', type: 'I/O Multiplexed', desc: 'Port 2 Bit 7 or High Address Bus Line A15', level: (cpu.biu.lastAddress & 0x8000) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastAddress & 0x8000) ? '+5.0V' : '0.0V', category: 'Address Bus' },
    { num: 27, name: 'P2.6 / A14', type: 'I/O Multiplexed', desc: 'Port 2 Bit 6 or High Address Bus Line A14', level: (cpu.biu.lastAddress & 0x4000) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastAddress & 0x4000) ? '+5.0V' : '0.0V', category: 'Address Bus' },
    { num: 26, name: 'P2.5 / A13', type: 'I/O Multiplexed', desc: 'Port 2 Bit 5 or High Address Bus Line A13', level: (cpu.biu.lastAddress & 0x2000) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastAddress & 0x2000) ? '+5.0V' : '0.0V', category: 'Address Bus' },
    { num: 25, name: 'P2.4 / A12', type: 'I/O Multiplexed', desc: 'Port 2 Bit 4 or High Address Bus Line A12', level: (cpu.biu.lastAddress & 0x1000) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastAddress & 0x1000) ? '+5.0V' : '0.0V', category: 'Address Bus' },
    { num: 24, name: 'P2.3 / A11', type: 'I/O Multiplexed', desc: 'Port 2 Bit 3 or High Address Bus Line A11', level: (cpu.biu.lastAddress & 0x0800) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastAddress & 0x0800) ? '+5.0V' : '0.0V', category: 'Address Bus' },
    { num: 23, name: 'P2.2 / A10', type: 'I/O Multiplexed', desc: 'Port 2 Bit 2 or High Address Bus Line A10', level: (cpu.biu.lastAddress & 0x0400) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastAddress & 0x0400) ? '+5.0V' : '0.0V', category: 'Address Bus' },
    { num: 22, name: 'P2.1 / A9', type: 'I/O Multiplexed', desc: 'Port 2 Bit 1 or High Address Bus Line A9', level: (cpu.biu.lastAddress & 0x0200) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastAddress & 0x0200) ? '+5.0V' : '0.0V', category: 'Address Bus' },
    { num: 21, name: 'P2.0 / A8', type: 'I/O Multiplexed', desc: 'Port 2 Bit 0 or High Address Bus Line A8', level: (cpu.biu.lastAddress & 0x0100) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastAddress & 0x0100) ? '+5.0V' : '0.0V', category: 'Address Bus' },
  ];

  // 8255 PPI Pins
  const left8255 = [
    { num: 1, name: 'PA3', type: 'I/O Port A', desc: 'Port A Bit 3 (Configurable Input / Output / Bi-dir)', level: (cpu.ppi8255.portA & 0x08) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portA & 0x08) ? '+5.0V' : '0.0V', category: 'Port A' },
    { num: 2, name: 'PA2', type: 'I/O Port A', desc: 'Port A Bit 2', level: (cpu.ppi8255.portA & 0x04) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portA & 0x04) ? '+5.0V' : '0.0V', category: 'Port A' },
    { num: 3, name: 'PA1', type: 'I/O Port A', desc: 'Port A Bit 1', level: (cpu.ppi8255.portA & 0x02) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portA & 0x02) ? '+5.0V' : '0.0V', category: 'Port A' },
    { num: 4, name: 'PA0', type: 'I/O Port A', desc: 'Port A Bit 0 (LED Output in typical college lab kit)', level: (cpu.ppi8255.portA & 0x01) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portA & 0x01) ? '+5.0V' : '0.0V', category: 'Port A' },
    { num: 5, name: '/RD', type: 'Input Control', desc: 'Read Strobe (Active LOW enables 8255 to put data on CPU data bus)', level: cpu.biu.rd ? 'HIGH' as const : 'LOW' as const, voltage: cpu.biu.rd ? '+5.0V' : '0.0V', category: 'Bus Interface' },
    { num: 6, name: '/CS', type: 'Input Control', desc: 'Chip Select (Active LOW from 74LS138 decoder for Port addresses 80H-86H)', level: (cpu.biu.lastAddress >= 0x80 && cpu.biu.lastAddress <= 0x87) ? 'LOW' as const : 'HIGH' as const, voltage: (cpu.biu.lastAddress >= 0x80 && cpu.biu.lastAddress <= 0x87) ? '0.0V' : '+5.0V', category: 'Bus Interface' },
    { num: 7, name: 'GND', type: 'Power Ground', desc: 'Ground Reference (0V DC)', level: 'LOW' as const, voltage: '0.0V', category: 'Power' },
    { num: 8, name: 'A1', type: 'Input Address', desc: 'Port Select Address Line A1 (00=A, 01=B, 10=C, 11=Control Register)', level: (cpu.biu.lastAddress & 0x02) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastAddress & 0x02) ? '+5.0V' : '0.0V', category: 'Address Bus' },
    { num: 9, name: 'A0', type: 'Input Address', desc: 'Port Select Address Line A0', level: (cpu.biu.lastAddress & 0x01) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastAddress & 0x01) ? '+5.0V' : '0.0V', category: 'Address Bus' },
    { num: 10, name: 'PC7', type: 'I/O Port C', desc: 'Port C Upper Bit 7 (Handshake strobe / BSR mode)', level: (cpu.ppi8255.portC & 0x80) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portC & 0x80) ? '+5.0V' : '0.0V', category: 'Port C' },
    { num: 11, name: 'PC6', type: 'I/O Port C', desc: 'Port C Upper Bit 6', level: (cpu.ppi8255.portC & 0x40) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portC & 0x40) ? '+5.0V' : '0.0V', category: 'Port C' },
    { num: 12, name: 'PC5', type: 'I/O Port C', desc: 'Port C Upper Bit 5', level: (cpu.ppi8255.portC & 0x20) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portC & 0x20) ? '+5.0V' : '0.0V', category: 'Port C' },
    { num: 13, name: 'PC4', type: 'I/O Port C', desc: 'Port C Upper Bit 4', level: (cpu.ppi8255.portC & 0x10) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portC & 0x10) ? '+5.0V' : '0.0V', category: 'Port C' },
    { num: 14, name: 'PC0', type: 'I/O Port C', desc: 'Port C Lower Bit 0', level: (cpu.ppi8255.portC & 0x01) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portC & 0x01) ? '+5.0V' : '0.0V', category: 'Port C' },
    { num: 15, name: 'PC1', type: 'I/O Port C', desc: 'Port C Lower Bit 1', level: (cpu.ppi8255.portC & 0x02) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portC & 0x02) ? '+5.0V' : '0.0V', category: 'Port C' },
    { num: 16, name: 'PC2', type: 'I/O Port C', desc: 'Port C Lower Bit 2', level: (cpu.ppi8255.portC & 0x04) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portC & 0x04) ? '+5.0V' : '0.0V', category: 'Port C' },
    { num: 17, name: 'PC3', type: 'I/O Port C', desc: 'Port C Lower Bit 3', level: (cpu.ppi8255.portC & 0x08) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portC & 0x08) ? '+5.0V' : '0.0V', category: 'Port C' },
    { num: 18, name: 'PB0', type: 'I/O Port B', desc: 'Port B Bit 0 (Connected to DIP Switch 0 in lab)', level: (cpu.ppi8255.portB & 0x01) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portB & 0x01) ? '+5.0V' : '0.0V', category: 'Port B' },
    { num: 19, name: 'PB1', type: 'I/O Port B', desc: 'Port B Bit 1 (DIP Switch 1)', level: (cpu.ppi8255.portB & 0x02) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portB & 0x02) ? '+5.0V' : '0.0V', category: 'Port B' },
    { num: 20, name: 'PB2', type: 'I/O Port B', desc: 'Port B Bit 2 (DIP Switch 2)', level: (cpu.ppi8255.portB & 0x04) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portB & 0x04) ? '+5.0V' : '0.0V', category: 'Port B' },
  ];

  const right8255 = [
    { num: 40, name: 'PA4', type: 'I/O Port A', desc: 'Port A Bit 4', level: (cpu.ppi8255.portA & 0x10) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portA & 0x10) ? '+5.0V' : '0.0V', category: 'Port A' },
    { num: 39, name: 'PA5', type: 'I/O Port A', desc: 'Port A Bit 5', level: (cpu.ppi8255.portA & 0x20) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portA & 0x20) ? '+5.0V' : '0.0V', category: 'Port A' },
    { num: 38, name: 'PA6', type: 'I/O Port A', desc: 'Port A Bit 6', level: (cpu.ppi8255.portA & 0x40) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portA & 0x40) ? '+5.0V' : '0.0V', category: 'Port A' },
    { num: 37, name: 'PA7', type: 'I/O Port A', desc: 'Port A Bit 7', level: (cpu.ppi8255.portA & 0x80) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portA & 0x80) ? '+5.0V' : '0.0V', category: 'Port A' },
    { num: 36, name: '/WR', type: 'Input Control', desc: 'Write Strobe (Active LOW enables CPU to write data into 8255 ports or control word)', level: cpu.biu.wr ? 'HIGH' as const : 'LOW' as const, voltage: cpu.biu.wr ? '+5.0V' : '0.0V', category: 'Bus Interface' },
    { num: 35, name: 'RESET', type: 'Input Control', desc: 'Reset Input (Active HIGH clears internal registers and sets all Ports A, B, C into Mode 0 input mode)', level: 'LOW' as const, voltage: '0.0V', category: 'Control' },
    { num: 34, name: 'D0', type: 'I/O Data Bus', desc: 'Bi-directional Data Bus Bit 0', level: (cpu.biu.lastData & 0x01) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x01) ? '+5.0V' : '0.0V', category: 'Data Bus' },
    { num: 33, name: 'D1', type: 'I/O Data Bus', desc: 'Bi-directional Data Bus Bit 1', level: (cpu.biu.lastData & 0x02) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x02) ? '+5.0V' : '0.0V', category: 'Data Bus' },
    { num: 32, name: 'D2', type: 'I/O Data Bus', desc: 'Bi-directional Data Bus Bit 2', level: (cpu.biu.lastData & 0x04) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x04) ? '+5.0V' : '0.0V', category: 'Data Bus' },
    { num: 31, name: 'D3', type: 'I/O Data Bus', desc: 'Bi-directional Data Bus Bit 3', level: (cpu.biu.lastData & 0x08) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x08) ? '+5.0V' : '0.0V', category: 'Data Bus' },
    { num: 30, name: 'D4', type: 'I/O Data Bus', desc: 'Bi-directional Data Bus Bit 4', level: (cpu.biu.lastData & 0x10) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x10) ? '+5.0V' : '0.0V', category: 'Data Bus' },
    { num: 29, name: 'D5', type: 'I/O Data Bus', desc: 'Bi-directional Data Bus Bit 5', level: (cpu.biu.lastData & 0x20) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x20) ? '+5.0V' : '0.0V', category: 'Data Bus' },
    { num: 28, name: 'D6', type: 'I/O Data Bus', desc: 'Bi-directional Data Bus Bit 6', level: (cpu.biu.lastData & 0x40) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x40) ? '+5.0V' : '0.0V', category: 'Data Bus' },
    { num: 27, name: 'D7', type: 'I/O Data Bus', desc: 'Bi-directional Data Bus Bit 7', level: (cpu.biu.lastData & 0x80) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.biu.lastData & 0x80) ? '+5.0V' : '0.0V', category: 'Data Bus' },
    { num: 26, name: 'VCC', type: 'Power Supply', desc: 'Main Power Supply (+5V DC)', level: 'HIGH' as const, voltage: '+5.0V', category: 'Power' },
    { num: 25, name: 'PB7', type: 'I/O Port B', desc: 'Port B Bit 7 (DIP Switch 7)', level: (cpu.ppi8255.portB & 0x80) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portB & 0x80) ? '+5.0V' : '0.0V', category: 'Port B' },
    { num: 24, name: 'PB6', type: 'I/O Port B', desc: 'Port B Bit 6 (DIP Switch 6)', level: (cpu.ppi8255.portB & 0x40) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portB & 0x40) ? '+5.0V' : '0.0V', category: 'Port B' },
    { num: 23, name: 'PB5', type: 'I/O Port B', desc: 'Port B Bit 5 (DIP Switch 5)', level: (cpu.ppi8255.portB & 0x20) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portB & 0x20) ? '+5.0V' : '0.0V', category: 'Port B' },
    { num: 22, name: 'PB4', type: 'I/O Port B', desc: 'Port B Bit 4 (DIP Switch 4)', level: (cpu.ppi8255.portB & 0x10) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portB & 0x10) ? '+5.0V' : '0.0V', category: 'Port B' },
    { num: 21, name: 'PB3', type: 'I/O Port B', desc: 'Port B Bit 3 (DIP Switch 3)', level: (cpu.ppi8255.portB & 0x08) ? 'HIGH' as const : 'LOW' as const, voltage: (cpu.ppi8255.portB & 0x08) ? '+5.0V' : '0.0V', category: 'Port B' },
  ];

  // Helper to toggle 8255 Switch inputs
  const handleToggleSwitch = (bitIndex: number) => {
    const mask = 1 << bitIndex;
    cpu.ppi8255.portB ^= mask;
  };

  const getPinList = () => {
    if (activeChip === '8051') {
      return {
        left: left8051,
        right: right8051,
        partNumber: packageStyle === 'CERAMIC' ? 'D8051AH' : 'P8051AH',
        title: 'Intel 8051 Microcontroller',
        desc: '8-Bit Microcontroller (MCS-51 Architecture, 40-Pin DIP)',
        lotCode: 'F3480012',
        copyright: '© INTEL 1980',
        country: 'MALAYSIA',
      };
    }
    if (activeChip === '8255') {
      return {
        left: left8255,
        right: right8255,
        partNumber: packageStyle === 'CERAMIC' ? 'D8255A-5' : 'P8255A',
        title: 'Intel 8255A PPI',
        desc: 'Programmable Peripheral Interface (24 I/O Lines, 40-Pin DIP)',
        lotCode: 'L2410981',
        copyright: '© INTEL \'76',
        country: 'PHILIPPINES',
      };
    }
    return {
      left: left8086,
      right: right8086,
      partNumber: packageStyle === 'CERAMIC' ? 'D8086-2' : 'P8086-2',
      title: 'Intel 8086 Microprocessor',
      desc: '16-Bit HMOS Microprocessor (1MB Addressing, 40-Pin DIP)',
      lotCode: 'L3242045',
      copyright: '© INTEL \'78 \'82',
      country: 'MALAYSIA',
    };
  };

  const currentChipData = getPinList();

  return (
    <div
      id="chip-pinout-view"
      className={`flex flex-col h-full p-3.5 gap-3 font-mono text-xs overflow-y-auto transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'
      }`}
    >
      {/* 1. TOP CHIP SELECTOR BAR */}
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        {/* Chip Type selection */}
        <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
          <button
            onClick={() => setActiveChip('8086')}
            className={`px-3 py-1 rounded-md font-semibold text-xs transition cursor-pointer ${
              activeChip === '8086'
                ? isDark ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-700 shadow-xs'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Intel 8086 CPU
          </button>
          <button
            onClick={() => setActiveChip('8051')}
            className={`px-3 py-1 rounded-md font-semibold text-xs transition cursor-pointer ${
              activeChip === '8051'
                ? isDark ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-700 shadow-xs'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Intel 8051 MCU
          </button>
          <button
            onClick={() => setActiveChip('8255')}
            className={`px-3 py-1 rounded-md font-semibold text-xs transition cursor-pointer ${
              activeChip === '8255'
                ? isDark ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-700 shadow-xs'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Intel 8255 PPI
          </button>
          <button
            onClick={() => setActiveChip('HARDWARE_KIT')}
            className={`px-3 py-1 rounded-md font-semibold text-xs transition cursor-pointer ${
              activeChip === 'HARDWARE_KIT'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            8255 LED & Switch Trainer
          </button>
        </div>

        {/* Package Material Styling Toggle & Live State Legend */}
        <div className="flex items-center gap-3">
          {activeChip !== 'HARDWARE_KIT' && (
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[11px] font-sans ${isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
              <span className="text-[10px] text-slate-400 font-medium">Package:</span>
              <button
                onClick={() => setPackageStyle('CERAMIC')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${packageStyle === 'CERAMIC' ? (isDark ? 'bg-purple-900/80 text-purple-200 border border-purple-700' : 'bg-purple-100 text-purple-800 border border-purple-200') : 'text-slate-400 hover:text-slate-200'}`}
              >
                Purple Ceramic (C8086)
              </button>
              <button
                onClick={() => setPackageStyle('PLASTIC')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${packageStyle === 'PLASTIC' ? (isDark ? 'bg-slate-700 text-white border border-slate-600' : 'bg-slate-200 text-slate-800 border border-slate-300') : 'text-slate-400 hover:text-slate-200'}`}
              >
                Black Epoxy (P8086)
              </button>
            </div>
          )}

          {/* Logic State Legend */}
          <div className="flex items-center gap-2 text-[11px] font-sans text-slate-500">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>HIGH (+5V)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-slate-700 border border-slate-600' : 'bg-slate-300 border border-slate-400'}`}></span>
              <span className="text-slate-400">LOW (0V)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CHIP OR HARDWARE LAB CONTENT */}
      {activeChip === 'HARDWARE_KIT' ? (
        /* HARDWARE INTERFACING LAB BOARD (8255 LEDS & SWITCHES) */
        <div className={`flex flex-col gap-4 rounded-xl p-4 border transition-colors ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={`flex items-center justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div>
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                8255 PPI Hardware Interfacing Trainer
              </h3>
              <p className={`text-[11px] font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Port A (0x80) Output LEDs & Port B (0x82) Input DIP Switches. Run Lab 6 or Lab 7 to test live I/O.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-sans block">Control Word (Port 86H):</span>
              <span className="font-bold text-blue-500 text-xs">0x{cpu.ppi8255.controlWord.toString(16).toUpperCase().padStart(2, '0')}</span>
            </div>
          </div>

          {/* 8-Bit LED Output Bar (Port A - Address 0x80) */}
          <div className={`border rounded-xl p-3.5 shadow-2xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Port A Output LEDs (Port 0x80):
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Hex: <strong className="text-emerald-500">0x{cpu.ppi8255.portA.toString(16).toUpperCase().padStart(2, '0')}</strong> | Dec: {cpu.ppi8255.portA}
                </span>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded font-sans font-semibold">
                OUTPUT PORT (OUT 80H, AL)
              </span>
            </div>

            <div className="grid grid-cols-8 gap-2">
              {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => {
                const isOn = (cpu.ppi8255.portA & (1 << bit)) !== 0;
                return (
                  <div
                    key={bit}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition ${
                      isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 font-bold">PA{bit}</span>
                    {/* Realistic 5mm Round LED Bead */}
                    <div className="relative flex items-center justify-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                          isOn
                            ? 'bg-gradient-to-tr from-emerald-600 via-emerald-400 to-emerald-200 text-slate-950 shadow-lg shadow-emerald-500/60 ring-2 ring-emerald-300 scale-105'
                            : isDark
                            ? 'bg-slate-800 text-slate-500 border border-slate-700'
                            : 'bg-slate-200 text-slate-400 border border-slate-300'
                        }`}
                      >
                        <span className="text-[10px] font-bold">{isOn ? '1' : '0'}</span>
                      </div>
                      {isOn && (
                        <div className="absolute inset-0 rounded-full bg-emerald-400/30 blur-xs animate-pulse" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 8-Bit DIP Switch Input Bar (Port B - Address 0x82) */}
          <div className={`border rounded-xl p-3.5 shadow-2xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Port B DIP Switches (Port 0x82):
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Hex: <strong className="text-blue-500">0x{cpu.ppi8255.portB.toString(16).toUpperCase().padStart(2, '0')}</strong> | Dec: {cpu.ppi8255.portB}
                </span>
              </div>
              <span className="text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/30 px-2 py-0.5 rounded font-sans font-semibold">
                INPUT PORT (IN AL, 82H) - CLICK TO TOGGLE
              </span>
            </div>

            <div className="grid grid-cols-8 gap-2">
              {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => {
                const isOn = (cpu.ppi8255.portB & (1 << bit)) !== 0;
                return (
                  <button
                    key={bit}
                    onClick={() => handleToggleSwitch(bit)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition cursor-pointer ${
                      isOn
                        ? isDark ? 'bg-blue-950/40 border-blue-500/50' : 'bg-blue-50 border-blue-300'
                        : isDark ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 font-bold">PB{bit}</span>
                    {/* Realistic Blue Rocker/Slide Switch Box */}
                    <div
                      className={`w-7 h-11 rounded border flex flex-col justify-between p-0.5 transition shadow-inner ${
                        isOn
                          ? 'bg-blue-700 border-blue-800'
                          : isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-300 border-slate-400'
                      }`}
                    >
                      <div
                        className={`w-full h-4 rounded bg-white transition-all shadow-md ${
                          isOn ? 'self-start bg-blue-100' : 'self-end bg-slate-100'
                        }`}
                      />
                    </div>
                    <span className={`text-[10px] font-bold ${isOn ? 'text-blue-500' : 'text-slate-400'}`}>
                      {isOn ? 'ON (1)' : 'OFF (0)'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ULTRA-REALISTIC DUAL-IN-LINE (DIP-40) CHIP VISUALIZER ON PCB */
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          
          {/* Authentic PCB Breadboard Carrier & DIP-40 Package */}
          <div className={`flex-1 rounded-xl p-4 flex flex-col items-center justify-center overflow-y-auto border relative ${
            isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-[#f8fafc] border-slate-200'
          }`}>
            
            {/* Chip Name & Specifications Subtitle */}
            <div className="text-center mb-3">
              <div className="flex items-center justify-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {currentChipData.title}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-sans font-semibold border ${
                  packageStyle === 'CERAMIC'
                    ? isDark ? 'bg-purple-950/60 border-purple-700 text-purple-300' : 'bg-purple-100 border-purple-300 text-purple-800'
                    : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-200 border-slate-300 text-slate-700'
                }`}>
                  {packageStyle === 'CERAMIC' ? 'CERAMIC Cerdip-40' : 'EPOXY DIP-40'}
                </span>
              </div>
              <p className={`text-[11px] font-sans mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {currentChipData.desc}
              </p>
            </div>

            {/* REALISTIC PCB MOTHERBOARD BED */}
            <div className={`relative w-full max-w-xl p-4 sm:p-6 rounded-2xl border-2 transition-all shadow-xl ${
              isDark
                ? 'bg-gradient-to-b from-[#0a1f18] via-[#081813] to-[#05110d] border-[#134e3b] shadow-emerald-950/40'
                : 'bg-gradient-to-b from-[#115e43] via-[#0d4a34] to-[#093928] border-[#166534] shadow-slate-300'
            }`}>
              {/* PCB Copper Silk Screen Labels */}
              <div className="absolute top-2 left-3 text-[10px] text-[#4ade80]/60 font-mono select-none tracking-widest">
                BOARD: U1-8086-LAB-REV2.4
              </div>
              <div className="absolute top-2 right-3 text-[10px] text-[#4ade80]/60 font-mono select-none">
                VCC: +5.00V
              </div>

              {/* Decoupling Capacitors & Crystal Oscillator on PCB */}
              <div className="absolute bottom-2 left-4 flex items-center gap-3">
                {/* 0.1uF Ceramic Cap */}
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-4 rounded-sm bg-amber-600 border border-amber-400 shadow-2xs" />
                  <span className="text-[9px] text-[#4ade80]/60 font-mono">C1 0.1µF</span>
                </div>
                {/* 14.318 MHz HC-49 Crystal */}
                <div className="flex items-center gap-1">
                  <div className="w-6 h-3 rounded-full bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400 border border-slate-500 shadow-2xs" />
                  <span className="text-[9px] text-[#4ade80]/60 font-mono">Y1 14.318MHz</span>
                </div>
              </div>

              {/* REALISTIC IC PACKAGE CONTAINER */}
              <div className="relative mx-auto w-full max-w-md">
                
                {/* IC Body (Ceramic Purple with Gold Lid or Epoxy Matte Black) */}
                <div
                  className={`relative rounded-xl py-3 px-2 sm:px-3 shadow-2xl transition-all duration-300 ${
                    packageStyle === 'CERAMIC'
                      ? 'bg-gradient-to-r from-[#2e1a3b] via-[#3d2350] to-[#2e1a3b] border-2 border-[#5c3577]'
                      : 'bg-gradient-to-r from-[#141517] via-[#1f2124] to-[#141517] border-2 border-[#33373d]'
                  }`}
                  style={{
                    boxShadow: '0 20px 35px -10px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.8)',
                  }}
                >
                  {/* Pin 1 Index Notch (Semi-circle at the top) */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-4 bg-[#0a1f18] rounded-b-full border-b border-x border-[#1e293b] shadow-inner z-10" />

                  {/* Pin 1 Laser Dot Indent */}
                  <div className="absolute top-3 left-4 w-3 h-3 rounded-full bg-[#111] border border-slate-700 shadow-inner flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-slate-600" />
                  </div>

                  {/* Gold Laser Cavity Lid (For Ceramic C8086) */}
                  {packageStyle === 'CERAMIC' && (
                    <div className="mx-auto my-1 w-3/5 h-16 rounded-md bg-gradient-to-b from-[#d4af37] via-[#f3e5ab] to-[#aa8c2c] border border-[#f5d77f] p-1.5 shadow-md flex flex-col items-center justify-center select-none opacity-95">
                      <div className="text-[9px] font-sans font-black text-[#5a450c] tracking-widest lowercase">intel ®</div>
                      <div className="text-xs font-mono font-black text-[#423207] tracking-wider">{currentChipData.partNumber}</div>
                      <div className="text-[8px] font-mono font-bold text-[#5a450c]">{currentChipData.lotCode}</div>
                      <div className="text-[7px] font-mono text-[#5a450c]">{currentChipData.copyright}</div>
                    </div>
                  )}

                  {/* Silkscreen Laser Text for Plastic Epoxy */}
                  {packageStyle === 'PLASTIC' && (
                    <div className="text-center py-2.5 my-1 border-y border-white/5 select-none">
                      <div className="text-xs font-sans font-extrabold text-slate-300 tracking-widest lowercase flex items-center justify-center gap-1">
                        <span>intel</span>
                        <span className="text-[8px] uppercase text-slate-400">®</span>
                      </div>
                      <div className="text-sm font-mono font-black text-slate-100 tracking-wider my-0.5">
                        {currentChipData.partNumber}
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 tracking-widest">
                        {currentChipData.lotCode} • {currentChipData.country}
                      </div>
                      <div className="text-[8px] font-mono text-slate-500">
                        {currentChipData.copyright}
                      </div>
                    </div>
                  )}

                  {/* DUAL-IN-LINE PIN ROWS (Left Pins 1-20, Right Pins 40-21) */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-6 text-[11px] pt-1">
                    
                    {/* Left Pins (1 to 20) */}
                    <div className="space-y-1">
                      {currentChipData.left.map((pin) => {
                        const isHigh = pin.level === 'HIGH';
                        const isSelected = selectedPin?.num === pin.num;
                        return (
                          <div
                            key={pin.num}
                            onClick={() => setSelectedPin(pin)}
                            className={`group relative flex items-center justify-between px-2 py-0.5 rounded transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white font-bold shadow-md ring-1 ring-blue-300'
                                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800'
                            }`}
                          >
                            {/* Realistic Metallic Tinned Pin Leg Protruding Left */}
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-1.5 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 rounded-l-xs border border-slate-500 shadow-2xs group-hover:bg-amber-300" />
                            
                            <div className="flex items-center gap-1.5 z-10">
                              {/* Live Glowing Pin Indicator LED */}
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                                  isHigh
                                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400 ring-1 ring-emerald-300'
                                    : 'bg-slate-600'
                                }`}
                              />
                              <span className="font-semibold text-[11px] truncate max-w-[95px] sm:max-w-[120px]">
                                {pin.name}
                              </span>
                            </div>

                            <span className="text-[10px] text-slate-400 ml-1 font-mono z-10 group-hover:text-white">
                              #{pin.num}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Right Pins (40 to 21) */}
                    <div className="space-y-1">
                      {currentChipData.right.map((pin) => {
                        const isHigh = pin.level === 'HIGH';
                        const isSelected = selectedPin?.num === pin.num;
                        return (
                          <div
                            key={pin.num}
                            onClick={() => setSelectedPin(pin)}
                            className={`group relative flex items-center justify-between px-2 py-0.5 rounded transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white font-bold shadow-md ring-1 ring-blue-300'
                                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800'
                            }`}
                          >
                            {/* Realistic Metallic Tinned Pin Leg Protruding Right */}
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-1.5 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 rounded-r-xs border border-slate-500 shadow-2xs group-hover:bg-amber-300" />

                            <span className="text-[10px] text-slate-400 mr-1 font-mono z-10 group-hover:text-white">
                              #{pin.num}
                            </span>

                            <div className="flex items-center gap-1.5 z-10">
                              <span className="font-semibold text-[11px] truncate max-w-[95px] sm:max-w-[120px]">
                                {pin.name}
                              </span>
                              {/* Live Glowing Pin Indicator LED */}
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                                  isHigh
                                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400 ring-1 ring-emerald-300'
                                    : 'bg-slate-600'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Pin Detail Card */}
          <div className={`w-full lg:w-72 rounded-xl p-3.5 flex flex-col gap-2 shrink-0 border transition-colors ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`flex items-center gap-1.5 text-xs font-bold border-b pb-2 ${
              isDark ? 'border-slate-800 text-slate-200' : 'border-slate-200 text-slate-800'
            }`}>
              <Info className="w-4 h-4 text-blue-500" />
              <span>Pin Inspector & Bus Electricals</span>
            </div>

            {selectedPin ? (
              <div className="space-y-2.5 text-xs">
                <div className={`border rounded-lg p-2.5 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedPin.name}</span>
                    <span className="bg-blue-500/10 text-blue-500 font-bold text-[10px] px-2 py-0.5 rounded border border-blue-500/30">
                      PIN #{selectedPin.num}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans mt-0.5">Type: {selectedPin.type}</div>
                  {selectedPin.category && (
                    <span className="inline-block text-[10px] bg-slate-500/10 text-slate-400 px-1.5 py-0.5 rounded mt-1">
                      Bus Group: {selectedPin.category}
                    </span>
                  )}
                </div>

                <div className={`border rounded-lg p-2.5 space-y-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-sans">Live Voltage Level:</span>
                    <span className={`font-bold font-mono ${selectedPin.level === 'HIGH' ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {selectedPin.level} ({selectedPin.voltage})
                    </span>
                  </div>
                  <div className={`text-[11px] font-sans leading-relaxed border-t pt-2 ${
                    isDark ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-700'
                  }`}>
                    {selectedPin.desc}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-4 font-sans text-xs">
                <Cpu className="w-8 h-8 text-slate-400 mb-2 opacity-50" />
                <p>Click any pin on the IC package to view its electrical specification, active bus state, and textbook lab description.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

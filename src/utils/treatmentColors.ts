export interface TreatmentColor {
  bg: string       // chart band fill
  border: string   // chart band border / swatch border
  swatch: string   // legend swatch fill (more opaque)
  text: string     // legend label
}

export interface TreatmentEntry {
  name: string
  color: TreatmentColor
  periods: { start: string; end: string }[]
}

const PALETTE: TreatmentColor[] = [
  { bg: 'rgba(16,185,129,0.13)', border: 'rgba(16,185,129,0.7)', swatch: 'rgba(16,185,129,0.5)', text: '#10b981' },
  { bg: 'rgba(59,130,246,0.13)', border: 'rgba(59,130,246,0.7)', swatch: 'rgba(59,130,246,0.5)', text: '#3b82f6' },
  { bg: 'rgba(245,158,11,0.13)', border: 'rgba(245,158,11,0.7)', swatch: 'rgba(245,158,11,0.5)', text: '#f59e0b' },
  { bg: 'rgba(239,68,68,0.13)',  border: 'rgba(239,68,68,0.7)',  swatch: 'rgba(239,68,68,0.5)',  text: '#ef4444' },
  { bg: 'rgba(168,85,247,0.13)', border: 'rgba(168,85,247,0.7)', swatch: 'rgba(168,85,247,0.5)', text: '#a855f7' },
]

export function colorForIndex(i: number): TreatmentColor {
  return PALETTE[i % PALETTE.length]
}

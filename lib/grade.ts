export const GRADE_STYLES = {
  A: { from: '#0F7B6C', to: '#1AAB97', text: '#FFFFFF', bg: '#DCFCE7', bd: '#86EFAC', fg: '#14532D' },
  B: { from: '#2D5590', to: '#5B80B0', text: '#FFFFFF', bg: '#E6F5F3', bd: '#B3E3DC', fg: '#094A43' },
  C: { from: '#CA8A04', to: '#EAB308', text: '#FFFFFF', bg: '#FEF3C7', bd: '#FDE68A', fg: '#92400E' },
  D: { from: '#EA580C', to: '#F97316', text: '#FFFFFF', bg: '#FFEDD5', bd: '#FED7AA', fg: '#9A3412' },
  F: { from: '#B91C1C', to: '#DC2626', text: '#FFFFFF', bg: '#FEE2E2', bd: '#FECACA', fg: '#991B1B' },
} as const

export type GradeLetter = keyof typeof GRADE_STYLES

export function getGradeLetter(avg: number | null, reviewCount?: number | null): GradeLetter | null {
  if (avg == null || reviewCount === 0) return null
  if (avg >= 4.0) return 'A'
  if (avg >= 3.0) return 'B'
  if (avg >= 2.0) return 'C'
  if (avg >= 1.0) return 'D'
  return 'F'
}

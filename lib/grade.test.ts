import { describe, it, expect } from 'vitest'
import { getGradeLetter, GRADE_STYLES } from './grade'

describe('getGradeLetter', () => {
  it('returns null when no rating exists', () => {
    expect(getGradeLetter(null)).toBeNull()
    expect(getGradeLetter(null, 5)).toBeNull()
  })

  it('returns null when reviewCount is exactly 0 (the explicit no-data case)', () => {
    expect(getGradeLetter(4.5, 0)).toBeNull()
    expect(getGradeLetter(0, 0)).toBeNull()
  })

  it('treats undefined reviewCount as ungated (legacy callers)', () => {
    expect(getGradeLetter(4.5)).toBe('A')
    expect(getGradeLetter(2.5)).toBe('C')
  })

  it('grades A at the 4.0 cutoff and above', () => {
    expect(getGradeLetter(4.0, 1)).toBe('A')
    expect(getGradeLetter(4.5, 1)).toBe('A')
    expect(getGradeLetter(5.0, 1)).toBe('A')
  })

  it('grades B in the 3.0–3.999 band', () => {
    expect(getGradeLetter(3.0, 1)).toBe('B')
    expect(getGradeLetter(3.99, 1)).toBe('B')
  })

  it('grades C in the 2.0–2.999 band', () => {
    expect(getGradeLetter(2.0, 1)).toBe('C')
    expect(getGradeLetter(2.5, 1)).toBe('C')
  })

  it('grades D in the 1.0–1.999 band', () => {
    expect(getGradeLetter(1.0, 1)).toBe('D')
    expect(getGradeLetter(1.5, 1)).toBe('D')
  })

  it('grades F below 1.0', () => {
    expect(getGradeLetter(0.5, 1)).toBe('F')
    expect(getGradeLetter(0.0, 1)).toBe('F')
  })

  it('every grade letter has a complete style entry', () => {
    for (const letter of ['A', 'B', 'C', 'D', 'F'] as const) {
      const style = GRADE_STYLES[letter]
      expect(style.from).toMatch(/^#[0-9A-F]{6}$/i)
      expect(style.to).toMatch(/^#[0-9A-F]{6}$/i)
      expect(style.bg).toMatch(/^#[0-9A-F]{6}$/i)
      expect(style.fg).toMatch(/^#[0-9A-F]{6}$/i)
      expect(style.bd).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })
})

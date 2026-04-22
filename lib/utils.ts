import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'
import type { LandlordGrade, Severity } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── DATE FORMATTING ─────────────────────────────────────────

export function formatDate(date: string | null | undefined): string {
  if (!date) return 'Unknown'
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateRelative(date: string | null | undefined): string {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatRentalPeriod(start?: string | null, end?: string | null, isCurrent?: boolean): string {
  if (!start) return 'Unknown period'
  const s = format(new Date(start), 'MMM yyyy')
  if (isCurrent) return `${s} – Present`
  if (!end) return `${s} – Present`
  return `${s} – ${format(new Date(end), 'MMM yyyy')}`
}

// ─── RATING HELPERS ──────────────────────────────────────────

export function ratingToLabel(rating: number): string {
  if (rating >= 4.5) return 'Excellent'
  if (rating >= 3.5) return 'Good'
  if (rating >= 2.5) return 'Fair'
  if (rating >= 1.5) return 'Poor'
  return 'Very Poor'
}

export function ratingToColor(rating: number): string {
  if (rating >= 4) return 'text-teal-500'
  if (rating >= 3) return 'text-amber-500'
  if (rating >= 2) return 'text-orange-500'
  return 'text-red-600'
}

// ─── GRADE HELPERS ───────────────────────────────────────────

export function gradeColor(grade: LandlordGrade | null): string {
  switch (grade) {
    case 'A': return 'bg-teal-500 text-white'
    case 'B': return 'bg-green-500 text-white'
    case 'C': return 'bg-amber-500 text-white'
    case 'D': return 'bg-orange-500 text-white'
    case 'F': return 'bg-red-600 text-white'
    default: return 'bg-gray-200 text-gray-600'
  }
}

export function gradeBgLight(grade: LandlordGrade | null): string {
  switch (grade) {
    case 'A': return 'bg-teal-50 border-teal-200 text-teal-800'
    case 'B': return 'bg-green-50 border-green-200 text-green-800'
    case 'C': return 'bg-amber-50 border-amber-200 text-amber-800'
    case 'D': return 'bg-orange-50 border-orange-200 text-orange-800'
    case 'F': return 'bg-red-50 border-red-200 text-red-800'
    default: return 'bg-gray-50 border-gray-200 text-gray-600'
  }
}

// ─── SEVERITY HELPERS ────────────────────────────────────────

export function severityColor(severity: Severity | null): string {
  switch (severity) {
    case 'critical': return 'bg-red-600 text-white'
    case 'high': return 'bg-orange-500 text-white'
    case 'medium': return 'bg-amber-400 text-gray-900'
    case 'low': return 'bg-blue-100 text-blue-800'
    default: return 'bg-gray-100 text-gray-600'
  }
}

export function severityLabel(severity: Severity | null, isClosed?: boolean): string {
  if (isClosed) return 'Closed'
  switch (severity) {
    case 'critical': return 'Critical'
    case 'high': return 'Serious'
    case 'medium': return 'Minor'
    case 'low': return 'Informational'
    default: return 'Unknown'
  }
}

// ─── STRING HELPERS ──────────────────────────────────────────

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen).trim() + '…'
}

export function formatReviewerName(fullName?: string | null, email?: string | null): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    if (parts.length > 0) {
      const first = parts[0]!
      if (parts.length === 1) return first
      const lastInitial = parts.at(-1)?.charAt(0)?.toUpperCase()
      return lastInitial ? `${first} ${lastInitial}.` : first
    }
  }
  // Fallback: show email username (part before @)
  if (email) {
    const username = email.split('@')[0]
    if (username) return username
  }
  return 'Anonymous Renter'
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function titleCase(str: string): string {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())
}

export function formatAddress(line1: string, city: string, stateAbbr: string, zip?: string): string {
  return [line1, city, zip ? `${stateAbbr} ${zip}` : stateAbbr].filter(Boolean).join(', ')
}

// ─── NUMBER HELPERS ──────────────────────────────────────────

export function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : (plural ?? singular + 's')}`
}

// ─── VALIDATION HELPERS ──────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// File magic bytes — check actual file type, not just extension
export async function detectFileType(file: File): Promise<string | null> {
  const buf = await file.slice(0, 4).arrayBuffer()
  const bytes = new Uint8Array(buf)
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  if (hex.startsWith('25504446')) return 'application/pdf'    // %PDF
  if (hex.startsWith('ffd8ff')) return 'image/jpeg'
  if (hex.startsWith('89504e47')) return 'image/png'
  if (hex.startsWith('504b0304')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // docx
  return null
}

export const ALLOWED_LEASE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export const MAX_LEASE_SIZE = 10 * 1024 * 1024  // 10MB
export const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024 // 10MB

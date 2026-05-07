import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'
import type { Severity } from '@/types'

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

// ─── SEVERITY HELPERS ────────────────────────────────────────

export function severityColor(severity: Severity | null): string {
  switch (severity) {
    case 'critical': return 'bg-red-600 text-white'
    case 'high': return 'bg-orange-500 text-white'
    case 'medium': return 'bg-amber-400 text-slate-900'
    case 'low': return 'bg-blue-100 text-blue-800'
    default: return 'bg-slate-100 text-slate-600'
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

'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Search, Upload, FileText, X, CheckCircle2, Loader2, AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Landlord } from '@/types'

// ── Step indicator ────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Find Profile' },
  { n: 2, label: 'Upload Docs' },
  { n: 3, label: 'Founder Review' },
]

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((step, i) => {
        const isDone = step.n < current
        const isActive = step.n === current
        return (
          <div key={step.n} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isDone
                    ? 'bg-teal-500 text-white'
                    : isActive
                    ? 'bg-navy-600 text-white ring-4 ring-navy-100'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.n}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isActive ? 'text-navy-700' : isDone ? 'text-teal-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-16 mx-1 mb-5 transition-all ${
                  step.n < current ? 'bg-teal-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function ClaimProfilePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Landlord[]>([])
  const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(null)
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docType, setDocType] = useState('')
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const supabase = createClient()

  // Determine current step for the indicator
  const currentStep: 1 | 2 | 3 = submitted ? 3 : selectedLandlord ? 2 : 1

  async function searchLandlords(q: string) {
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=landlord&limit=10`)
      const data = await res.json()
      setSearchResults(data.results?.filter((r: any) => r.result_type === 'landlord' && !r.is_claimed) ?? [])
    } finally {
      setSearching(false)
    }
  }

  const onDrop = useCallback((files: File[]) => {
    const f = files[0]
    if (f && f.size <= 10 * 1024 * 1024) setDocFile(f)
    else toast.error('File too large — max 10MB')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'] },
    maxFiles: 1,
  })

  async function handleSubmit() {
    if (!selectedLandlord || !docFile || !docType) {
      toast.error('Please fill in all required fields')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Please sign in first'); return }

    setSubmitting(true)
    try {
      const ext = docFile.name.split('.').pop()
      const path = `${user.id}/${selectedLandlord.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('landlord-verification-docs')
        .upload(path, docFile)
      if (uploadError) throw uploadError

      const res = await fetch('/api/landlord-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landlordId: selectedLandlord.id,
          docUrl: path,
          docFilename: docFile.name,
          verificationType: docType,
        }),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
    } catch (err) {
      toast.error('Submission failed. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success / submitted state ─────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <StepIndicator current={3} />
        <div className="text-center">
          <div className="h-20 w-20 bg-teal-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Claim Request Submitted!</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            Our founders will review your documents within <strong className="text-gray-700">48 hours</strong>.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            You&apos;ll receive an email when your claim is approved or if we need more information.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-8 text-left space-y-3">
            <h3 className="text-sm font-bold text-gray-700 mb-3">What happens next?</h3>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-navy-100 text-navy-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
              <p className="text-sm text-gray-600">A founder or moderator reviews your verification document</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-navy-100 text-navy-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
              <p className="text-sm text-gray-600">You receive an email with the approval decision</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
              <p className="text-sm text-gray-600">Once approved, respond to reviews and manage your profile</p>
            </div>
          </div>

          <Button asChild className="bg-navy-600 hover:bg-navy-700 text-white px-8">
            <a href="/landlord-portal">
              Back to Portal <ArrowRight className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </div>
    )
  }

  // ── Main form ────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Claim Your Landlord Profile</h1>
        <p className="text-sm text-gray-500">
          Verify ownership to respond to reviews and manage your profile.
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator current={currentStep} />

      <div className="space-y-6">
        {/* ── Step 1: Find Profile ────────────────────────── */}
        <div className={`transition-opacity ${currentStep > 1 ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              selectedLandlord ? 'bg-teal-500 text-white' : 'bg-navy-600 text-white'
            }`}>
              {selectedLandlord ? <CheckCircle2 className="h-3.5 w-3.5" /> : '1'}
            </div>
            <Label className="text-sm font-bold text-gray-800">Find Your Profile</Label>
          </div>

          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9 pr-9"
              placeholder="Search your name or management company..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); searchLandlords(e.target.value) }}
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {selectedLandlord ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl p-3.5">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <p className="font-semibold text-teal-900 text-sm">{selectedLandlord.display_name}</p>
                  {selectedLandlord.city && (
                    <p className="text-xs text-teal-700">{selectedLandlord.city}, {selectedLandlord.state_abbr}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedLandlord(null)}
                className="text-teal-400 hover:text-teal-600 p-1 rounded hover:bg-teal-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            searchResults.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {searchResults.map(l => (
                  <button
                    key={l.id}
                    className="w-full text-left px-4 py-3.5 hover:bg-navy-50 border-b last:border-0 transition-colors"
                    onClick={() => { setSelectedLandlord(l); setSearchResults([]) }}
                  >
                    <p className="font-semibold text-gray-900 text-sm">{l.display_name}</p>
                    {l.city && <p className="text-xs text-gray-500 mt-0.5">{l.city}, {l.state_abbr}</p>}
                  </button>
                ))}
              </div>
            )
          )}

          {!searching && !selectedLandlord && searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              No unclaimed profiles found.{' '}
              <a href="/add-landlord" className="text-navy-600 underline hover:text-navy-800">
                Add your profile
              </a>
            </p>
          )}
        </div>

        {/* ── Step 2: Doc type + Upload (revealed after landlord selected) ── */}
        <div className={`transition-all duration-300 ${!selectedLandlord ? 'opacity-40 pointer-events-none' : ''}`}>
          {/* Doc type */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                docType ? 'bg-teal-500 text-white' : 'bg-navy-600 text-white'
              }`}>
                {docType ? <CheckCircle2 className="h-3.5 w-3.5" /> : '2'}
              </div>
              <Label className="text-sm font-bold text-gray-800">Document Type</Label>
            </div>
            <Select onValueChange={(v: string | null) => setDocType(v ?? '')} disabled={!selectedLandlord}>
              <SelectTrigger>
                <SelectValue placeholder="Select verification document type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utility_bill">Utility Bill (showing property address)</SelectItem>
                <SelectItem value="government_id">Government ID + Proof of Property</SelectItem>
                <SelectItem value="deed">Property Deed</SelectItem>
                <SelectItem value="business_reg">Business Registration (LLC / Corp)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Drag & drop upload */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                docFile ? 'bg-teal-500 text-white' : 'bg-navy-600 text-white'
              }`}>
                {docFile ? <CheckCircle2 className="h-3.5 w-3.5" /> : '3'}
              </div>
              <Label className="text-sm font-bold text-gray-800">Upload Document</Label>
            </div>

            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragActive
                  ? 'border-navy-400 bg-navy-50 scale-[1.01]'
                  : docFile
                  ? 'border-teal-400 bg-teal-50'
                  : 'border-gray-300 hover:border-navy-300 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />

              {docFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 bg-teal-100 rounded-xl flex items-center justify-center mb-1">
                    <FileText className="h-6 w-6 text-teal-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{docFile.name}</span>
                  <span className="text-xs text-gray-500">
                    {(docFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setDocFile(null) }}
                    className="mt-1 flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Remove file
                  </button>
                </div>
              ) : isDragActive ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 bg-navy-100 rounded-xl flex items-center justify-center mb-1">
                    <Upload className="h-6 w-6 text-navy-500 animate-bounce" />
                  </div>
                  <p className="text-sm font-semibold text-navy-700">Drop to upload</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center mb-1">
                    <Upload className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Drag & drop your document here</p>
                  <p className="text-xs text-gray-400">or click to browse files</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">PDF</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">JPG</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">PNG</span>
                    <span className="text-xs text-gray-400">· Max 10 MB</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Documents are reviewed by Vett founders and moderators only and are never shared publicly or shown to renters.
              </p>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <Button
          className="w-full bg-navy-600 hover:bg-navy-700 text-white h-11 text-sm font-semibold"
          onClick={handleSubmit}
          disabled={!selectedLandlord || !docFile || !docType || submitting}
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</>
          ) : (
            <>Submit Claim Request <ArrowRight className="h-4 w-4 ml-2" /></>
          )}
        </Button>
      </div>
    </div>
  )
}

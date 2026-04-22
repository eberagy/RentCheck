'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CheckCircle2, Upload, FileText, X, AlertTriangle,
  ArrowRight, ArrowLeft, Lock, Loader2, Search, Building2, Check
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StarRating } from '@/components/review/StarRating'
import { Progress } from '@/components/ui/progress'
import { Eyebrow } from '@/components/vett/Eyebrow'
import { VerifiedBadge } from '@/components/vett/VerifiedBadge'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { detectFileType, ALLOWED_LEASE_TYPES, MAX_LEASE_SIZE } from '@/lib/utils'
import { toast } from 'sonner'
import type { Landlord } from '@/types'

const reviewSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(150),
  body: z.string().min(50, 'Review must be at least 50 characters').max(2000),
  propertyAddress: z.string().min(3, 'Please enter the property address').max(200),
  ratingOverall: z.number().min(1, 'Required').max(5),
  ratingResponsiveness: z.number().min(1, 'Required').max(5),
  ratingMaintenance: z.number().min(1, 'Required').max(5),
  ratingHonesty: z.number().min(1, 'Required').max(5),
  ratingLeaseFairness: z.number().min(1, 'Required').max(5),
  wouldRentAgain: z.enum(['yes', 'no', 'unsure'], { errorMap: () => ({ message: 'Please select one' }) }),
  rentalPeriodStart: z.string().min(1, 'Required'),
  rentalPeriodEnd: z.string().optional(),
  isCurrentTenant: z.boolean().default(false),
  confirmedGenuine: z.literal(true, { errorMap: () => ({ message: 'You must confirm this is your genuine experience' }) }),
  confirmedLiability: z.literal(true, { errorMap: () => ({ message: 'You must agree to the terms' }) }),
}).refine(
  (data) => data.isCurrentTenant || (data.rentalPeriodEnd && data.rentalPeriodEnd.length > 0),
  { message: 'Move-out date is required unless you still rent here', path: ['rentalPeriodEnd'] }
)

type ReviewFormData = z.infer<typeof reviewSchema>
type UploadedLease = {
  docPath: string
  filename: string
  fileSize: number
}

const STEPS = ['Find Landlord', 'Lease Verification', 'Write Review', 'Confirm & Submit', 'Done']

export default function NewReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedLandlordId = searchParams.get('landlord')
  const { user, loading: authLoading } = useAuth()

  const [step, setStep] = useState(preselectedLandlordId ? 1 : 0)
  const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Landlord[]>([])
  const [searching, setSearching] = useState(false)
  const [leaseFile, setLeaseFile] = useState<File | null>(null)
  const [leaseStatus, setLeaseStatus] = useState<'idle' | 'uploading' | 'uploaded'>('idle')
  const [uploadedLease, setUploadedLease] = useState<UploadedLease | null>(null)
  const [leaseError, setLeaseError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  // Auth gate
  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50">
          <Lock className="h-7 w-7 text-navy-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Sign in to write a review</h1>
        <p className="mt-2 text-sm text-slate-500">
          You need an account to submit lease-verified reviews on Vett.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild className="rounded-full bg-navy-600 hover:bg-navy-700">
            <Link href="/login?redirectTo=/review/new">Sign In</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { ratingOverall: 0, ratingResponsiveness: 0, ratingMaintenance: 0, ratingHonesty: 0, ratingLeaseFairness: 0, isCurrentTenant: false, propertyAddress: '' },
  })

  useEffect(() => {
    async function loadPreselectedLandlord() {
      if (!preselectedLandlordId || selectedLandlord) return
      const res = await fetch(`/api/landlords?id=${encodeURIComponent(preselectedLandlordId)}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.landlord) setSelectedLandlord(data.landlord as Landlord)
    }

    loadPreselectedLandlord().catch(console.error)
  }, [preselectedLandlordId, selectedLandlord])

  // Step 0: search for landlord
  async function searchLandlords(q: string) {
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=landlord&limit=10`)
      const data = await res.json()
      setSearchResults(data.results?.filter((r: any) => r.result_type === 'landlord') ?? [])
    } finally {
      setSearching(false)
    }
  }

  // Step 1: lease upload
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setLeaseError(null)

    if (file.size > MAX_LEASE_SIZE) {
      setLeaseError('File too large. Maximum size is 10MB.')
      return
    }
    const detectedType = await detectFileType(file)
    if (!detectedType || !ALLOWED_LEASE_TYPES.includes(detectedType)) {
      setLeaseError('Unsupported file type. Please upload PDF, JPG, PNG, or DOCX.')
      return
    }
    setLeaseFile(file)
    setUploadedLease(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    maxFiles: 1,
  })

  async function handleLeaseUpload() {
    if (!leaseFile || !selectedLandlord) return
    setLeaseStatus('uploading')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Please sign in first'); return }

      const ext = leaseFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('lease-docs')
        .upload(path, leaseFile, { upsert: false })
      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        setLeaseStatus('idle')
        setLeaseError('Upload failed — the storage service may be temporarily unavailable. Please try again.')
        return
      }

      // Call verify endpoint
      const res = await fetch('/api/verify-lease', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: path, fileName: leaseFile.name, fileSize: leaseFile.size }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.error('Lease verification error:', errData)
        throw new Error(errData.error || 'Verification failed')
      }
      const payload = await res.json()
      setUploadedLease({
        docPath: payload.docPath,
        filename: payload.filename,
        fileSize: payload.fileSize,
      })
      setLeaseStatus('uploaded')
      toast.success('Lease received. Keep writing — verification happens in the background (usually 24–48h).')
      setStep(2)
    } catch (err) {
      setLeaseStatus('idle')
      setLeaseError('Upload failed. Please try again.')
      console.error(err)
    }
  }

  async function onSubmit(data: ReviewFormData) {
    if (!selectedLandlord) return
    if (!uploadedLease) {
      toast.error('Upload and validate your lease before submitting a review')
      setStep(1)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Please sign in to submit a review'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landlordId: selectedLandlord.id,
          propertyAddress: data.propertyAddress,
          ratingOverall: data.ratingOverall,
          ratingResponsiveness: data.ratingResponsiveness,
          ratingMaintenance: data.ratingMaintenance,
          ratingHonesty: data.ratingHonesty,
          ratingLeaseFairness: data.ratingLeaseFairness,
          wouldRentAgain: data.wouldRentAgain === 'yes' ? true : data.wouldRentAgain === 'no' ? false : null,
          title: data.title,
          body: data.body,
          rentalPeriodStart: data.rentalPeriodStart,
          rentalPeriodEnd: data.rentalPeriodEnd,
          isCurrentTenant: data.isCurrentTenant,
          leaseDocPath: uploadedLease.docPath,
          leaseFilename: uploadedLease.filename,
          leaseFileSize: uploadedLease.fileSize,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = errData.error
        if (res.status === 409) {
          toast.error('You recently submitted a review for this landlord.')
        } else if (res.status === 401) {
          toast.error('Session expired — please sign in again.')
        } else {
          toast.error(typeof msg === 'string' ? msg : 'Failed to submit review. Please try again.')
        }
        return
      }
      setStep(4)
    } catch (err) {
      toast.error('Failed to submit review. Please try again.')
      console.error('Review submit error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const ratingOverall = watch('ratingOverall')

  return (
    <div className="mx-auto max-w-[980px] px-7 py-8">
      {/* Progress bar */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white px-6 py-[18px]">
        <div className="grid gap-[6px]" style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}>
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-col gap-2">
              <div
                className="h-1 rounded-full"
                style={{
                  background: i <= step ? 'linear-gradient(90deg, #0F7B6C, #1AAB97)' : '#E2E8F0',
                }}
              />
              <div className={`text-[11px] font-semibold ${i <= step ? 'text-slate-900' : 'text-slate-400'}`}>
                {i < step ? <Check className="inline h-[11px] w-[11px] text-teal" /> : `0${i + 1}`}
                <span className="ml-1">{s}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Context card (show when landlord selected) */}
      {selectedLandlord && step >= 1 && step < 4 && (
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-navy-200 bg-gradient-to-br from-navy-50 to-slate-50 p-[18px]">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-navy-200 bg-white">
            <Building2 className="h-5 w-5 text-navy-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-navy-400">Writing about</div>
            <div className="mt-0.5 truncate text-[15.5px] font-bold text-slate-900">
              {selectedLandlord.display_name}
              {selectedLandlord.city && <span className="font-normal text-slate-500"> &middot; {selectedLandlord.city}, {selectedLandlord.state_abbr}</span>}
            </div>
          </div>
          {leaseStatus === 'uploaded' && <VerifiedBadge label="Lease uploaded" />}
        </div>
      )}

      {/* Step 0: Find landlord */}
      {step === 0 && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-9 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <Eyebrow tone="teal">Step 1 of 5 &middot; Find your landlord</Eyebrow>
          <h1 className="mt-3.5 text-[clamp(28px,5.5vw,36px)] font-extrabold tracking-tight text-slate-900">Who was your landlord?</h1>
          <p className="mt-1.5 text-[14.5px] text-slate-500">Search by name, management company, or address</p>

          <div className="relative mt-8 mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="h-11 rounded-xl border-slate-200 pl-10 text-[14px]"
              placeholder="Search landlords..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); searchLandlords(e.target.value) }}
            />
          </div>
          {searching && <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" /></div>}
          {searchResults.length > 0 && (
            <div className="rounded-[16px] border border-slate-200 overflow-hidden">
              {searchResults.map((l: Landlord) => (
                <button
                  key={l.id}
                  className="w-full text-left px-4 py-3 hover:bg-navy-50 border-b border-slate-100 last:border-0 flex items-center justify-between transition-colors"
                  onClick={() => { setSelectedLandlord(l); setStep(1) }}
                >
                  <div>
                    <p className="font-bold text-[14px] text-slate-900">{l.display_name}</p>
                    {l.city && <p className="text-[12.5px] text-slate-500 mt-0.5">{l.city}, {l.state_abbr}</p>}
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <div className="text-center py-8 rounded-[16px] border border-slate-200 bg-slate-50">
              <p className="text-sm font-semibold text-slate-700">Landlord not found</p>
              <p className="text-[12.5px] text-slate-400 mt-1">Submit them so we can add them to our database</p>
              <Button size="sm" className="mt-3 rounded-full bg-teal hover:bg-teal-500 text-white" onClick={() => {
                router.push(`/add-landlord?name=${encodeURIComponent(searchQuery)}`)
              }}>
                Add &ldquo;{searchQuery}&rdquo; as a new landlord
              </Button>
            </div>
          )}
          {searchQuery.length >= 2 && !searching && searchResults.length > 0 && (
            <p className="text-center text-[12.5px] text-slate-400 mt-3">
              Don&apos;t see your landlord?{' '}
              <button type="button" className="text-teal-600 font-medium hover:underline" onClick={() => router.push(`/add-landlord?name=${encodeURIComponent(searchQuery)}`)}>
                Add them to Vett
              </button>
            </p>
          )}
        </div>
      )}

      {/* Step 1: Lease verification */}
      {step === 1 && selectedLandlord && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-9 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <Eyebrow tone="teal">Step 2 of 5 &middot; Lease verification</Eyebrow>
          <h1 className="mt-3.5 text-[clamp(28px,5.5vw,36px)] font-extrabold tracking-tight text-slate-900 font-display">Verify your lease.</h1>
          <p className="mt-1.5 max-w-[600px] text-[14.5px] text-slate-500">
            Upload your lease to confirm tenancy. You can write your review right after — it won&rsquo;t go live until a founder manually verifies the document (typically 24–48 hours).
          </p>

          {/* Privacy + timeline box */}
          <div className="mt-6 mb-6 grid gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-[18px] sm:grid-cols-2">
            <div className="flex gap-3">
              <Lock className="h-[18px] w-[18px] flex-shrink-0 text-teal mt-0.5" aria-hidden="true" />
              <div className="text-[13px] leading-relaxed text-slate-700">
                <b className="block text-slate-900">Privacy protected</b>
                Stored privately, reviewed only by the Vett founders, never shown publicly.
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="h-[18px] w-[18px] flex-shrink-0 text-teal mt-0.5" aria-hidden="true" />
              <div className="text-[13px] leading-relaxed text-slate-700">
                <b className="block text-slate-900">Verified in 24–48 hours</b>
                You&rsquo;ll get an email once your lease is approved and your review is live.
              </div>
            </div>
          </div>

          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={`rounded-[16px] border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-teal bg-teal-50' :
              leaseFile ? 'border-teal bg-teal-50' :
              'border-slate-300 hover:border-slate-400'
            }`}
          >
            <input {...getInputProps()} />
            {leaseFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-6 w-6 text-teal" />
                <div className="text-left">
                  <p className="font-bold text-[14px] text-slate-900">{leaseFile.name}</p>
                  <p className="text-[12.5px] text-slate-500">{(leaseFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setLeaseFile(null) }} className="ml-2 text-slate-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">Drag & drop your lease here</p>
                <p className="text-[12.5px] text-slate-500 mt-1">or click to browse &middot; PDF, JPG, PNG, DOCX &middot; Max 10MB</p>
              </>
            )}
          </div>
          {leaseError && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />{leaseError}</p>}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between">
            <button type="button" onClick={() => setStep(0)} className="text-[13px] font-medium text-slate-500 hover:text-slate-700">&larr; Back</button>
            <div className="flex gap-2.5">
              {leaseFile && (
                <Button
                  className="rounded-full bg-teal px-6 hover:bg-teal-500 text-white"
                  onClick={handleLeaseUpload}
                  disabled={leaseStatus === 'uploading'}
                >
                  {leaseStatus === 'uploading' ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4 mr-2" /> Upload & Continue</>}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Review form */}
      {step === 2 && (
        <form onSubmit={async (e) => {
          e.preventDefault()
          if (leaseStatus !== 'uploaded') {
            toast.error('Upload your lease before continuing')
            return
          }
          // Validate review fields — not the confirmation checkboxes on step 3
          const valid = await trigger(['title', 'body', 'propertyAddress', 'ratingOverall', 'ratingResponsiveness', 'ratingMaintenance', 'ratingHonesty', 'ratingLeaseFairness', 'wouldRentAgain', 'rentalPeriodStart', 'rentalPeriodEnd'])
          if (valid) setStep(3)
        }}>
          <div className="rounded-[28px] border border-slate-200 bg-white p-9 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <Eyebrow tone="teal">Step 3 of 5 &middot; Rate & review</Eyebrow>
            <h1 className="mt-3.5 text-[clamp(28px,5.5vw,36px)] font-extrabold tracking-tight text-slate-900">Share your experience.</h1>
            <p className="mt-1.5 max-w-[600px] text-[14.5px] text-slate-500 mb-8">
              Your review is anonymous by default. Be specific — vague reviews get less trust. Mention dates, addresses, and documents where you can.
            </p>

            <div className="space-y-6">
              {/* Overall rating */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[13px] font-semibold text-slate-900">Overall rating <span className="text-red-600">*</span></span>
                </div>
                <StarRating value={ratingOverall} onChange={v => setValue('ratingOverall', v)} size="lg" showLabel />
                {errors.ratingOverall && <p className="text-xs text-red-600 mt-1">Please select a rating</p>}
              </div>

              {/* Property address */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[13px] font-semibold text-slate-900">Property address <span className="text-red-600">*</span></span>
                  <span className="text-[11.5px] text-slate-400">The address you rented at</span>
                </div>
                <Input {...register('propertyAddress')} placeholder="123 Main St, Apt 4B, Pittsburgh, PA" className="h-11 rounded-xl border-slate-200 text-[14px]" />
                {errors.propertyAddress && <p className="text-xs text-red-600 mt-1">{errors.propertyAddress.message}</p>}
              </div>

              {/* Title */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[13px] font-semibold text-slate-900">Headline <span className="text-red-600">*</span></span>
                  <span className="text-[11.5px] text-slate-400">A short, specific summary — like a subject line.</span>
                </div>
                <Input {...register('title')} placeholder="Summarize your experience" className="h-11 rounded-xl border-slate-200 text-[14px]" />
                <div className="mt-1.5 text-[11.5px] text-slate-400">{watch('title')?.length ?? 0} / 150 characters</div>
                {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
              </div>

              {/* Body */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[13px] font-semibold text-slate-900">Your full review <span className="text-red-600">*</span></span>
                  <span className="text-[11.5px] text-slate-400 max-w-[400px] text-right">Dates, documents, and specific interactions help other renters more than feelings.</span>
                </div>
                <Textarea
                  {...register('body')}
                  placeholder="Share your experience. What went well? What could have been better? Be specific."
                  rows={6}
                  className="rounded-xl border-slate-200 text-[14px] leading-relaxed resize-y"
                />
                <div className="mt-1.5 text-[11.5px] text-slate-400">{watch('body')?.length ?? 0} / 2000 characters</div>
                {errors.body && <p className="text-xs text-red-600 mt-1">{errors.body.message}</p>}
              </div>

              {/* Tenancy dates */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-[13px] font-semibold text-slate-900 mb-2 block">Move-in <span className="text-red-600">*</span></span>
                  <Input type="month" {...register('rentalPeriodStart')} className="h-11 rounded-xl border-slate-200 text-[14px]" />
                  {errors.rentalPeriodStart && <p className="text-xs text-red-600 mt-1">{errors.rentalPeriodStart.message}</p>}
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-slate-900 mb-2 block">Move-out <span className="text-red-600">*</span></span>
                  <Input type="month" {...register('rentalPeriodEnd')} className="h-11 rounded-xl border-slate-200 text-[14px]" disabled={watch('isCurrentTenant')} />
                  {errors.rentalPeriodEnd && <p className="text-xs text-red-600 mt-1">{errors.rentalPeriodEnd.message}</p>}
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register('isCurrentTenant')} className="rounded accent-teal" />
                    <span className="text-[13px] text-slate-700">I still rent here</span>
                  </label>
                </div>
              </div>

              {/* Would rent again */}
              <div>
                <span className="text-[13px] font-semibold text-slate-900 mb-2 block">Would you rent from them again? <span className="text-red-600">*</span></span>
                <div className="flex gap-2.5">
                  {(['yes', 'no', 'unsure'] as const).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setValue('wouldRentAgain', v)}
                      className={`rounded-full px-5 py-2.5 text-[13px] font-semibold border transition-colors capitalize ${
                        watch('wouldRentAgain') === v
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                {errors.wouldRentAgain && <p className="text-xs text-red-600 mt-1">{errors.wouldRentAgain.message}</p>}
              </div>

              {/* Sub-ratings */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'ratingResponsiveness', label: 'Responsiveness' },
                  { key: 'ratingMaintenance', label: 'Maintenance' },
                  { key: 'ratingHonesty', label: 'Honesty' },
                  { key: 'ratingLeaseFairness', label: 'Lease Fairness' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <span className="text-[13px] font-semibold text-slate-900 mb-1 block">{label} <span className="text-red-600">*</span></span>
                    <StarRating
                      value={watch(key as keyof ReviewFormData) as number ?? 0}
                      onChange={v => setValue(key as keyof ReviewFormData, v as never)}
                      size="sm"
                    />
                    {errors[key as keyof ReviewFormData] && <p className="text-xs text-red-600 mt-1">Please select a rating</p>}
                  </div>
                ))}
              </div>

              {/* Privacy box */}
              <div className="flex gap-3.5 rounded-[18px] border border-slate-200 bg-slate-50 p-[18px]">
                <Lock className="h-[18px] w-[18px] flex-shrink-0 text-teal" />
                <div className="text-[13px] leading-relaxed text-slate-700">
                  <b>Your review is anonymous.</b> We show &ldquo;Verified tenant&rdquo; — never your name, email, or lease details. Moderation review takes 24–48 hours.
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-7 flex items-center justify-between">
              <button type="button" onClick={() => setStep(1)} className="text-[13px] font-medium text-slate-500 hover:text-slate-700">&larr; Back</button>
              <Button type="submit" className="rounded-full bg-teal px-6 hover:bg-teal-500 text-white" disabled={leaseStatus !== 'uploaded'}>
                Continue to confirm <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-[28px] border border-slate-200 bg-white p-9 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <Eyebrow tone="teal">Step 4 of 5 &middot; Confirm & submit</Eyebrow>
            <h1 className="mt-3.5 text-[clamp(28px,5.5vw,36px)] font-extrabold tracking-tight text-slate-900">Almost there.</h1>
            <p className="mt-1.5 text-[14.5px] text-slate-500 mb-8">Review your submission below and confirm.</p>

            <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-5 text-[14px] text-slate-700 space-y-2 mb-6">
              <p><span className="font-semibold text-slate-900">Landlord:</span> {selectedLandlord?.display_name}</p>
              <p><span className="font-semibold text-slate-900">Address:</span> {watch('propertyAddress')}</p>
              <p><span className="font-semibold text-slate-900">Overall rating:</span> {watch('ratingOverall')}/5 stars</p>
              <p className="line-clamp-2"><span className="font-semibold text-slate-900">Headline:</span> &ldquo;{watch('title')}&rdquo;</p>
              <p><span className="font-semibold text-slate-900">Dates:</span> {watch('rentalPeriodStart')} — {watch('isCurrentTenant') ? 'Present' : watch('rentalPeriodEnd')}</p>
              <p><span className="font-semibold text-slate-900">Lease verification:</span> {leaseStatus === 'uploaded' ? '✓ Uploaded (pending founder review)' : 'Not provided'}</p>
            </div>

            <div className="space-y-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" {...register('confirmedGenuine')} className="mt-0.5 rounded accent-teal" />
                <span className="text-[13px] text-slate-700 leading-relaxed">
                  I confirm this review is based on my genuine experience as a tenant or former tenant of this landlord.
                </span>
              </label>
              {errors.confirmedGenuine && <p className="text-xs text-red-600 ml-6">{errors.confirmedGenuine.message}</p>}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" {...register('confirmedLiability')} className="mt-0.5 rounded accent-teal" />
                <span className="text-[13px] text-slate-700 leading-relaxed">
                  I understand that submitting a false or defamatory review may result in removal of my account and potential legal liability.
                </span>
              </label>
              {errors.confirmedLiability && <p className="text-xs text-red-600 ml-6">{errors.confirmedLiability.message}</p>}
            </div>

            <p className="text-[12px] text-slate-400 mb-7">
              This review is for informational purposes only and does not constitute a consumer report under the FCRA.
            </p>

            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setStep(2)} className="text-[13px] font-medium text-slate-500 hover:text-slate-700">&larr; Back</button>
              <Button type="submit" className="rounded-full bg-teal px-6 hover:bg-teal-500 text-white" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : <>Submit Review <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-9 shadow-[0_1px_2px_rgba(15,23,42,0.04)] text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
            <CheckCircle2 className="h-8 w-8 text-teal" />
          </div>
          <h1 className="text-[clamp(28px,5.5vw,36px)] font-extrabold tracking-tight text-slate-900">Review Submitted!</h1>
          <p className="mt-2 max-w-md mx-auto text-[14.5px] text-slate-500 leading-relaxed">
            Your review is under founder moderation. We typically approve reviews within 24–48 hours.
            You&apos;ll receive an email confirmation shortly.
          </p>
          <div className="flex gap-3 justify-center mt-8">
            <Button variant="outline" asChild className="rounded-full border-slate-200">
              <a href={selectedLandlord ? `/landlord/${selectedLandlord.slug}` : '/'}>
                View Landlord Profile
              </a>
            </Button>
            <Button className="rounded-full bg-teal hover:bg-teal-500 text-white" onClick={() => router.push('/')}>
              Back to Home
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

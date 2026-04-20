'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CheckCircle2, Upload, FileText, X, AlertTriangle,
  ArrowRight, ArrowLeft, Lock, Loader2, Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StarRating } from '@/components/review/StarRating'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { detectFileType, ALLOWED_LEASE_TYPES, MAX_LEASE_SIZE } from '@/lib/utils'
import { toast } from 'sonner'
import type { Landlord } from '@/types'

const reviewSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(150),
  body: z.string().min(50, 'Review must be at least 50 characters').max(2000),
  ratingOverall: z.number().min(1).max(5),
  ratingResponsiveness: z.number().min(1).max(5).optional(),
  ratingMaintenance: z.number().min(1).max(5).optional(),
  ratingHonesty: z.number().min(1).max(5).optional(),
  ratingLeaseFairness: z.number().min(1).max(5).optional(),
  wouldRentAgain: z.enum(['yes', 'no', 'unsure']).optional(),
  rentalPeriodStart: z.string().optional(),
  rentalPeriodEnd: z.string().optional(),
  isCurrentTenant: z.boolean().default(false),
  confirmedGenuine: z.literal(true, { errorMap: () => ({ message: 'You must confirm this is your genuine experience' }) }),
  confirmedLiability: z.literal(true, { errorMap: () => ({ message: 'You must agree to the terms' }) }),
})

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

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { ratingOverall: 0, isCurrentTenant: false },
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
      if (uploadError) throw uploadError

      // Call verify endpoint
      const res = await fetch('/api/verify-lease', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: path, fileName: leaseFile.name, fileSize: leaseFile.size }),
      })
      if (!res.ok) throw new Error('Verification failed')
      const payload = await res.json()
      setUploadedLease({
        docPath: payload.docPath,
        filename: payload.filename,
        fileSize: payload.fileSize,
      })
      setLeaseStatus('uploaded')
      toast.success('Lease uploaded — pending founder verification')
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
      if (!res.ok) throw new Error('Submission failed')
      setStep(4)
    } catch (err) {
      toast.error('Failed to submit review. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const ratingOverall = watch('ratingOverall')

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span className="font-medium text-navy-600">{STEPS[step]}</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
      </div>

      {/* Step 0: Find landlord */}
      {step === 0 && (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Who was your landlord?</h1>
          <p className="text-gray-500 text-sm mb-6">Search by name, management company, or address</p>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search landlords..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); searchLandlords(e.target.value) }}
            />
          </div>
          {searching && <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" /></div>}
          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {searchResults.map((l: Landlord) => (
                <button
                  key={l.id}
                  className="w-full text-left px-4 py-3 hover:bg-navy-50 border-b last:border-0 flex items-center justify-between"
                  onClick={() => { setSelectedLandlord(l); setStep(1) }}
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{l.display_name}</p>
                    {l.city && <p className="text-xs text-gray-500">{l.city}, {l.state_abbr}</p>}
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <div className="text-center py-8 border border-gray-200 rounded-xl bg-gray-50">
              <p className="text-sm text-gray-600 font-medium">Landlord not found</p>
              <p className="text-xs text-gray-400 mt-1">Submit them so we can add them to our database</p>
              <Button size="sm" className="mt-3 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
                router.push(`/add-landlord?name=${encodeURIComponent(searchQuery)}`)
              }}>
                Add &ldquo;{searchQuery}&rdquo; as a new landlord
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Lease verification */}
      {step === 1 && selectedLandlord && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Lock className="h-5 w-5 text-teal-600" />
            <h1 className="text-2xl font-bold text-gray-900">Verify your lease</h1>
          </div>
          <p className="text-sm text-gray-600 mb-1">
            Reviewing: <strong>{selectedLandlord.display_name}</strong>
          </p>
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-6 text-sm text-teal-800">
            <strong>Your privacy is protected.</strong> A lease is required for publication. It is stored privately, reviewed only by the Vett founders, never shown publicly, and used only to confirm tenancy before approval.
          </div>

          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-navy-400 bg-navy-50' :
              leaseFile ? 'border-teal-400 bg-teal-50' :
              'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            {leaseFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-6 w-6 text-teal-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 text-sm">{leaseFile.name}</p>
                  <p className="text-xs text-gray-500">{(leaseFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setLeaseFile(null) }} className="ml-2 text-gray-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="font-medium text-gray-700">Drag & drop your lease here</p>
                <p className="text-xs text-gray-500 mt-1">or click to browse · PDF, JPG, PNG, DOCX · Max 10MB</p>
              </>
            )}
          </div>
          {leaseError && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />{leaseError}</p>}

          <div className="mt-4 flex flex-col gap-3">
            {leaseFile && (
              <Button
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                onClick={handleLeaseUpload}
                disabled={leaseStatus === 'uploading'}
              >
                {leaseStatus === 'uploading' ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4 mr-2" /> Upload & Continue</>}
              </Button>
            )}
            <p className="text-xs text-gray-400 text-center">
              Lease verification is required before a review can be published.
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Review form */}
      {step === 2 && (
        <form onSubmit={handleSubmit(() => {
          if (leaseStatus !== 'uploaded') {
            toast.error('Upload your lease before continuing')
            return
          }
          setStep(3)
        })}>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Write your review</h1>
          {leaseStatus === 'uploaded' && (
            <div className="flex items-center gap-1.5 text-teal-700 text-xs mb-4 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5" /> Lease uploaded — pending verification
            </div>
          )}
          <div className="space-y-5">
            {/* Rental period */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Move-in date</Label>
                <Input type="month" {...register('rentalPeriodStart')} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Move-out date</Label>
                <Input type="month" {...register('rentalPeriodEnd')} className="mt-1" disabled={watch('isCurrentTenant')} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="current" {...register('isCurrentTenant')} className="rounded" />
              <label htmlFor="current" className="text-sm text-gray-700">I currently rent from this landlord</label>
            </div>

            {/* Overall rating */}
            <div>
              <Label className="text-sm font-semibold">Overall Rating *</Label>
              <div className="mt-2">
                <StarRating
                  value={ratingOverall}
                  onChange={v => setValue('ratingOverall', v)}
                  size="lg"
                  showLabel
                />
              </div>
              {errors.ratingOverall && <p className="text-xs text-red-600 mt-1">Please select a rating</p>}
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
                  <Label className="text-xs text-gray-600">{label}</Label>
                  <div className="mt-1">
                    <StarRating
                      value={watch(key as keyof ReviewFormData) as number ?? 0}
                      onChange={v => setValue(key as keyof ReviewFormData, v as never)}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Would rent again */}
            <div>
              <Label className="text-sm font-semibold">Would you rent from this landlord again?</Label>
              <div className="flex gap-3 mt-2">
                {(['yes', 'no', 'unsure'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setValue('wouldRentAgain', v)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors capitalize ${
                      watch('wouldRentAgain') === v
                        ? v === 'yes' ? 'bg-teal-600 text-white border-teal-600'
                        : v === 'no' ? 'bg-red-600 text-white border-red-600'
                        : 'bg-gray-600 text-white border-gray-600'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-sm font-semibold">Review Title *</Label>
              <Input id="title" {...register('title')} placeholder="Summarize your experience" className="mt-1" />
              {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
            </div>

            {/* Body */}
            <div>
              <Label htmlFor="body" className="text-sm font-semibold">Your Review *</Label>
              <Textarea
                id="body"
                {...register('body')}
                placeholder="Share your experience. What went well? What could have been better? Be specific."
                rows={6}
                className="mt-1 resize-none"
              />
              <div className="flex justify-between mt-1">
                {errors.body && <p className="text-xs text-red-600">{errors.body.message}</p>}
                <p className="text-xs text-gray-400 ml-auto">{watch('body')?.length ?? 0}/2000</p>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Do not include other tenants&apos; names, personal information, or anything that could identify you.
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" disabled={!ratingOverall || leaseStatus !== 'uploaded'}>
              Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </form>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Confirm & Submit</h1>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-sm space-y-2">
              <p><span className="font-medium">Landlord:</span> {selectedLandlord?.display_name}</p>
              <p><span className="font-medium">Overall rating:</span> {watch('ratingOverall')}/5 stars</p>
              <p className="line-clamp-2"><span className="font-medium">Review:</span> &ldquo;{watch('title')}&rdquo;</p>
              <p><span className="font-medium">Lease verification:</span> {leaseStatus === 'uploaded' ? '✓ Uploaded (pending founder review)' : 'Not provided'}</p>
            </div>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" {...register('confirmedGenuine')} className="mt-0.5 rounded" />
                <span className="text-sm text-gray-700">
                  I confirm this review is based on my genuine experience as a tenant or former tenant of this landlord.
                </span>
              </label>
              {errors.confirmedGenuine && <p className="text-xs text-red-600">{errors.confirmedGenuine.message}</p>}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" {...register('confirmedLiability')} className="mt-0.5 rounded" />
                <span className="text-sm text-gray-700">
                  I understand that submitting a false or defamatory review may result in removal of my account and potential legal liability.
                </span>
              </label>
              {errors.confirmedLiability && <p className="text-xs text-red-600">{errors.confirmedLiability.message}</p>}
            </div>
            <p className="text-xs text-gray-400">
              This review is for informational purposes only and does not constitute a consumer report under the FCRA.
            </p>
          </div>
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : 'Submit Review'}
            </Button>
          </div>
        </form>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <div className="text-center py-8">
          <div className="h-16 w-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Review Submitted!</h1>
          <p className="text-gray-600 mt-2 max-w-md mx-auto">
            Your review is under founder moderation. We typically approve reviews within 24–48 hours.
            You&apos;ll receive an email confirmation shortly.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button variant="outline" asChild>
              <a href={selectedLandlord ? `/landlord/${selectedLandlord.slug}` : '/'}>
                View Landlord Profile
              </a>
            </Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => router.push('/')}>
              Back to Home
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

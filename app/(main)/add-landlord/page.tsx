'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'
import { Building2, ArrowLeft, CheckCircle2, Upload, FileText, X, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
  ['DC','Washington D.C.'],
]

const MAX_PROOF_SIZE = 10 * 1024 * 1024 // 10MB

export default function AddLandlordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [submitted, setSubmitted] = useState(false)
  const [existingSlug, setExistingSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofError, setProofError] = useState<string | null>(null)
  const [form, setForm] = useState({
    display_name: '',
    business_name: '',
    city: '',
    state_abbr: '',
    zip: '',
    website: '',
    phone: '',
    notes: '',
  })

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  const onDrop = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    setProofError(null)
    if (file.size > MAX_PROOF_SIZE) { setProofError('File too large. Max 10MB.'); return }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext ?? '')) {
      setProofError('Unsupported file type. Upload PDF, JPG, or PNG.')
      return
    }
    setProofFile(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.display_name.trim()) { toast.error('Landlord name is required'); return }

    setLoading(true)
    try {
      let proofDocUrl: string | null = null

      // Upload proof doc if provided
      if (proofFile) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { toast.error('Please sign in to submit'); router.push('/login?redirectTo=/add-landlord'); return }
        const ext = proofFile.name.split('.').pop()
        const path = `submissions/${user.id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('landlord-verification-docs')
          .upload(path, proofFile, { upsert: false })
        if (uploadErr) throw uploadErr
        proofDocUrl = path
      }

      const res = await fetch('/api/landlords/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, proof_doc_url: proofDocUrl }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) { toast.error('Please sign in to submit'); router.push('/login?redirectTo=/add-landlord'); return }
        toast.error(data.error ?? 'Submission failed')
        return
      }

      if (data.exists) { setExistingSlug(data.slug); return }
      if (data.pending) { toast.info('You already submitted this landlord — it\'s pending review'); return }
      setSubmitted(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (existingSlug) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="h-16 w-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">This landlord already exists!</h1>
        <p className="text-gray-600 mb-6">We found a matching profile. View it or leave your review directly.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white">
            <Link href={`/landlord/${existingSlug}`}>View Profile</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/landlord/${existingSlug}#reviews`}>Write a Review</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="h-16 w-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Submission received!</h1>
        <p className="text-gray-600 mb-2">Our founders will review and add this landlord to Vett within 1–2 business days.</p>
        <p className="text-sm text-gray-500 mb-8">Once approved, you&apos;ll be able to write a review.</p>
        <div className="flex gap-3 justify-center">
          <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white">
            <Link href="/">Back to Home</Link>
          </Button>
          <Button variant="outline" onClick={() => setSubmitted(false)}>Submit Another</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <div className="h-10 w-10 bg-navy-100 rounded-xl flex items-center justify-center">
          <Building2 className="h-5 w-5 text-navy-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Add a Missing Landlord</h1>
      </div>
      <p className="text-gray-500 mb-8">
        Can&apos;t find your landlord? Submit their info and we&apos;ll add them to Vett so you and others can leave reviews.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="display_name" className="text-sm font-medium">
            Landlord / Property Management Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="display_name"
            placeholder="e.g. John Smith or Oakwood Properties LLC"
            value={form.display_name}
            onChange={set('display_name')}
            className="mt-1.5"
            required
          />
        </div>

        <div>
          <Label htmlFor="business_name" className="text-sm font-medium">Business / LLC Name (if different)</Label>
          <Input
            id="business_name"
            placeholder="e.g. Oakwood Properties LLC"
            value={form.business_name}
            onChange={set('business_name')}
            className="mt-1.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city" className="text-sm font-medium">City</Label>
            <Input id="city" placeholder="Baltimore" value={form.city} onChange={set('city')} className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">State</Label>
            <Select value={form.state_abbr} onValueChange={v => setForm(prev => ({ ...prev, state_abbr: v ?? '' }))}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map(([abbr, name]) => (
                  <SelectItem key={abbr} value={abbr}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone" className="text-sm font-medium">Phone (optional)</Label>
            <Input id="phone" placeholder="(410) 555-0100" value={form.phone} onChange={set('phone')} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="website" className="text-sm font-medium">Website (optional)</Label>
            <Input id="website" placeholder="https://..." value={form.website} onChange={set('website')} className="mt-1.5" />
          </div>
        </div>

        {/* Proof of ownership upload */}
        <div>
          <Label className="text-sm font-medium">
            Proof of Property Ownership
            <span className="ml-1.5 text-xs font-normal text-gray-500">(optional but speeds up approval)</span>
          </Label>
          <div className="mt-1.5 flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Upload a lease, deed, property tax record, or utility bill showing the landlord&apos;s name and property address. Reviewed by Vett founders and moderators only — never shared publicly.</span>
          </div>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-navy-400 bg-navy-50' :
              proofFile ? 'border-teal-400 bg-teal-50' :
              'border-gray-200 hover:border-gray-300 bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            {proofFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-5 w-5 text-teal-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 text-sm">{proofFile.name}</p>
                  <p className="text-xs text-gray-500">{(proofFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setProofFile(null) }}
                  className="ml-2 text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Drag & drop or click to upload</p>
                <p className="text-xs text-gray-400 mt-0.5">PDF, JPG, PNG · Max 10MB</p>
              </>
            )}
          </div>
          {proofError && <p className="mt-1.5 text-sm text-red-600">{proofError}</p>}
        </div>

        <div>
          <Label htmlFor="notes" className="text-sm font-medium">Additional Info (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any extra context — property address, management company, how you know them, etc."
            value={form.notes}
            onChange={set('notes')}
            rows={3}
            className="mt-1.5 text-sm"
          />
        </div>

        <div className="pt-1">
          <Button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            disabled={loading}
          >
            {loading ? 'Submitting…' : 'Submit Landlord'}
          </Button>
          <p className="text-xs text-gray-400 text-center mt-3">
            Submissions are reviewed by our founders within 1–2 business days. We check for duplicates and verify basic info.
          </p>
        </div>
      </form>
    </div>
  )
}

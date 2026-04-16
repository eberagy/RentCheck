'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

export default function AddLandlordPage() {
  const router = useRouter()
  const [submitted, setSubmitted] = useState(false)
  const [existingSlug, setExistingSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.display_name.trim()) { toast.error('Landlord name is required'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/landlords/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) { toast.error('Please sign in to submit'); router.push('/login?redirectTo=/add-landlord'); return }
        toast.error(data.error ?? 'Submission failed')
        return
      }

      if (data.exists) {
        setExistingSlug(data.slug)
        return
      }
      if (data.pending) {
        toast.info('You already submitted this landlord — it\'s pending review')
        return
      }

      setSubmitted(true)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (existingSlug) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-teal-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">This landlord already exists!</h1>
        <p className="text-gray-600 mb-6">We found a matching landlord profile. View it to see reviews, or write your own.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button asChild className="bg-navy-500 hover:bg-navy-600 text-white">
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
        <CheckCircle2 className="h-12 w-12 text-teal-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Submission received!</h1>
        <p className="text-gray-600 mb-2">Our team will review and add this landlord to RentCheck within 1–2 business days.</p>
        <p className="text-sm text-gray-500 mb-8">Once approved, you'll be able to write a review and others can search for them.</p>
        <div className="flex gap-3 justify-center">
          <Button asChild className="bg-navy-500 hover:bg-navy-600 text-white">
            <Link href="/">Back to Home</Link>
          </Button>
          <Button asChild variant="outline" onClick={() => setSubmitted(false)}>
            <span className="cursor-pointer">Submit Another</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 bg-navy-100 rounded-xl flex items-center justify-center">
          <Building2 className="h-5 w-5 text-navy-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Add a Missing Landlord</h1>
      </div>
      <p className="text-gray-500 mb-8">
        Can't find your landlord? Submit their info and we'll add them to RentCheck so you and others can leave reviews.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-200 rounded-xl p-6">
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

        <div>
          <Label htmlFor="notes" className="text-sm font-medium">Additional Info (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any extra context that might help us verify — property address, management company, etc."
            value={form.notes}
            onChange={set('notes')}
            rows={3}
            className="mt-1.5 text-sm"
          />
        </div>

        <div className="pt-1">
          <Button
            type="submit"
            className="w-full bg-navy-500 hover:bg-navy-600 text-white font-semibold"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Landlord'}
          </Button>
          <p className="text-xs text-gray-400 text-center mt-3">
            Submissions are reviewed by our team before being added. We check for duplicates and verify basic info.
          </p>
        </div>
      </form>
    </div>
  )
}

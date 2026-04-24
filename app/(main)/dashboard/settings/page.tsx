'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Save, Loader2, User, Bell, Lock, Download, Trash2, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  email_reviews: boolean
  email_watchlist: boolean
  public_profile?: boolean
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [emailReviews, setEmailReviews] = useState(true)
  const [emailWatchlist, setEmailWatchlist] = useState(true)
  const [publicProfile, setPublicProfile] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login?redirectTo=/dashboard/settings'; return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data as Profile)
        setName(data.full_name ?? '')
        setEmailReviews(data.email_reviews ?? true)
        setEmailWatchlist(data.email_watchlist ?? true)
        setPublicProfile(data.public_profile ?? false)
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  async function uploadAvatar(file: File) {
    if (!profile) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    setUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/me/avatar', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setProfile(prev => prev ? { ...prev, avatar_url: json.avatarUrl } : prev)
      toast.success('Photo updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function removeAvatar() {
    if (!profile?.avatar_url) return
    setUploadingAvatar(true)
    try {
      const res = await fetch('/api/me/avatar', { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not remove photo')
      setProfile(prev => prev ? { ...prev, avatar_url: null } : prev)
      toast.success('Photo removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove photo')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: name.trim() || null,
        email_reviews: emailReviews,
        email_watchlist: emailWatchlist,
        public_profile: publicProfile,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to save changes')
    } else {
      toast.success('Settings saved')
      setProfile(prev => prev ? {
        ...prev,
        full_name: name.trim() || null,
        email_reviews: emailReviews,
        email_watchlist: emailWatchlist,
        public_profile: publicProfile,
      } : prev)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-navy-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <h1 className="font-display text-[clamp(1.9rem,4vw,2.75rem)] leading-[1.08] tracking-tight text-slate-900 mb-2">Account Settings</h1>
      <p className="text-slate-500 text-[14.5px] mb-8">Manage your profile and notification preferences</p>

      <div className="bg-white border border-gray-200 rounded-xl divide-y">
        {/* Profile section */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Profile</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Profile photo</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="Your avatar"
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-gray-400">
                      {(name || profile?.email || '?').trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) void uploadAvatar(f)
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingAvatar ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4 mr-1.5" /> {profile?.avatar_url ? 'Change photo' : 'Upload photo'}</>}
                    </Button>
                    {profile?.avatar_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={uploadingAvatar}
                        onClick={removeAvatar}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <X className="h-4 w-4 mr-1.5" /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">JPEG, PNG, WebP, or HEIC. Up to 5 MB. We crop to a square.</p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="name" className="text-sm font-medium">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name (shown on reviews)"
                className="mt-1.5"
                maxLength={100}
              />
              <p className="text-xs text-gray-400 mt-1">This name appears on your reviews. Leave blank to stay anonymous.</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Email Address</Label>
              <Input
                value={profile?.email ?? ''}
                disabled
                className="mt-1.5 bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">Email is managed through your Google account and cannot be changed here.</p>
            </div>
          </div>
        </div>

        {/* Notifications section */}
        <div id="email-preferences" className="p-6 scroll-mt-24">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Email Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Review status updates</p>
                <p className="text-xs text-gray-500">Get notified when your reviews are approved or rejected</p>
              </div>
              <Switch
                checked={emailReviews}
                onCheckedChange={setEmailReviews}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Watchlist alerts</p>
                <p className="text-xs text-gray-500">Get notified when landlords on your watchlist get new reviews or violations</p>
              </div>
              <Switch
                checked={emailWatchlist}
                onCheckedChange={setEmailWatchlist}
              />
            </div>
          </div>
        </div>

        {/* Public profile toggle */}
        <div id="public-profile" className="p-6 border-t border-gray-100 scroll-mt-24">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Public profile</h2>
          </div>
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <p className="text-sm font-medium text-gray-900">Share my published reviews</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Opt-in. Turns on a public page at{' '}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px] text-gray-700">
                  /u/{profile?.id?.slice(0, 8) ?? '…'}
                </code>{' '}
                showing only your <strong>approved</strong> reviews. Your email is never shown.
              </p>
              {publicProfile && profile && (
                <p className="mt-2 text-[12px]">
                  Share link:{' '}
                  <Link href={`/u/${profile.id}`} className="text-teal-700 hover:underline break-all">
                    vettrentals.com/u/{profile.id}
                  </Link>
                </p>
              )}
            </div>
            <Switch checked={publicProfile} onCheckedChange={setPublicProfile} />
          </div>
        </div>

        {/* Save button */}
        <div className="p-6">
          <Button
            onClick={saveProfile}
            className="bg-teal-600 hover:bg-teal-700 text-white"
            disabled={saving}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Save Changes</>
            )}
          </Button>
        </div>
      </div>

      {/* Password section */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-4 w-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Change Password</h2>
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 8 characters)"
              className="mt-1.5"
              minLength={8}
            />
          </div>
          <Button
            onClick={async () => {
              if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
              setSavingPassword(true)
              const { error } = await supabase.auth.updateUser({ password: newPassword })
              setSavingPassword(false)
              if (error) toast.error(error.message)
              else { toast.success('Password updated'); setNewPassword('') }
            }}
            variant="outline"
            disabled={savingPassword || newPassword.length < 8}
            className="text-sm"
          >
            {savingPassword ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating...</> : 'Update Password'}
          </Button>
        </div>
      </div>

      {/* Data + account control */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <Download className="h-4 w-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Download your data</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Export every row Vett stores about you (profile, reviews, watchlist, submissions, disputes) as a JSON file.
        </p>
        <Button variant="outline" asChild>
          <a href="/api/me/export" download>
            <Download className="h-4 w-4 mr-2" /> Download data
          </a>
        </Button>
      </div>

      <AccountDeleteSection />
    </div>
  )
}

function AccountDeleteSection() {
  const router = useRouter()
  const [confirm, setConfirm] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (confirm !== 'DELETE MY ACCOUNT') return
    setDeleting(true)
    try {
      const res = await fetch('/api/me/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to delete account')
      }
      toast.success('Account deleted.')
      router.push('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account')
      setDeleting(false)
    }
  }

  return (
    <div className="mt-8 bg-white border border-red-200 rounded-xl p-6">
      <h2 className="font-semibold text-red-700 mb-1">Delete account</h2>
      <p className="text-sm text-gray-500 mb-4">
        Permanently deletes your profile, watchlist, submissions, and stored documents.
        Your published reviews stay visible but are disassociated from you.
      </p>
      {!expanded ? (
        <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => setExpanded(true)}>
          <Trash2 className="h-4 w-4 mr-2" /> Start deletion
        </Button>
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor="confirm-delete" className="text-sm font-medium text-red-700">
              Type <span className="font-mono font-bold">DELETE MY ACCOUNT</span> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-red-300 bg-red-600 text-white hover:bg-red-700 hover:text-white hover:border-red-700"
              onClick={handleDelete}
              disabled={deleting || confirm !== 'DELETE MY ACCOUNT'}
            >
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…</> : <>Confirm delete</>}
            </Button>
            <Button variant="outline" onClick={() => { setExpanded(false); setConfirm('') }} disabled={deleting}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

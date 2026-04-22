'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, User, Bell, Lock } from 'lucide-react'
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
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [emailReviews, setEmailReviews] = useState(true)
  const [emailWatchlist, setEmailWatchlist] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
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
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: name.trim() || null,
        email_reviews: emailReviews,
        email_watchlist: emailWatchlist,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to save changes')
    } else {
      toast.success('Settings saved')
      setProfile(prev => prev ? { ...prev, full_name: name.trim() || null, email_reviews: emailReviews, email_watchlist: emailWatchlist } : prev)
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

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Account Settings</h1>
      <p className="text-gray-500 text-sm mb-8">Manage your profile and notification preferences</p>

      <div className="bg-white border border-gray-200 rounded-xl divide-y">
        {/* Profile section */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Profile</h2>
          </div>

          <div className="space-y-4">
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
        <div className="p-6">
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

      {/* Danger zone */}
      <div className="mt-8 bg-white border border-red-200 rounded-xl p-6">
        <h2 className="font-semibold text-red-700 mb-1">Delete Account</h2>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete your account and all your reviews. This cannot be undone.
          Please email <a href="mailto:support@vettrentals.com" className="text-navy-600 hover:underline">support@vettrentals.com</a> to request account deletion.
        </p>
      </div>
    </div>
  )
}

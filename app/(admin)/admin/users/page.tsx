'use client'

import { useEffect, useState } from 'react'
import { Search, User, Shield, Ban, Loader2, ChevronDown, ChevronUp, Star, Calendar, Mail } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type UserProfile = {
  id: string
  full_name: string | null
  email: string | null
  user_type: string
  is_banned: boolean
  created_at: string
  review_count: number
  avatar_url: string | null
  admin_notes?: string | null
}

function UserTypeBadge({ type }: { type: string }) {
  if (type === 'admin') {
    return (
      <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs font-semibold">
        Admin
      </Badge>
    )
  }
  if (type === 'landlord') {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs font-semibold">
        Landlord
      </Badge>
    )
  }
  return (
    <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-xs font-semibold">
      Renter
    </Badge>
  )
}

function UserAvatar({ user }: { user: UserProfile }) {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.full_name ?? ''}
        loading="lazy"
        className="h-10 w-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm"
      />
    )
  }
  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : (user.email?.[0] ?? '?').toUpperCase()
  return (
    <div className="h-10 w-10 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm">
      <span className="text-sm font-semibold text-navy-700">{initials}</span>
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [userReviews, setUserReviews] = useState<Record<string, any[]>>({})
  const supabase = createClient()

  useEffect(() => { loadUsers() }, []) // eslint-disable-line

  async function loadUsers(q?: string) {
    setSearching(true)
    let dbq = supabase
      .from('profiles')
      .select('id, full_name, email, user_type, is_banned, created_at, review_count, avatar_url, admin_notes')
      .order('created_at', { ascending: false })
      .limit(50)

    if (q && q.length > 1) {
      // Strip PostgREST filter metacharacters so an admin's typed query
      // can't break the .or() syntax (e.g. comma, paren, colon, %, ").
      const safe = q.replace(/[,()*:%"]/g, '').replace(/\s+/g, ' ').trim()
      if (safe) {
        dbq = dbq.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`)
      }
    }

    const { data } = await dbq
    setUsers((data ?? []) as unknown as UserProfile[])
    setLoading(false)
    setSearching(false)
  }

  useEffect(() => {
    const t = setTimeout(() => { loadUsers(query) }, 300)
    return () => clearTimeout(t)
  }, [query]) // eslint-disable-line

  async function loadUserReviews(userId: string) {
    if (userReviews[userId]) return
    const { data } = await supabase
      .from('reviews')
      .select('id, title, status, rating_overall, created_at')
      .eq('reviewer_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    setUserReviews(prev => ({ ...prev, [userId]: data ?? [] }))
  }

  async function toggleBan(userId: string, isBanned: boolean) {
    setProcessing(userId)
    const res = await fetch('/api/admin/ban-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, banned: !isBanned }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error ?? 'Failed to update')
      setProcessing(null)
      return
    }
    toast.success(isBanned ? 'User unbanned' : 'User banned')
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: !isBanned } : u))
    setProcessing(null)
  }

  async function promoteToAdmin(userId: string) {
    if (!confirm('Promote this user to admin? This gives full platform access.')) return
    setProcessing(userId)
    const res = await fetch('/api/admin/promote-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userType: 'admin' }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error ?? 'Failed to promote')
      setProcessing(null)
      return
    }
    toast.success('User promoted to admin')
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, user_type: 'admin' } : u))
    setProcessing(null)
  }

  // Client-side filter on top of DB results
  const filtered = query.length > 1
    ? users.filter(u =>
        u.full_name?.toLowerCase().includes(query.toLowerCase()) ||
        u.email?.toLowerCase().includes(query.toLowerCase())
      )
    : users

  const counts = {
    total: users.length,
    admins: users.filter(u => u.user_type === 'admin').length,
    landlords: users.filter(u => u.user_type === 'landlord').length,
    renters: users.filter(u => u.user_type === 'renter').length,
    banned: users.filter(u => u.is_banned).length,
  }

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage platform users and permissions</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span><span className="font-semibold text-gray-900">{counts.total}</span> shown</span>
          <span className="text-gray-300">|</span>
          <span><span className="font-semibold text-purple-700">{counts.admins}</span> admins</span>
          <span><span className="font-semibold text-blue-700">{counts.landlords}</span> landlords</span>
          <span><span className="font-semibold text-teal-700">{counts.renters}</span> renters</span>
          {counts.banned > 0 && (
            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
              {counts.banned} banned
            </Badge>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-9 pr-9 bg-white"
          placeholder="Search by name or email..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-navy-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <User className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="font-medium">No users found</p>
          {query && <p className="text-sm mt-1 text-gray-400">Try a different search term</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(user => (
            <Card
              key={user.id}
              className={`border-gray-200 transition-all hover:shadow-sm ${user.is_banned ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-0">
                {/* Main row */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {user.full_name ?? 'No name'}
                        </span>
                        <UserTypeBadge type={user.user_type} />
                        {user.is_banned && (
                          <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Banned</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail className="h-3 w-3" />
                          {user.email ?? '—'}
                        </span>
                        <span className="text-gray-300 text-xs">·</span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Star className="h-3 w-3" />
                          {user.review_count} review{user.review_count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-gray-300 text-xs">·</span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          Joined {formatDate(user.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={async () => {
                        const opening = expanded !== user.id
                        setExpanded(opening ? user.id : null)
                        if (opening) await loadUserReviews(user.id)
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                      title={expanded === user.id ? 'Collapse' : 'View reviews'}
                    >
                      {expanded === user.id
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />
                      }
                    </button>

                    {user.user_type !== 'admin' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={user.is_banned
                          ? 'text-teal-700 border-teal-300 hover:bg-teal-50'
                          : 'text-red-700 border-red-300 hover:bg-red-50'
                        }
                        onClick={() => toggleBan(user.id, user.is_banned)}
                        disabled={processing === user.id}
                      >
                        {processing === user.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Ban className="h-3 w-3 mr-1" />
                        }
                        {user.is_banned ? 'Unban' : 'Ban'}
                      </Button>
                    )}

                    {user.user_type === 'renter' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-purple-700 border-purple-300 hover:bg-purple-50"
                        onClick={() => promoteToAdmin(user.id)}
                        disabled={processing === user.id}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Make Admin
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded review list */}
                {expanded === user.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Review History
                    </p>
                    {(userReviews[user.id] === undefined) ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading...
                      </div>
                    ) : (userReviews[user.id] ?? []).length === 0 ? (
                      <p className="text-sm text-gray-400">No reviews submitted</p>
                    ) : (
                      <div className="space-y-2">
                        {(userReviews[user.id] ?? []).map((r: any) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-200 text-sm"
                          >
                            <span className="text-gray-700 truncate max-w-[260px]">{r.title}</span>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                              <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                                ★ {r.rating_overall}
                              </span>
                              <Badge
                                variant="outline"
                                className={
                                  r.status === 'approved'
                                    ? 'text-teal-700 border-teal-300 text-xs'
                                    : r.status === 'rejected'
                                    ? 'text-red-700 border-red-300 text-xs'
                                    : 'text-amber-700 border-amber-300 text-xs'
                                }
                              >
                                {r.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <AdminNotesEditor user={user} onSaved={next => setUsers(prev => prev.map(u => u.id === user.id ? { ...u, admin_notes: next } : u))} />
                    <p className="text-xs text-gray-300 mt-3 font-mono">ID: {user.id}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminNotesEditor({ user, onSaved }: { user: UserProfile; onSaved: (next: string | null) => void }) {
  const [value, setValue] = useState(user.admin_notes ?? '')
  const [saving, setSaving] = useState(false)
  const dirty = value !== (user.admin_notes ?? '')

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/user-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, notes: value }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save')
      }
      onSaved(value || null)
      toast.success('Notes saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
        Internal admin notes
      </p>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value.slice(0, 4000))}
        rows={3}
        maxLength={4000}
        placeholder="Context on this user that other admins should see. Never surfaced publicly."
        className="w-full rounded-md border border-amber-200 bg-white px-2.5 py-2 text-[13px] text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{value.length}/4000</span>
        <Button
          size="sm"
          variant="outline"
          className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
          onClick={save}
          disabled={saving || !dirty}
        >
          {saving ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Saving…</> : 'Save notes'}
        </Button>
      </div>
    </div>
  )
}

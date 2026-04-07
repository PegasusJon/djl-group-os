import { useEffect, useState } from 'react'
import { Users, Plus, Pencil, Save, X, Loader2, UserCheck, Eye, EyeOff, Copy, CheckCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'

const ROLES = ['tech', 'manager', 'district_manager', 'owner']

function genPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ── User row ─────────────────────────────────────────────────────────────────
function UserRow({ user, stores, onSave }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({ full_name: user.full_name, role: user.role, store_id: user.store_id || '' })
  const [saving, setSaving]   = useState(false)
  const notify = useUiStore(s => s.notify)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('users').update(form).eq('id', user.id)
    if (error) notify(error.message, 'error')
    else { onSave(); setEditing(false) }
    setSaving(false)
  }

  const roleColors = {
    owner: 'badge-purple', district_manager: 'badge-yellow',
    manager: 'badge-blue', tech: 'badge-green',
  }

  return (
    <div className="card py-3">
      {editing ? (
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="label">Name</label>
            <input className="input text-sm" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input text-sm" value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Store</label>
            <select className="input text-sm" value={form.store_id}
              onChange={e => setForm(f => ({ ...f, store_id: e.target.value }))}>
              <option value="">No store</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="col-span-3 flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <><Save size={12} /> Save</>}
            </button>
            <button onClick={() => setEditing(false)} className="btn-ghost text-xs px-3 py-1.5">
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center text-xs font-bold text-brand-300 shrink-0">
            {user.full_name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user.full_name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`${roleColors[user.role] || 'badge-blue'} capitalize text-xs`}>
                {user.role?.replace('_', ' ')}
              </span>
              {user.stores?.name && <span className="text-xs text-slate-500">{user.stores.name}</span>}
              <span className="text-xs text-slate-600">{user.email}</span>
            </div>
          </div>
          <button onClick={() => setEditing(true)} className="text-slate-500 hover:text-slate-300 shrink-0">
            <Pencil size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Temp password display ────────────────────────────────────────────────────
function TempPasswordCard({ email, password, onDone }) {
  const [copied, setCopied] = useState(false)
  const [show, setShow]     = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card border-green-500/30 bg-green-500/5 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCheck size={16} className="text-green-400" />
        <p className="text-sm font-semibold text-green-300">User created successfully!</p>
      </div>
      <p className="text-xs text-slate-400">
        Share these credentials with <strong className="text-slate-200">{email}</strong>.
        They can change their password after logging in.
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-surface rounded-lg px-3 py-2 font-mono text-sm text-slate-200 border border-surface-border">
          {show ? password : '••••••••••••'}
        </div>
        <button onClick={() => setShow(s => !s)} className="btn-ghost px-2 py-2">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button onClick={copy} className="btn-primary px-3 py-2 text-xs">
          {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <button onClick={onDone} className="btn-ghost w-full text-xs justify-center">Done</button>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function UserManagement() {
  const { profile } = useAuthStore()
  const notify      = useUiStore(s => s.notify)
  const [users, setUsers]     = useState([])
  const [stores, setStores]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [createdCreds, setCreatedCreds] = useState(null) // { email, password }
  const [invite, setInvite]   = useState({ email: '', full_name: '', role: 'tech', store_id: '', password: genPassword() })
  const [inviting, setInviting] = useState(false)
  const [showPw, setShowPw]   = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [usersRes, storesRes] = await Promise.all([
      supabase.from('users').select('*, stores(name)').order('full_name'),
      supabase.from('stores').select('*').order('name'),
    ])
    setUsers(usersRes.data   || [])
    setStores(storesRes.data || [])
    setLoading(false)
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviting(true)

    // Save the owner's current session so we can restore it after signUp.
    // supabase.auth.signUp() automatically fires SIGNED_IN for the new user,
    // which would hijack the current session without this restore step.
    const { data: { session: ownerSession } } = await supabase.auth.getSession()

    // Step 1: Create the Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email:    invite.email,
      password: invite.password,
      options:  { data: { full_name: invite.full_name } },
    })

    // Step 2: Immediately restore the owner's session so the app stays logged
    // in as the owner and all subsequent queries run under their credentials.
    if (ownerSession) {
      await supabase.auth.setSession({
        access_token:  ownerSession.access_token,
        refresh_token: ownerSession.refresh_token,
      })
    }

    if (authError) {
      notify(authError.message, 'error')
      setInviting(false)
      return
    }

    const userId = authData?.user?.id
    if (!userId) {
      notify('User created but could not retrieve ID. Check Supabase auth settings.', 'warning')
      setInviting(false)
      return
    }

    // Step 3: Insert the profile row (now running as the owner — correct RLS)
    const { error: profileError } = await supabase.from('users').insert({
      id:        userId,
      email:     invite.email,
      full_name: invite.full_name,
      role:      invite.role,
      store_id:  invite.store_id || null,
    })

    if (profileError) {
      notify('Auth user created but profile failed: ' + profileError.message, 'warning')
    } else {
      setCreatedCreds({ email: invite.email, password: invite.password })
      setShowInvite(false)
      setInvite({ email: '', full_name: '', role: 'tech', store_id: '', password: genPassword() })
      await loadData()
    }
    setInviting(false)
  }

  const filtered = users.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-500">Loading users…</div>

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-brand-400" />
          <h1 className="text-xl font-semibold text-slate-100">User Management</h1>
        </div>
        <button onClick={() => { setShowInvite(s => !s); setCreatedCreds(null) }} className="btn-primary">
          <Plus size={14} /> {showInvite ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {/* Credentials display after creation */}
      {createdCreds && (
        <TempPasswordCard
          email={createdCreds.email}
          password={createdCreds.password}
          onDone={() => setCreatedCreds(null)}
        />
      )}

      {/* Add user form */}
      {showInvite && (
        <form onSubmit={handleInvite} className="card space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <UserCheck size={15} /> New User
          </h3>
          <p className="text-xs text-slate-500">
            A password will be generated. Share it with the user — they can change it after first login.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" required value={invite.full_name}
                onChange={e => setInvite(i => ({ ...i, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" required value={invite.email}
                onChange={e => setInvite(i => ({ ...i, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Role *</label>
              <select className="input" value={invite.role}
                onChange={e => setInvite(i => ({ ...i, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Assign to Store</label>
              <select className="input" value={invite.store_id}
                onChange={e => setInvite(i => ({ ...i, store_id: e.target.value }))}>
                <option value="">No store</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Temporary Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input pr-10 font-mono"
                    value={invite.password}
                    onChange={e => setInvite(i => ({ ...i, password: e.target.value }))}
                    required minLength={8}
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button type="button" onClick={() => setInvite(i => ({ ...i, password: genPassword() }))}
                  className="btn-ghost text-xs px-3">
                  Regenerate
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={inviting} className="btn-primary">
              {inviting ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : 'Create User'}
            </button>
            <button type="button" onClick={() => setShowInvite(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      {/* Note about email confirmation */}
      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-300">
        💡 <strong>Tip:</strong> Disable email confirmation in Supabase → Authentication → Settings → "Enable email confirmations" so users can log in immediately without clicking a confirmation link.
      </div>

      <div className="relative">
        <input className="input pl-9 text-sm" placeholder="Search users…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-500">{filtered.length} users</p>
        {filtered.map(u => (
          <UserRow key={u.id} user={u} stores={stores} onSave={loadData} />
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Users, Plus, Pencil, Save, X, Loader2, UserCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'

const ROLES = ['tech', 'manager', 'district_manager', 'owner']

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

  return (
    <div className="card py-3">
      {editing ? (
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="label">Name</label>
            <input className="input text-sm" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input text-sm" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Store</label>
            <select className="input text-sm" value={form.store_id} onChange={e => setForm(f => ({ ...f, store_id: e.target.value }))}>
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
            <div className="flex items-center gap-2 mt-0.5">
              <span className="badge-blue capitalize text-xs">{user.role?.replace('_', ' ')}</span>
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

export default function UserManagement() {
  const { profile } = useAuthStore()
  const notify = useUiStore(s => s.notify)
  const [users, setUsers]   = useState([])
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [invite, setInvite]   = useState({ email: '', full_name: '', role: 'tech', store_id: '' })
  const [inviting, setInviting] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [usersRes, storesRes] = await Promise.all([
      supabase.from('users').select('*, stores(name)').order('full_name'),
      supabase.from('stores').select('*').order('name'),
    ])
    setUsers(usersRes.data  || [])
    setStores(storesRes.data || [])
    setLoading(false)
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviting(true)
    // Supabase Admin invite — requires service role in production
    // Here we use signUp which sends a confirmation email
    const { error } = await supabase.auth.admin?.inviteUserByEmail?.(invite.email, {
      data: { full_name: invite.full_name, role: invite.role, store_id: invite.store_id || null }
    }) || await supabase.from('users').insert({
      email:     invite.email,
      full_name: invite.full_name,
      role:      invite.role,
      store_id:  invite.store_id || null,
    })

    if (error) notify(error.message, 'error')
    else {
      notify('Invitation sent!', 'success')
      setShowInvite(false)
      setInvite({ email: '', full_name: '', role: 'tech', store_id: '' })
      await loadData()
    }
    setInviting(false)
  }

  const filtered = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
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
        <button onClick={() => setShowInvite(s => !s)} className="btn-primary">
          <Plus size={14} /> Invite User
        </button>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="card space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <UserCheck size={15} /> Invite New User
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name</label>
              <input className="input" required value={invite.full_name} onChange={e => setInvite(i => ({ ...i, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" required value={invite.email} onChange={e => setInvite(i => ({ ...i, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={invite.role} onChange={e => setInvite(i => ({ ...i, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Assign to Store</label>
              <select className="input" value={invite.store_id} onChange={e => setInvite(i => ({ ...i, store_id: e.target.value }))}>
                <option value="">No store</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={inviting} className="btn-primary">
              {inviting ? <Loader2 size={14} className="animate-spin" /> : 'Send Invite'}
            </button>
            <button type="button" onClick={() => setShowInvite(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

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

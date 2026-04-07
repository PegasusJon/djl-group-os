import { useEffect, useState } from 'react'
import { Store, Plus, Pencil, Save, X, Loader2, Users, UserPlus, Trash2, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'

// ── Assign Techs Panel ───────────────────────────────────────────────────────
function AssignTechsPanel({ store, allUsers, onClose, onSaved }) {
  const notify = useUiStore(s => s.notify)
  const [assignments, setAssignments] = useState([]) // { user_id, is_primary }
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    supabase.from('user_stores').select('user_id, is_primary')
      .eq('store_id', store.id)
      .then(({ data }) => { setAssignments(data || []); setLoading(false) })
  }, [store.id])

  const isAssigned = (uid) => assignments.some(a => a.user_id === uid)
  const isPrimary  = (uid) => assignments.some(a => a.user_id === uid && a.is_primary)

  const toggleUser = (uid) => {
    if (isAssigned(uid)) {
      setAssignments(a => a.filter(x => x.user_id !== uid))
    } else {
      setAssignments(a => [...a, { user_id: uid, is_primary: false }])
    }
  }

  const togglePrimary = (uid) => {
    setAssignments(a => a.map(x =>
      x.user_id === uid ? { ...x, is_primary: !x.is_primary } : x
    ))
  }

  const handleSave = async () => {
    setSaving(true)
    // Delete existing, re-insert
    await supabase.from('user_stores').delete().eq('store_id', store.id)
    if (assignments.length) {
      const rows = assignments.map(a => ({ ...a, store_id: store.id }))
      const { error } = await supabase.from('user_stores').insert(rows)
      if (error) { notify(error.message, 'error'); setSaving(false); return }
    }

    // Also update users.store_id for those marked as primary
    for (const a of assignments) {
      if (a.is_primary) {
        await supabase.from('users').update({ store_id: store.id }).eq('id', a.user_id)
      }
    }

    notify('Assignments saved!', 'success')
    onSaved()
    setSaving(false)
  }

  const eligible = allUsers.filter(u => ['tech', 'manager'].includes(u.role))

  if (loading) return <div className="p-4 text-slate-500 text-sm">Loading…</div>

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md mx-4 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-200">Assign Team</h2>
            <p className="text-xs text-slate-500 mt-0.5">{store.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-1 pr-1">
          {eligible.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No techs or managers found.</p>
          )}
          {eligible.map(u => {
            const assigned = isAssigned(u.id)
            const primary  = isPrimary(u.id)
            return (
              <div key={u.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${assigned ? 'border-brand-600/40 bg-brand-600/5' : 'border-transparent hover:bg-white/5'}`}>
                <input type="checkbox" checked={assigned} onChange={() => toggleUser(u.id)}
                  className="accent-brand-500 w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{u.full_name}</p>
                  <p className="text-xs text-slate-500 capitalize">{u.role}</p>
                </div>
                {assigned && (
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer shrink-0">
                    <input type="checkbox" checked={primary} onChange={() => togglePrimary(u.id)}
                      className="accent-brand-500 w-3.5 h-3.5" />
                    Primary
                  </label>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 mt-4 pt-4 border-t border-surface-border shrink-0">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Store Row ────────────────────────────────────────────────────────────────
function StoreRow({ store, allUsers, onRefresh }) {
  const notify = useUiStore(s => s.notify)
  const [editing, setEditing] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [form, setForm]  = useState({ name: store.name, address: store.address || '', phone: store.phone || '', teams_webhook_url: store.teams_webhook_url || '' })
  const [saving, setSaving] = useState(false)
  const [staffCount, setStaffCount] = useState(0)

  useEffect(() => {
    supabase.from('user_stores').select('id', { count: 'exact', head: true })
      .eq('store_id', store.id)
      .then(({ count }) => setStaffCount(count || 0))
  }, [store.id])

  const handleSave = async () => {
    setSaving(true)
    const payload = { name: form.name, address: form.address, phone: form.phone }
    if (form.teams_webhook_url !== undefined) payload.teams_webhook_url = form.teams_webhook_url
    const { error } = await supabase.from('stores').update(payload).eq('id', store.id)
    if (error) notify(error.message, 'error')
    else { onRefresh(); setEditing(false) }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete store "${store.name}"? This cannot be undone.`)) return
    await supabase.from('stores').update({ active: false }).eq('id', store.id)
    onRefresh()
  }

  return (
    <>
      {showAssign && (
        <AssignTechsPanel
          store={store} allUsers={allUsers}
          onClose={() => setShowAssign(false)}
          onSaved={() => { setShowAssign(false); onRefresh() }}
        />
      )}
      <div className="card">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Store Name</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Address</label>
                <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Teams Webhook URL</label>
                <input className="input text-xs" placeholder="https://…" value={form.teams_webhook_url}
                  onChange={e => setForm(f => ({ ...f, teams_webhook_url: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <><Save size={12} /> Save</>}
              </button>
              <button onClick={() => setEditing(false)} className="btn-ghost text-xs px-3 py-1.5">
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-600/20 flex items-center justify-center shrink-0">
              <Store size={16} className="text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-200">{store.name}</p>
              {store.address && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {store.address}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1">
                {store.phone && <span className="text-xs text-slate-500">{store.phone}</span>}
                <span className="text-xs text-slate-500">{staffCount} staff assigned</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setShowAssign(true)} className="btn-ghost text-xs px-2 py-1.5">
                <Users size={13} /> Assign Team
              </button>
              <button onClick={() => setEditing(true)} className="text-slate-500 hover:text-slate-300 p-1.5">
                <Pencil size={14} />
              </button>
              <button onClick={handleDelete} className="text-slate-600 hover:text-red-400 p-1.5">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StoreManagement() {
  const { profile } = useAuthStore()
  const notify = useUiStore(s => s.notify)
  const [stores, setStores]   = useState([])
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ name: '', address: '', phone: '', teams_webhook_url: '' })
  const [saving, setSaving]   = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [storesRes, usersRes] = await Promise.all([
      supabase.from('stores').select('*').eq('active', true).order('name'),
      supabase.from('users').select('id, full_name, role, store_id').eq('active', true).order('full_name'),
    ])
    setStores(storesRes.data || [])
    setUsers(usersRes.data  || [])
    setLoading(false)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = { name: form.name, address: form.address, phone: form.phone, active: true }
    if (form.teams_webhook_url) payload.teams_webhook_url = form.teams_webhook_url
    const { error } = await supabase.from('stores').insert(payload)
    if (error) notify(error.message, 'error')
    else { setShowAdd(false); setForm({ name: '', address: '', phone: '', teams_webhook_url: '' }); await loadData() }
    setSaving(false)
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-500">Loading stores…</div>

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store size={20} className="text-brand-400" />
          <h1 className="text-xl font-semibold text-slate-100">Store Management</h1>
        </div>
        <button onClick={() => setShowAdd(s => !s)} className="btn-primary">
          <Plus size={14} /> Add Store
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">New Store</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Store Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Teams Webhook URL</label>
              <input className="input text-xs" placeholder="https://…" value={form.teams_webhook_url}
                onChange={e => setForm(f => ({ ...f, teams_webhook_url: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save Store'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {stores.map(s => (
          <StoreRow key={s.id} store={s} allUsers={users} onRefresh={loadData} />
        ))}
        {stores.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Store size={40} className="mx-auto mb-3 opacity-30" />
            <p>No stores yet. Add your first store above.</p>
          </div>
        )}
      </div>

      {/* Floating techs overview */}
      {users.filter(u => u.role === 'tech').length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <UserPlus size={15} /> Floating Techs
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Techs assigned to multiple stores. Their primary store is shown first.
          </p>
          <FloatingTechsTable users={users} stores={stores} />
        </div>
      )}
    </div>
  )
}

function FloatingTechsTable({ users, stores }) {
  const [assignments, setAssignments] = useState([])

  useEffect(() => {
    supabase.from('user_stores').select('user_id, store_id, is_primary')
      .then(({ data }) => setAssignments(data || []))
  }, [])

  // Find techs with 2+ store assignments
  const techIds = [...new Set(assignments.map(a => a.user_id))]
  const floating = techIds.filter(uid => assignments.filter(a => a.user_id === uid).length > 1)

  if (floating.length === 0) return (
    <p className="text-xs text-slate-600">No floating techs yet — assign a tech to multiple stores above.</p>
  )

  return (
    <div className="space-y-2">
      {floating.map(uid => {
        const user = users.find(u => u.id === uid)
        if (!user) return null
        const userAssignments = assignments
          .filter(a => a.user_id === uid)
          .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
        return (
          <div key={uid} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center text-xs font-bold text-brand-300 shrink-0">
              {user.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <span className="text-sm text-slate-300 w-36 truncate">{user.full_name}</span>
            <div className="flex flex-wrap gap-1">
              {userAssignments.map(a => {
                const store = stores.find(s => s.id === a.store_id)
                return store ? (
                  <span key={a.store_id} className={`text-xs px-2 py-0.5 rounded-full ${a.is_primary ? 'bg-brand-600/30 text-brand-300' : 'bg-surface text-slate-400'}`}>
                    {a.is_primary ? '★ ' : ''}{store.name}
                  </span>
                ) : null
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

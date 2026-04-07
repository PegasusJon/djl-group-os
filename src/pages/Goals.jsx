import { useEffect, useState } from 'react'
import { Target, Plus, Pencil, Check, X, Loader2, Hash, Percent, Store } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import ProgressBar from '../components/ProgressBar'

// ── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({ goal, canEdit, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(goal.current_value)
  const [saving, setSaving]   = useState(false)
  const notify = useUiStore(s => s.notify)

  const isPct  = (goal.value_type ?? 'number') === 'percentage'
  const max    = isPct ? 100 : goal.target_value
  const value  = isPct ? goal.current_value : goal.current_value
  const pct    = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
  const color  = pct >= 100 ? 'green' : pct >= 60 ? 'blue' : pct >= 30 ? 'yellow' : 'red'

  const displayValue = isPct
    ? `${goal.current_value}% / ${goal.target_value}%`
    : `${goal.current_value} / ${goal.target_value} ${goal.unit}`

  const handleSave = async () => {
    setSaving(true)
    const val = parseFloat(current)
    // Clamp percentage goals to 0–100
    const clamped = isPct ? Math.min(100, Math.max(0, val)) : val
    const { error } = await supabase.from('goals').update({ current_value: clamped }).eq('id', goal.id)
    if (error) notify(error.message, 'error')
    else { onUpdate(); setEditing(false) }
    setSaving(false)
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-200">{goal.title}</p>
            {isPct
              ? <span className="badge-purple flex items-center gap-1"><Percent size={9} /> %</span>
              : <span className="badge-blue flex items-center gap-1"><Hash size={9} /> #</span>
            }
            {pct >= 100 && <span className="badge-green">Complete</span>}
          </div>
          {goal.description && <p className="text-xs text-slate-500 mt-0.5">{goal.description}</p>}
          {goal.stores?.name && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Store size={10} /> {goal.stores.name}
            </p>
          )}
        </div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="text-slate-500 hover:text-slate-300 ml-2 shrink-0">
            <Pencil size={14} />
          </button>
        )}
      </div>

      <ProgressBar value={isPct ? goal.current_value : goal.current_value}
                   max={isPct ? goal.target_value : goal.target_value}
                   color={color} showLabel={false} />

      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{displayValue}</span>
        <div className="flex items-center gap-3">
          {goal.due_date && <span>Due: {format(parseISO(goal.due_date), 'MMM d, yyyy')}</span>}
          <span className="font-medium text-slate-400">{pct}%</span>
        </div>
      </div>

      {editing && (
        <div className="mt-3 pt-3 border-t border-surface-border flex items-center gap-2">
          <label className="text-xs text-slate-400">Current:</label>
          <input type="number" className="input w-28 text-sm" value={current}
            min={0} max={isPct ? 100 : undefined}
            onChange={e => setCurrent(e.target.value)} />
          <span className="text-xs text-slate-500">{isPct ? '%' : goal.unit}</span>
          <button onClick={handleSave} disabled={saving} className="btn-primary px-3 py-1.5 text-xs">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          </button>
          <button onClick={() => { setEditing(false); setCurrent(goal.current_value) }}
            className="btn-ghost px-3 py-1.5 text-xs">
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Create Goal Form ─────────────────────────────────────────────────────────
function CreateGoalForm({ stores, profile, onSaved, onCancel }) {
  const notify = useUiStore(s => s.notify)
  const [saving, setSaving]     = useState(false)
  const [selectedStores, setSelectedStores] = useState([]) // [{ store_id, target_value }]
  const [form, setForm] = useState({
    title:      '',
    description: '',
    value_type: 'number',
    unit:       'repairs',
    due_date:   '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isPct = form.value_type === 'percentage'

  const toggleStore = (storeId) => {
    setSelectedStores(prev => {
      if (prev.find(s => s.store_id === storeId)) {
        return prev.filter(s => s.store_id !== storeId)
      }
      return [...prev, { store_id: storeId, target_value: isPct ? '100' : '' }]
    })
  }

  const setStoreTarget = (storeId, val) => {
    setSelectedStores(prev => prev.map(s => s.store_id === storeId ? { ...s, target_value: val } : s))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedStores.length === 0) { notify('Select at least one store.', 'warning'); return }
    const invalid = selectedStores.filter(s => !s.target_value || isNaN(parseFloat(s.target_value)))
    if (invalid.length) { notify('Enter a target value for each selected store.', 'warning'); return }

    setSaving(true)
    const rows = selectedStores.map(s => ({
      title:         form.title,
      description:   form.description,
      ...(form.value_type && { value_type: form.value_type }),
      unit:          isPct ? '%' : form.unit,
      target_value:  parseFloat(s.target_value),
      current_value: 0,
      due_date:      form.due_date || null,
      store_id:      s.store_id,
      created_by:    profile.id,
      active:        true,
    }))

    const { error } = await supabase.from('goals').insert(rows)
    if (error) { notify(error.message, 'error'); setSaving(false); return }

    notify(`${rows.length} goal${rows.length > 1 ? 's' : ''} created!`, 'success')
    onSaved()
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h3 className="text-sm font-semibold text-slate-300">New Goal</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Goal Name *</label>
          <input className="input" required placeholder="e.g. Monthly Repair Volume"
            value={form.title} onChange={e => set('title', e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="label">Description</label>
          <input className="input" placeholder="Optional description…"
            value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        {/* Value type toggle */}
        <div>
          <label className="label">Value Type *</label>
          <div className="flex rounded-lg overflow-hidden border border-surface-border">
            <button type="button"
              onClick={() => { set('value_type', 'number'); set('unit', 'repairs') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm transition-colors ${form.value_type === 'number' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              <Hash size={13} /> Number
            </button>
            <button type="button"
              onClick={() => { set('value_type', 'percentage'); set('unit', '%') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm transition-colors ${form.value_type === 'percentage' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              <Percent size={13} /> Percentage
            </button>
          </div>
        </div>

        {!isPct && (
          <div>
            <label className="label">Unit</label>
            <input className="input" placeholder="repairs, tickets, $, etc."
              value={form.unit} onChange={e => set('unit', e.target.value)} />
          </div>
        )}

        <div className={isPct ? 'col-span-2' : ''}>
          <label className="label">Due Date</label>
          <input type="date" className="input" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </div>
      </div>

      {/* Store selection + per-store targets */}
      <div>
        <label className="label">Apply to Stores * <span className="text-slate-600 font-normal">(select one or more — set target per store)</span></label>
        <div className="space-y-2 mt-1">
          {stores.map(store => {
            const sel = selectedStores.find(s => s.store_id === store.id)
            return (
              <div key={store.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${sel ? 'border-brand-600/40 bg-brand-600/5' : 'border-surface-border hover:border-surface-muted'}`}>
                <input type="checkbox" className="accent-brand-500 w-4 h-4 shrink-0"
                  checked={!!sel} onChange={() => toggleStore(store.id)} />
                <Store size={13} className="text-slate-500 shrink-0" />
                <span className="text-sm text-slate-300 flex-1">{store.name}</span>
                {sel && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-slate-500">Target:</span>
                    <input type="number" min={0} max={isPct ? 100 : undefined}
                      className="input w-24 text-sm py-1"
                      placeholder={isPct ? '0–100' : '0'}
                      value={sel.target_value}
                      onChange={e => setStoreTarget(store.id, e.target.value)} />
                    <span className="text-xs text-slate-500">{isPct ? '%' : form.unit}</span>
                  </div>
                )}
              </div>
            )
          })}
          {stores.length === 0 && <p className="text-sm text-slate-500">No stores found.</p>}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving
            ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
            : `Create ${selectedStores.length > 1 ? `${selectedStores.length} Goals` : 'Goal'}`}
        </button>
      </div>
    </form>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Goals() {
  const { profile } = useAuthStore()
  const [goals, setGoals]     = useState([])
  const [stores, setStores]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const canEdit = ['owner', 'district_manager', 'manager'].includes(profile?.role)

  useEffect(() => { loadAll() }, [profile])

  const loadAll = async () => {
    setLoading(true)
    const [goalsRes, storesRes] = await Promise.all([
      supabase.from('goals')
        .select('*, stores(name)')
        .eq('active', true)
        .order('created_at', { ascending: false }),
      supabase.from('stores').select('id, name').eq('active', true).order('name'),
    ])
    setStores(storesRes.data || [])

    // Filter by role
    let data = goalsRes.data || []
    if (profile?.role === 'tech') {
      data = data.filter(g => g.user_id === profile.id || g.store_id === profile.store_id)
    } else if (profile?.role === 'manager') {
      data = data.filter(g => g.store_id === profile.store_id || !g.store_id)
    }
    setGoals(data)
    setLoading(false)
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-500">Loading goals…</div>

  const storeGoals = goals.filter(g => g.store_id && !g.user_id)
  const userGoals  = goals.filter(g => g.user_id)

  // Group store goals by store
  const byStore = stores.reduce((acc, s) => {
    const items = storeGoals.filter(g => g.store_id === s.id)
    if (items.length) acc[s.id] = { store: s, items }
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-brand-400" />
          <h1 className="text-xl font-semibold text-slate-100">Goals</h1>
        </div>
        {canEdit && (
          <button onClick={() => setShowAdd(s => !s)} className="btn-primary">
            <Plus size={14} /> {showAdd ? 'Cancel' : 'Add Goal'}
          </button>
        )}
      </div>

      {showAdd && (
        <CreateGoalForm
          stores={stores}
          profile={profile}
          onSaved={() => { setShowAdd(false); loadAll() }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Store goals grouped by store */}
      {Object.values(byStore).map(({ store, items }) => (
        <section key={store.id}>
          <div className="flex items-center gap-2 mb-3">
            <Store size={13} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-400">{store.name}</h2>
          </div>
          <div className="space-y-3">
            {items.map(g => <GoalCard key={g.id} goal={g} canEdit={canEdit} onUpdate={loadAll} />)}
          </div>
        </section>
      ))}

      {/* Personal goals */}
      {userGoals.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-400 mb-3">Personal Goals</h2>
          <div className="space-y-3">
            {userGoals.map(g => <GoalCard key={g.id} goal={g} canEdit={canEdit} onUpdate={loadAll} />)}
          </div>
        </section>
      )}

      {goals.length === 0 && !showAdd && (
        <div className="text-center py-16 text-slate-500">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          <p>No goals set yet.</p>
          {canEdit && (
            <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 mx-auto">
              <Plus size={14} /> Create First Goal
            </button>
          )}
        </div>
      )}
    </div>
  )
}

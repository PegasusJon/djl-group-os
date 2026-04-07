import { useEffect, useState } from 'react'
import { Target, Plus, Pencil, Check, X, Loader2, Hash, Percent, Store, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import ProgressBar from '../components/ProgressBar'

// ── Helpers ──────────────────────────────────────────────────────────────────
function goalPct(goal) {
  return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
}
function goalColor(pct) {
  return pct >= 100 ? 'green' : pct >= 60 ? 'blue' : pct >= 30 ? 'yellow' : 'red'
}
function goalIsPct(goal) {
  return (goal.value_type ?? 'number') === 'percentage'
}

// ── Compact goal row (used in All Stores columns) ─────────────────────────────
function GoalRow({ goal, canEdit, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(goal.current_value)
  const [saving, setSaving]   = useState(false)
  const notify = useUiStore(s => s.notify)

  const isPct  = goalIsPct(goal)
  const pct    = goalPct(goal)
  const color  = goalColor(pct)

  const handleSave = async () => {
    setSaving(true)
    const val     = parseFloat(current)
    const clamped = isPct ? Math.min(100, Math.max(0, val)) : val
    const { error } = await supabase.from('goals').update({ current_value: clamped }).eq('id', goal.id)
    if (error) notify(error.message, 'error')
    else { onUpdate(); setEditing(false) }
    setSaving(false)
  }

  return (
    <div className="py-2.5 border-b border-surface-border/60 last:border-0 group">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {isPct
            ? <Percent size={10} className="text-purple-400 shrink-0" />
            : <Hash    size={10} className="text-brand-400  shrink-0" />}
          <span className="text-sm font-medium text-slate-200 truncate" title={goal.title}>
            {goal.title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {pct >= 100 && <span className="badge-green text-[10px]">Done</span>}
          <span className={`text-xs font-bold ${
            color === 'green' ? 'text-green-400' :
            color === 'blue'  ? 'text-brand-400' :
            color === 'yellow'? 'text-yellow-400' : 'text-red-400'
          }`}>{pct}%</span>
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)}
              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-slate-300 transition-all">
              <Pencil size={12} />
            </button>
          )}
        </div>
      </div>

      <ProgressBar value={goal.current_value} max={goal.target_value} color={color} showLabel={false} size="sm" />

      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-slate-500">
          {isPct
            ? `${goal.current_value}% of ${goal.target_value}%`
            : `${goal.current_value} / ${goal.target_value} ${goal.unit}`}
        </span>
        {goal.due_date && (
          <span className="text-[10px] text-slate-600">
            {format(parseISO(goal.due_date), 'MMM d')}
          </span>
        )}
      </div>

      {editing && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-surface-border">
          <span className="text-[10px] text-slate-500">Update:</span>
          <input type="number" min={0} max={isPct ? 100 : undefined}
            className="input text-xs py-1 w-20"
            value={current} onChange={e => setCurrent(e.target.value)} />
          <span className="text-[10px] text-slate-500">{isPct ? '%' : goal.unit}</span>
          <button onClick={handleSave} disabled={saving}
            className="btn-primary px-2 py-1 text-[10px]">
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
          </button>
          <button onClick={() => { setEditing(false); setCurrent(goal.current_value) }}
            className="btn-ghost px-2 py-1 text-[10px]">
            <X size={10} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Full goal card (used in single-store detail view) ────────────────────────
function GoalCard({ goal, canEdit, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(goal.current_value)
  const [saving, setSaving]   = useState(false)
  const notify = useUiStore(s => s.notify)

  const isPct = goalIsPct(goal)
  const pct   = goalPct(goal)
  const color = goalColor(pct)

  const handleSave = async () => {
    setSaving(true)
    const val     = parseFloat(current)
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
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-slate-200">{goal.title}</p>
            {isPct
              ? <span className="badge-purple flex items-center gap-1 text-[10px]"><Percent size={9} />%</span>
              : <span className="badge-blue   flex items-center gap-1 text-[10px]"><Hash    size={9} />#</span>}
            {pct >= 100 && <span className="badge-green text-[10px]">Complete</span>}
          </div>
          {goal.description && <p className="text-xs text-slate-500 mt-0.5">{goal.description}</p>}
        </div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="text-slate-500 hover:text-slate-300 ml-2 shrink-0">
            <Pencil size={14} />
          </button>
        )}
      </div>

      <ProgressBar value={goal.current_value} max={goal.target_value} color={color} showLabel={false} />

      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>
          {isPct
            ? `${goal.current_value}% / ${goal.target_value}%`
            : `${goal.current_value} / ${goal.target_value} ${goal.unit}`}
        </span>
        <div className="flex items-center gap-3">
          {goal.due_date && <span>Due: {format(parseISO(goal.due_date), 'MMM d, yyyy')}</span>}
          <span className="font-bold text-slate-300">{pct}%</span>
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
            className="btn-ghost px-3 py-1.5 text-xs"><X size={12} /></button>
        </div>
      )}
    </div>
  )
}

// ── Create Goal Form ─────────────────────────────────────────────────────────
function CreateGoalForm({ stores, profile, onSaved, onCancel }) {
  const notify  = useUiStore(s => s.notify)
  const [saving, setSaving] = useState(false)
  const [selectedStores, setSelectedStores] = useState([])
  const [form, setForm] = useState({
    title: '', description: '', value_type: 'number', unit: 'repairs', due_date: '',
  })

  const set    = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isPct  = form.value_type === 'percentage'

  const toggleStore = (id) => setSelectedStores(prev =>
    prev.find(s => s.store_id === id)
      ? prev.filter(s => s.store_id !== id)
      : [...prev, { store_id: id, target_value: isPct ? '100' : '' }]
  )

  const setTarget = (id, val) =>
    setSelectedStores(prev => prev.map(s => s.store_id === id ? { ...s, target_value: val } : s))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStores.length) { notify('Select at least one store.', 'warning'); return }
    if (selectedStores.some(s => !s.target_value || isNaN(parseFloat(s.target_value))))
      { notify('Enter a target for each store.', 'warning'); return }

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
          <input className="input" placeholder="Optional…"
            value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div>
          <label className="label">Value Type *</label>
          <div className="flex rounded-lg overflow-hidden border border-surface-border">
            {[['number','# Number',<Hash size={13}/>],['percentage','% Percentage',<Percent size={13}/>]].map(([v,l,icon]) => (
              <button key={v} type="button"
                onClick={() => { set('value_type', v); set('unit', v === 'percentage' ? '%' : 'repairs') }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm transition-colors ${form.value_type === v ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                {icon} {l}
              </button>
            ))}
          </div>
        </div>
        {!isPct && (
          <div>
            <label className="label">Unit</label>
            <input className="input" placeholder="repairs, tickets, $…"
              value={form.unit} onChange={e => set('unit', e.target.value)} />
          </div>
        )}
        <div className={isPct ? 'col-span-2' : ''}>
          <label className="label">Due Date</label>
          <input type="date" className="input" value={form.due_date}
            onChange={e => set('due_date', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Apply to Stores *
          <span className="text-slate-600 font-normal ml-1">— set a different target per store</span>
        </label>
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
                      className="input w-24 text-sm py-1" placeholder={isPct ? '0–100' : '0'}
                      value={sel.target_value} onChange={e => setTarget(store.id, e.target.value)} />
                    <span className="text-xs text-slate-500">{isPct ? '%' : form.unit}</span>
                  </div>
                )}
              </div>
            )
          })}
          {!stores.length && <p className="text-sm text-slate-500">No stores found.</p>}
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

// ── Store column (All Stores view) ───────────────────────────────────────────
function StoreColumn({ store, goals, canEdit, onUpdate, onFocus }) {
  const storeGoals = goals.filter(g => g.store_id === store.id)
  const totalPct   = storeGoals.length
    ? Math.round(storeGoals.reduce((sum, g) => sum + goalPct(g), 0) / storeGoals.length)
    : null
  const color = totalPct === null ? 'blue' : goalColor(totalPct)

  return (
    <div className="card flex flex-col min-w-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-1 pb-3 border-b border-surface-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            color === 'green' ? 'bg-green-500/20' : color === 'red' ? 'bg-red-500/20' : 'bg-brand-600/20'
          }`}>
            <Store size={13} className={
              color === 'green' ? 'text-green-400' : color === 'red' ? 'text-red-400' : 'text-brand-400'
            } />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{store.name}</p>
            <p className="text-[10px] text-slate-500">{storeGoals.length} goal{storeGoals.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {totalPct !== null && (
            <span className={`text-sm font-bold ${
              color === 'green' ? 'text-green-400' :
              color === 'blue'  ? 'text-brand-400' :
              color === 'yellow'? 'text-yellow-400' : 'text-red-400'
            }`}>{totalPct}%</span>
          )}
          <button onClick={() => onFocus(store.id)}
            className="text-slate-600 hover:text-slate-300 transition-colors" title="View detail">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Goal rows */}
      <div className="flex-1 overflow-y-auto">
        {storeGoals.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-6">No goals yet.</p>
        ) : (
          storeGoals.map(g => (
            <GoalRow key={g.id} goal={g} canEdit={canEdit} onUpdate={onUpdate} />
          ))
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Goals() {
  const { profile }  = useAuthStore()
  const [goals, setGoals]     = useState([])
  const [stores, setStores]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [activeTab, setActiveTab] = useState('all') // 'all' | store.id

  const canEdit = ['owner', 'district_manager', 'manager'].includes(profile?.role)

  useEffect(() => { loadAll() }, [profile])

  const loadAll = async () => {
    setLoading(true)
    const [goalsRes, storesRes] = await Promise.all([
      supabase.from('goals').select('*, stores(name)').eq('active', true).order('created_at', { ascending: false }),
      supabase.from('stores').select('id, name').eq('active', true).order('name'),
    ])
    setStores(storesRes.data || [])
    let data = goalsRes.data || []
    if (profile?.role === 'tech')
      data = data.filter(g => g.user_id === profile.id || g.store_id === profile.store_id)
    else if (profile?.role === 'manager')
      data = data.filter(g => g.store_id === profile.store_id || !g.store_id)
    setGoals(data)
    setLoading(false)
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-500">Loading goals…</div>

  const storeGoals  = goals.filter(g => g.store_id && !g.user_id)
  const userGoals   = goals.filter(g => g.user_id)
  const activeStore = stores.find(s => s.id === activeTab)

  return (
    <div className="space-y-5 h-full flex flex-col" style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
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
        <CreateGoalForm stores={stores} profile={profile}
          onSaved={() => { setShowAdd(false); loadAll() }}
          onCancel={() => setShowAdd(false)} />
      )}

      {/* Store tabs */}
      {stores.length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-surface-card border border-surface-border rounded-xl w-fit shrink-0 flex-wrap">
          <button onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
            All Stores
          </button>
          {stores.map(s => {
            const sGoals  = storeGoals.filter(g => g.store_id === s.id)
            const avg     = sGoals.length ? Math.round(sGoals.reduce((sum, g) => sum + goalPct(g), 0) / sGoals.length) : null
            return (
              <button key={s.id} onClick={() => setActiveTab(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === s.id ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
                {s.name}
                {avg !== null && (
                  <span className={`text-[10px] font-bold px-1 rounded ${activeTab === s.id ? 'text-white/80' : avg >= 75 ? 'text-green-400' : avg >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {avg}%
                  </span>
                )}
              </button>
            )
          })}
          {userGoals.length > 0 && (
            <button onClick={() => setActiveTab('personal')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'personal' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
              Personal
            </button>
          )}
        </div>
      )}

      {/* ── ALL STORES: side-by-side columns ── */}
      {activeTab === 'all' && (
        <>
          {storeGoals.length === 0 && !showAdd ? (
            <div className="text-center py-16 text-slate-500">
              <Target size={40} className="mx-auto mb-3 opacity-30" />
              <p>No goals set yet.</p>
              {canEdit && (
                <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 mx-auto">
                  <Plus size={14} /> Create First Goal
                </button>
              )}
            </div>
          ) : (
            <div className={`grid gap-4 ${stores.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {stores.map(s => (
                <StoreColumn
                  key={s.id}
                  store={s}
                  goals={storeGoals}
                  canEdit={canEdit}
                  onUpdate={loadAll}
                  onFocus={setActiveTab}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── SINGLE STORE: full detail cards ── */}
      {activeStore && activeTab !== 'all' && (
        <div className="space-y-3">
          {storeGoals.filter(g => g.store_id === activeTab).length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Target size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No goals for {activeStore.name} yet.</p>
            </div>
          ) : (
            storeGoals
              .filter(g => g.store_id === activeTab)
              .map(g => <GoalCard key={g.id} goal={g} canEdit={canEdit} onUpdate={loadAll} />)
          )}
        </div>
      )}

      {/* ── PERSONAL GOALS ── */}
      {activeTab === 'personal' && (
        <div className="space-y-3">
          {userGoals.map(g => <GoalCard key={g.id} goal={g} canEdit={canEdit} onUpdate={loadAll} />)}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { X, Loader2, UserPlus, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useTaskStore } from '../store/taskStore'
import { useUiStore } from '../store/uiStore'

const FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly']

export default function CreateTaskModal({ onClose }) {
  const { profile } = useAuthStore()
  const { fetchTasks } = useTaskStore()
  const notify = useUiStore(s => s.notify)

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    title:          '',
    description:    '',
    instructions:   '',
    frequency:      'daily',
    first_due_date: today,
    assigned_to:    '',   // '' = all store members
    one_off:        false,
  })
  const [saving, setSaving]   = useState(false)
  const [storeUsers, setStoreUsers] = useState([])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Load users in the same store so manager/owner can assign
  useEffect(() => {
    if (!profile?.store_id) return
    supabase
      .from('users')
      .select('id, full_name, role')
      .eq('store_id', profile.store_id)
      .order('full_name')
      .then(({ data }) => setStoreUsers(data || []))
  }, [profile?.store_id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      title:          form.title,
      description:    form.description,
      instructions:   form.instructions,
      frequency:      form.frequency,
      first_due_date: form.first_due_date,
      one_off:        form.one_off,
      store_id:       profile.store_id,
      created_by:     profile.id,
      active:         true,
      // self_assigned if not assigning to someone else
      self_assigned:  !form.assigned_to || form.assigned_to === profile.id,
    }

    // Only set assigned_to if a specific user was chosen
    if (form.assigned_to) payload.assigned_to = form.assigned_to

    const { error } = await supabase.from('tasks').insert(payload)

    if (error) {
      notify(error.message, 'error')
    } else {
      notify('Task created!', 'success')
      await fetchTasks(profile.store_id, profile.id)
      onClose()
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-200">Create Task</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Task Title *</label>
            <input className="input" required placeholder="e.g. Clean workbench"
              value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="Short summary…"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div>
            <label className="label">Instructions</label>
            <textarea className="input resize-none" rows={3} placeholder="Step-by-step instructions…"
              value={form.instructions} onChange={e => set('instructions', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Frequency *</label>
              <select className="input" value={form.frequency} onChange={e => set('frequency', e.target.value)}
                disabled={form.one_off}>
                {FREQUENCIES.map(f => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Due Date *</label>
              <input type="date" className="input" required
                value={form.first_due_date} onChange={e => set('first_due_date', e.target.value)} />
            </div>
          </div>

          {/* One-off toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <div
              onClick={() => set('one_off', !form.one_off)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.one_off ? 'bg-brand-500' : 'bg-surface-border'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.one_off ? 'translate-x-5' : ''}`} />
            </div>
            <div>
              <p className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">One-time task</p>
              <p className="text-xs text-slate-500">Automatically removed after completion</p>
            </div>
          </label>

          {/* Assign to user */}
          <div>
            <label className="label flex items-center gap-1.5">
              <UserPlus size={12} className="text-brand-400" />
              Assign to
            </label>
            <select className="input" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
              <option value="">All store members</option>
              {storeUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.full_name}{u.id === profile.id ? ' (me)' : ''} — {u.role.replace('_', ' ')}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-600 mt-1">
              Leave blank for everyone in the store to see this task
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

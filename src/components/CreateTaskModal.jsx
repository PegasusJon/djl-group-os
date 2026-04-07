import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
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
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from('tasks').insert({
      ...form,
      store_id:      profile.store_id,
      created_by:    profile.id,
      self_assigned: true,
      active:        true,
    })

    if (error) {
      notify(error.message, 'error')
    } else {
      notify('Task created!', 'success')
      await fetchTasks(profile.store_id)
      onClose()
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-lg mx-4 shadow-2xl">
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
              <select className="input" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                {FREQUENCIES.map(f => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">First Due Date *</label>
              <input type="date" className="input" required
                value={form.first_due_date} onChange={e => set('first_due_date', e.target.value)} />
            </div>
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

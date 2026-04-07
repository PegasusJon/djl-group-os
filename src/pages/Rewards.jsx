import { useEffect, useState } from 'react'
import { Gift, Star, Trophy, Loader2, Plus, Crown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import ProgressBar from '../components/ProgressBar'

export default function Rewards() {
  const { profile, fetchProfile, user } = useAuthStore()
  const { openModal, notify } = useUiStore()
  const [rewards, setRewards]       = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [ledger, setLedger]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('store') // 'store' | 'leaderboard' | 'history'

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ name: '', description: '', cost: '' })
  const [saving, setSaving]   = useState(false)
  const canManage = ['owner','district_manager'].includes(profile?.role)

  useEffect(() => { loadAll() }, [profile])

  const loadAll = async () => {
    setLoading(true)
    const [rewardsRes, lbRes, ledgerRes] = await Promise.all([
      supabase.from('rewards').select('*').eq('active', true).order('cost'),
      supabase.from('users').select('id, full_name, points_balance, role, stores(name)')
        .order('points_balance', { ascending: false }).limit(20),
      supabase.from('points_ledger').select('*').eq('user_id', profile?.id)
        .order('created_at', { ascending: false }).limit(50),
    ])
    setRewards(rewardsRes.data || [])
    setLeaderboard(lbRes.data || [])
    setLedger(ledgerRes.data  || [])
    setLoading(false)
  }

  const handleAddReward = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('rewards').insert({
      name:        form.name,
      description: form.description,
      cost:        parseInt(form.cost),
      active:      true,
    })
    if (error) notify(error.message, 'error')
    else { await loadAll(); setShowAdd(false); setForm({ name: '', description: '', cost: '' }) }
    setSaving(false)
  }

  const balance = profile?.points_balance || 0

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-500">Loading rewards…</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift size={20} className="text-brand-400" />
          <h1 className="text-xl font-semibold text-slate-100">Rewards</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <Star size={14} className="text-yellow-400" />
            <span className="text-sm font-bold text-yellow-300">{balance} pts</span>
          </div>
          {canManage && (
            <button onClick={() => setShowAdd(s => !s)} className="btn-primary">
              <Plus size={14} /> Add Reward
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-card rounded-lg w-fit">
        {[['store','Reward Store'],['leaderboard','Leaderboard'],['history','My Points']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === v ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {l}
          </button>
        ))}
      </div>

      {showAdd && canManage && (
        <form onSubmit={handleAddReward} className="card space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Add Reward</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Name</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Cost (pts)</label>
              <input type="number" className="input" required value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      {/* Reward Store */}
      {tab === 'store' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rewards.map(r => (
            <div key={r.id} className={`card flex flex-col gap-3 ${balance < r.cost ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center">
                  <Gift size={18} className="text-brand-400" />
                </div>
                <span className="text-lg font-bold text-yellow-400">{r.cost} pts</span>
              </div>
              <div>
                <p className="font-medium text-slate-200">{r.name}</p>
                {r.description && <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>}
              </div>
              <button
                disabled={balance < r.cost}
                onClick={() => openModal('redeem', { reward: r })}
                className="btn-primary w-full justify-center mt-auto">
                {balance < r.cost ? `Need ${r.cost - balance} more pts` : 'Redeem'}
              </button>
            </div>
          ))}
          {rewards.length === 0 && (
            <div className="col-span-2 text-center py-12 text-slate-500">
              <Gift size={36} className="mx-auto mb-3 opacity-30" />
              <p>No rewards available yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {tab === 'leaderboard' && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Trophy size={15} className="text-yellow-400" /> Points Leaderboard
          </h2>
          {leaderboard.map((u, i) => (
            <div key={u.id} className={`flex items-center gap-3 p-2 rounded-lg ${u.id === profile?.id ? 'bg-brand-600/10 border border-brand-600/30' : ''}`}>
              <span className={`w-6 text-center text-sm font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>
                {i === 0 ? <Crown size={14} className="inline" /> : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{u.full_name}</p>
                <p className="text-xs text-slate-500">{u.stores?.name}</p>
              </div>
              <span className="text-sm font-bold text-yellow-400">{u.points_balance || 0}</span>
            </div>
          ))}
        </div>
      )}

      {/* Points History */}
      {tab === 'history' && (
        <div className="space-y-2">
          {ledger.map(entry => (
            <div key={entry.id} className="card flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm text-slate-300 capitalize">{entry.reason?.replace(/_/g, ' ')}</p>
                <p className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</p>
              </div>
              <span className={`text-sm font-bold ${entry.points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {entry.points >= 0 ? '+' : ''}{entry.points} pts
              </span>
            </div>
          ))}
          {ledger.length === 0 && (
            <div className="text-center py-12 text-slate-500">No points history yet.</div>
          )}
        </div>
      )}
    </div>
  )
}

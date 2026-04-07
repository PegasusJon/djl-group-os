import { useEffect, useState } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { History, Search, Filter, CheckCircle, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export default function TaskHistory() {
  const { profile } = useAuthStore()
  const [completions, setCompletions] = useState([])
  const [tasks, setTasks]   = useState([])
  const [stores, setStores] = useState([])
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch]     = useState('')
  const [filterStore, setFilterStore] = useState('')
  const [filterUser, setFilterUser]   = useState('')
  const [filterDays, setFilterDays]   = useState('30')

  useEffect(() => { loadData() }, [profile, filterDays])

  const loadData = async () => {
    setLoading(true)
    const since = subDays(new Date(), parseInt(filterDays)).toISOString()

    let q = supabase
      .from('task_completions')
      .select('*, tasks(title, frequency), users!completed_by(full_name), stores(name)')
      .gte('completed_at', since)
      .order('completed_at', { ascending: false })

    // Restrict to own store for non-owners
    if (profile?.role === 'tech' || profile?.role === 'manager') {
      q = q.eq('store_id', profile.store_id)
    }

    const [compRes, storesRes, usersRes] = await Promise.all([
      q,
      supabase.from('stores').select('id, name'),
      supabase.from('users').select('id, full_name'),
    ])

    setCompletions(compRes.data || [])
    setStores(storesRes.data   || [])
    setUsers(usersRes.data     || [])
    setLoading(false)
  }

  const filtered = completions.filter(c => {
    const taskTitle = c.tasks?.title?.toLowerCase() || ''
    const userName  = c.users?.full_name?.toLowerCase() || ''
    const matchSearch = !search || taskTitle.includes(search.toLowerCase()) || userName.includes(search.toLowerCase())
    const matchStore  = !filterStore || c.store_id === filterStore
    const matchUser   = !filterUser  || c.completed_by === filterUser
    return matchSearch && matchStore && matchUser
  })

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <History size={20} className="text-brand-400" />
        <h1 className="text-xl font-semibold text-slate-100">Task History</h1>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-8" placeholder="Search task or person…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <select className="input w-36" value={filterDays} onChange={e => setFilterDays(e.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>

        {profile?.role !== 'tech' && (
          <select className="input w-44" value={filterStore} onChange={e => setFilterStore(e.target.value)}>
            <option value="">All stores</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}

        <select className="input w-44" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
          <option value="">All users</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading history…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <History size={36} className="mx-auto mb-3 opacity-30" />
          <p>No completions found for the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-xs text-slate-500 px-1">{filtered.length} records</p>
          {filtered.map(c => (
            <div key={c.id} className="card flex items-start gap-3 py-3">
              <CheckCircle size={16} className="text-green-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-200">{c.tasks?.title}</span>
                  <span className="badge-blue">{c.tasks?.frequency}</span>
                  {c.early_completion && (
                    <span className="badge-purple flex items-center gap-1"><Zap size={10} /> Early</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span>{c.users?.full_name}</span>
                  {c.stores?.name && <span>· {c.stores.name}</span>}
                  <span>· {format(parseISO(c.completed_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
                {c.note && <p className="text-xs text-slate-400 mt-1 italic">"{c.note}"</p>}
                {c.attachment_url && (
                  <a href={c.attachment_url} target="_blank" rel="noreferrer"
                    className="text-xs text-brand-400 hover:underline mt-1 block">View attachment</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

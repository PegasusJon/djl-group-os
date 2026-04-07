import { useEffect, useState } from 'react'
import { subDays, startOfDay, endOfDay, format } from 'date-fns'
import {
  LayoutDashboard, TrendingUp, AlertTriangle, Store, Users,
  ChevronDown, ChevronUp, CheckCircle2, Clock, XCircle,
  Zap, RefreshCw, Calendar,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { isDueToday, isOverdue, getCurrentWindow } from '../lib/scheduling'
import ProgressBar from '../components/ProgressBar'

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = { blue: 'text-brand-400', green: 'text-green-400', red: 'text-red-400', yellow: 'text-yellow-400', purple: 'text-purple-400' }
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${colors[color]}`}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
        <Icon size={20} className={`${colors[color]} opacity-60`} />
      </div>
    </div>
  )
}

// ── Task status row inside a store card ──────────────────────────────────────
function TaskStatusRow({ task, completions, users, today }) {
  const { start, end } = getCurrentWindow(task, today)

  const windowCompletion = completions.find(c => {
    if (c.task_id !== task.id) return false
    const at = new Date(c.completed_at)
    return at >= start && at <= end
  })

  const overdue   = !windowCompletion && isOverdue(task, today)
  const dueToday  = isDueToday(task, today)
  const completed = !!windowCompletion
  const completedBy = windowCompletion
    ? users.find(u => u.id === windowCompletion.completed_by)
    : null

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-surface-border/50 last:border-0">
      {/* Status icon */}
      {completed ? (
        <CheckCircle2 size={15} className="text-green-400 shrink-0" />
      ) : overdue ? (
        <XCircle size={15} className="text-red-400 shrink-0" />
      ) : dueToday ? (
        <Clock size={15} className="text-yellow-400 shrink-0" />
      ) : (
        <div className="w-[15px] h-[15px] rounded-full border border-surface-muted shrink-0" />
      )}

      {/* Task name */}
      <span className={`text-sm flex-1 truncate ${completed ? 'text-slate-400 line-through' : overdue ? 'text-red-300' : dueToday ? 'text-slate-200' : 'text-slate-500'}`}>
        {task.title}
      </span>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        {windowCompletion?.early_completion && (
          <span className="badge-purple flex items-center gap-0.5 text-[10px]"><Zap size={8} /> Early</span>
        )}
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
          completed ? 'bg-green-500/10 text-green-500' :
          overdue   ? 'bg-red-500/10 text-red-400' :
          dueToday  ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-surface text-slate-600'
        }`}>
          {completed ? 'Done' : overdue ? 'Overdue' : dueToday ? 'Due today' : task.frequency}
        </span>

        {/* Who completed it */}
        {completedBy && (
          <span className="text-[10px] text-slate-500 max-w-[80px] truncate">{completedBy.full_name}</span>
        )}
      </div>
    </div>
  )
}

// ── Per-store card ───────────────────────────────────────────────────────────
function StoreCard({ store, tasks, completions, users, today }) {
  const [expanded, setExpanded] = useState(false)

  const storeTasks    = tasks.filter(t => t.store_id === store.id)
  const dueTasks      = storeTasks.filter(t => isDueToday(t, today) || isOverdue(t, today))
  const overdueTasks  = storeTasks.filter(t => isOverdue(t, today))
  const storeUsers    = users.filter(u => u.store_id === store.id)

  // Count completions within the current window for each due task
  const completedCount = dueTasks.filter(t => {
    const { start, end } = getCurrentWindow(t, today)
    return completions.some(c => {
      if (c.task_id !== t.id) return false
      const at = new Date(c.completed_at)
      return at >= start && at <= end
    })
  }).length

  const total   = dueTasks.length
  const pct     = total === 0 ? 100 : Math.round((completedCount / total) * 100)
  const barColor = pct === 100 ? 'green' : pct >= 60 ? 'blue' : pct >= 30 ? 'yellow' : 'red'

  // Sort: overdue first, then due today, then by title
  const sorted = [...storeTasks].sort((a, b) => {
    const aOvr = isOverdue(a, today), bOvr = isOverdue(b, today)
    const aDue = isDueToday(a, today), bDue = isDueToday(b, today)
    if (aOvr && !bOvr) return -1
    if (!aOvr && bOvr) return 1
    if (aDue && !bDue) return -1
    if (!aDue && bDue) return 1
    return a.title.localeCompare(b.title)
  })

  return (
    <div className={`card transition-all duration-200 ${overdueTasks.length > 0 ? 'border-red-500/30' : pct === 100 ? 'border-green-500/20' : ''}`}>
      {/* Header row */}
      <button className="w-full text-left" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            pct === 100 ? 'bg-green-500/20' : overdueTasks.length > 0 ? 'bg-red-500/20' : 'bg-brand-600/20'
          }`}>
            <Store size={16} className={pct === 100 ? 'text-green-400' : overdueTasks.length > 0 ? 'text-red-400' : 'text-brand-400'} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-200">{store.name}</span>
              {overdueTasks.length > 0 && (
                <span className="badge-red flex items-center gap-1 text-[10px]">
                  <AlertTriangle size={9} /> {overdueTasks.length} overdue
                </span>
              )}
              {pct === 100 && total > 0 && (
                <span className="badge-green text-[10px]">All done</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
              <span>{completedCount}/{total} tasks today</span>
              <span>·</span>
              <span>{storeUsers.length} staff</span>
              {storeTasks.length > dueTasks.length && (
                <><span>·</span><span>{storeTasks.length - dueTasks.length} upcoming</span></>
              )}
            </div>
          </div>

          {/* Mini progress + chevron */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-24 hidden sm:block">
              <ProgressBar value={pct} max={100} color={barColor} showLabel={false} size="sm" />
              <p className="text-[10px] text-slate-500 text-right mt-0.5">{pct}%</p>
            </div>
            {expanded ? <ChevronUp size={15} className="text-slate-500" /> : <ChevronDown size={15} className="text-slate-500" />}
          </div>
        </div>
      </button>

      {/* Expanded task list */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-surface-border">
          {sorted.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No tasks assigned to this store.</p>
          ) : (
            <div>
              {sorted.map(t => (
                <TaskStatusRow
                  key={t.id}
                  task={t}
                  completions={completions}
                  users={users}
                  today={today}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { profile } = useAuthStore()
  const [stores, setStores]         = useState([])
  const [users, setUsers]           = useState([])
  const [completions, setCompletions] = useState([])
  const [tasks, setTasks]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [range, setRange]           = useState('today')   // 'today' | '7d'
  const today = new Date()

  useEffect(() => { loadData() }, [profile, range])

  const loadData = async () => {
    setLoading(true)
    const since = range === 'today'
      ? startOfDay(today).toISOString()
      : subDays(today, 7).toISOString()

    const [storesRes, usersRes, completionsRes, tasksRes] = await Promise.all([
      supabase.from('stores').select('*').eq('active', true).order('name'),
      supabase.from('users').select('id, full_name, role, store_id, points_balance').eq('active', true),
      supabase.from('task_completions').select('*').gte('completed_at', since),
      supabase.from('tasks').select('*').eq('active', true),
    ])

    setStores(storesRes.data     || [])
    setUsers(usersRes.data       || [])
    setCompletions(completionsRes.data || [])
    setTasks(tasksRes.data       || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center gap-2 text-slate-500">
      <RefreshCw size={16} className="animate-spin" /> Loading dashboard…
    </div>
  )

  // KPI totals
  const totalCompletions = completions.length
  const earlyCompletions = completions.filter(c => c.early_completion).length
  const allDueTasks      = tasks.filter(t => isDueToday(t, today) || isOverdue(t, today))
  const overdueCount     = tasks.filter(t => isOverdue(t, today)).length

  // Per-store completion rate for KPI
  const storeRates = stores.map(s => {
    const st   = tasks.filter(t => t.store_id === s.id && (isDueToday(t, today) || isOverdue(t, today)))
    const done = st.filter(t => {
      const { start, end } = getCurrentWindow(t, today)
      return completions.some(c => c.task_id === t.id && new Date(c.completed_at) >= start && new Date(c.completed_at) <= end)
    }).length
    return st.length === 0 ? 100 : Math.round((done / st.length) * 100)
  })
  const avgRate = storeRates.length ? Math.round(storeRates.reduce((a, b) => a + b, 0) / storeRates.length) : 0

  // Top performers
  const userStats = users
    .filter(u => ['tech', 'manager'].includes(u.role))
    .map(u => ({ ...u, done: completions.filter(c => c.completed_by === u.id).length }))
    .sort((a, b) => b.done - a.done)
    .slice(0, 6)

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={20} className="text-brand-400" />
          <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
          <span className="text-sm text-slate-500">
            {format(today, 'EEEE, MMM d')}
          </span>
        </div>

        {/* Range toggle */}
        <div className="flex items-center gap-1 p-1 bg-surface-card rounded-lg border border-surface-border">
          {[['today', 'Today'], ['7d', '7 Days']].map(([v, l]) => (
            <button key={v} onClick={() => setRange(v)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${range === v ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp}    label="Completions"      value={totalCompletions} sub={range === 'today' ? 'today' : 'last 7 days'} color="green" />
        <StatCard icon={Calendar}      label="Avg Completion"   value={`${avgRate}%`}    sub="across all stores"  color="blue" />
        <StatCard icon={AlertTriangle} label="Overdue Tasks"    value={overdueCount}     sub="need attention"     color="red" />
        <StatCard icon={Zap}           label="Early Completions" value={earlyCompletions} sub="bonus points earned" color="purple" />
      </div>

      {/* Store task breakdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Store size={14} /> Store Task Breakdown
          </h2>
          <button onClick={loadData} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors">
            <RefreshCw size={11} /> Refresh
          </button>
        </div>

        <div className="space-y-3">
          {stores.map(store => (
            <StoreCard
              key={store.id}
              store={store}
              tasks={tasks}
              completions={completions}
              users={users}
              today={today}
            />
          ))}
          {stores.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              <Store size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No stores found. Add stores in Store Management.</p>
            </div>
          )}
        </div>
      </div>

      {/* Team performance */}
      {userStats.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Users size={14} /> Team Performance
          </h2>
          <div className="space-y-2">
            {userStats.map((u, i) => {
              const store = stores.find(s => s.id === u.store_id)
              return (
                <div key={u.id} className="flex items-center gap-3">
                  <span className="w-5 text-center text-xs text-slate-600 font-bold">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center text-xs font-bold text-brand-300 shrink-0">
                    {u.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{u.full_name}</p>
                    {store && <p className="text-xs text-slate-500 truncate">{store.name}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-slate-300">{u.done} <span className="text-slate-500 font-normal text-xs">done</span></p>
                    <p className="text-xs text-yellow-400">{u.points_balance || 0} pts</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Early completions callout */}
      {earlyCompletions > 0 && (
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-sm text-purple-300 flex items-center gap-2">
          <Zap size={14} className="shrink-0" />
          <span><strong>{earlyCompletions}</strong> task{earlyCompletions !== 1 ? 's' : ''} completed early — great hustle!</span>
        </div>
      )}
    </div>
  )
}

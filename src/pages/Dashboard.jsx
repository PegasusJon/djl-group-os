import { useEffect, useState } from 'react'
import { format, subDays, startOfDay } from 'date-fns'
import { LayoutDashboard, TrendingUp, AlertTriangle, Store, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import ProgressBar from '../components/ProgressBar'

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = { blue: 'text-brand-400', green: 'text-green-400', red: 'text-red-400', yellow: 'text-yellow-400' }
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

export default function Dashboard() {
  const { profile } = useAuthStore()
  const [stores, setStores]   = useState([])
  const [users, setUsers]     = useState([])
  const [completions, setCompletions] = useState([])
  const [tasks, setTasks]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [profile])

  const loadData = async () => {
    setLoading(true)
    const since = subDays(new Date(), 7).toISOString()

    const [storesRes, usersRes, completionsRes, tasksRes] = await Promise.all([
      supabase.from('stores').select('*'),
      supabase.from('users').select('id, full_name, role, store_id, points_balance'),
      supabase.from('task_completions').select('*').gte('completed_at', since),
      supabase.from('tasks').select('*').eq('active', true),
    ])

    setStores(storesRes.data || [])
    setUsers(usersRes.data  || [])
    setCompletions(completionsRes.data || [])
    setTasks(tasksRes.data || [])
    setLoading(false)
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-500">Loading dashboard…</div>

  const totalCompletions  = completions.length
  const earlyCompletions  = completions.filter(c => c.early_completion).length
  const overdueTasks      = tasks.filter(t => {
    const lastDone = completions.find(c => c.task_id === t.id)
    return !lastDone
  }).length

  // Per-store stats
  const storeStats = stores.map(store => {
    const storeTasks   = tasks.filter(t => t.store_id === store.id)
    const storeDone    = completions.filter(c => c.store_id === store.id).length
    const storeExpected = storeTasks.length * 7 // rough weekly
    const rate = storeExpected === 0 ? 0 : Math.min(100, Math.round((storeDone / storeExpected) * 100))
    return { ...store, rate, done: storeDone, tasks: storeTasks.length }
  })

  // Per-user rates
  const userStats = users
    .filter(u => u.role === 'tech' || u.role === 'manager')
    .map(u => {
      const done = completions.filter(c => c.completed_by === u.id).length
      return { ...u, done }
    })
    .sort((a, b) => b.done - a.done)
    .slice(0, 8)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <LayoutDashboard size={20} className="text-brand-400" />
        <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
        <span className="text-sm text-slate-500 ml-1">Last 7 days</span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Total Completions" value={totalCompletions} sub="last 7 days" color="green" />
        <StatCard icon={Store}      label="Stores Active"     value={stores.length}   color="blue" />
        <StatCard icon={Users}      label="Team Members"      value={users.length}    color="blue" />
        <StatCard icon={AlertTriangle} label="Overdue Tasks"  value={overdueTasks}    color="red" />
      </div>

      {/* Store progress */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Store size={15} /> Per-Store Progress
        </h2>
        <div className="space-y-4">
          {storeStats.map(store => (
            <div key={store.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300 font-medium">{store.name}</span>
                <span className="text-slate-400">{store.done} completions · {store.rate}%</span>
              </div>
              <ProgressBar value={store.rate} max={100} color={store.rate >= 75 ? 'green' : store.rate >= 50 ? 'yellow' : 'red'} showLabel={false} />
            </div>
          ))}
          {storeStats.length === 0 && <p className="text-sm text-slate-500">No store data available.</p>}
        </div>
      </div>

      {/* Top performers */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Users size={15} /> Team Performance
        </h2>
        <div className="space-y-2">
          {userStats.map((u, i) => (
            <div key={u.id} className="flex items-center gap-3">
              <span className="w-5 text-xs text-slate-600 font-mono">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300 truncate">{u.full_name}</span>
                  <span className="text-slate-400 shrink-0 ml-2">{u.done} done · {u.points_balance || 0} pts</span>
                </div>
              </div>
            </div>
          ))}
          {userStats.length === 0 && <p className="text-sm text-slate-500">No user data available.</p>}
        </div>
      </div>

      {/* Early completions banner */}
      {earlyCompletions > 0 && (
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-sm text-purple-300">
          ⚡ <strong>{earlyCompletions}</strong> task{earlyCompletions !== 1 ? 's were' : ' was'} completed early this week — great work!
        </div>
      )}
    </div>
  )
}

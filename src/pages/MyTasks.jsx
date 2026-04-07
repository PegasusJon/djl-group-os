import { useEffect, useState } from 'react'
import { CheckSquare, AlertTriangle, Clock, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useTaskStore } from '../store/taskStore'
import { isDueToday, isOverdue, sortTasks } from '../lib/scheduling'
import TaskCard from '../components/TaskCard'
import CreateTaskModal from '../components/CreateTaskModal'

export default function MyTasks() {
  const { profile } = useAuthStore()
  const { tasks, completions, fetchTasks, fetchCompletions, loading, isCompletedInWindow } = useTaskStore()
  const [showCreate, setShowCreate] = useState(false)
  const [showUpcoming, setShowUpcoming] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchTasks(profile.store_id)
      fetchCompletions(profile.store_id, profile.id)
    }
  }, [profile])

  const today = new Date()

  const overdueTasks  = tasks.filter(t => isOverdue(t, today) && !isCompletedInWindow(t.id, today))
  const dueTodayTasks = tasks.filter(t => isDueToday(t, today) && !isCompletedInWindow(t.id, today) && !isOverdue(t, today))
  const completedToday = tasks.filter(t => isDueToday(t, today) && isCompletedInWindow(t.id, today))
  const upcomingTasks = tasks.filter(t => !isDueToday(t, today) && !isOverdue(t, today))

  const total    = tasks.length
  const doneToday = completedToday.length
  const dueCt    = dueTodayTasks.length + overdueTasks.length
  const pct      = total === 0 ? 0 : Math.round((doneToday / Math.max(dueTodayTasks.length + completedToday.length, 1)) * 100)

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-500">Loading tasks…</div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">My Tasks</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-100">{pct}%</p>
            <p className="text-xs text-slate-500">{doneToday} of {doneToday + dueCt} done today</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-surface-card rounded-full overflow-hidden">
        <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      {/* Overdue */}
      {overdueTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-400" />
            <h2 className="text-sm font-semibold text-red-400">Overdue ({overdueTasks.length})</h2>
          </div>
          <div className="space-y-2">
            {overdueTasks.map(t => <TaskCard key={t.id} task={t} overdue />)}
          </div>
        </section>
      )}

      {/* Due Today */}
      {(dueTodayTasks.length > 0 || completedToday.length > 0) && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-brand-400" />
            <h2 className="text-sm font-semibold text-slate-300">Due Today ({dueTodayTasks.length + completedToday.length})</h2>
          </div>
          <div className="space-y-2">
            {dueTodayTasks.map(t => <TaskCard key={t.id} task={t} />)}
            {completedToday.map(t => <TaskCard key={t.id} task={t} />)}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcomingTasks.length > 0 && (
        <section>
          <button onClick={() => setShowUpcoming(s => !s)}
            className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors">
            <CheckSquare size={15} />
            Upcoming ({upcomingTasks.length})
            {showUpcoming ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showUpcoming && (
            <div className="space-y-2">
              {sortTasks(upcomingTasks, today).map(t => <TaskCard key={t.id} task={t} />)}
            </div>
          )}
        </section>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <CheckSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tasks assigned</p>
          <p className="text-xs mt-1">Tasks will appear here once assigned by your manager.</p>
        </div>
      )}
    </div>
  )
}

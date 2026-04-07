import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CheckSquare, Square, ChevronDown, ChevronUp, Clock, Zap, AlertTriangle } from 'lucide-react'
import { useUiStore } from '../store/uiStore'
import { useTaskStore } from '../store/taskStore'
import { getCurrentWindow, wasCompletedEarly } from '../lib/scheduling'

const FREQ_COLORS = {
  daily:     'badge-blue',
  weekly:    'badge-green',
  biweekly:  'badge-purple',
  monthly:   'badge-yellow',
  quarterly: 'badge-red',
}

export default function TaskCard({ task, overdue = false }) {
  const [expanded, setExpanded] = useState(false)
  const openModal  = useUiStore(s => s.openModal)
  const { completions, isCompletedInWindow } = useTaskStore()

  const completed = isCompletedInWindow(task.id)
  const { start, end } = getCurrentWindow(task)

  // Find the completion record for this window
  const windowCompletion = completions.find(c => {
    if (c.task_id !== task.id) return false
    const at = new Date(c.completed_at)
    return at >= start && at <= end
  })

  const isEarly = windowCompletion && wasCompletedEarly(task, windowCompletion.completed_at)

  const handleCheck = () => {
    if (!completed) openModal('completion', { task })
  }

  return (
    <div className={`card transition-all duration-200 ${
      completed ? 'opacity-60' : overdue ? 'border-red-500/50' : ''
    }`}>
      <div className="flex items-start gap-3">
        <button onClick={handleCheck} disabled={completed}
          className={`mt-0.5 shrink-0 transition-colors ${completed ? 'text-green-400 cursor-default' : 'text-slate-500 hover:text-brand-400'}`}>
          {completed ? <CheckSquare size={20} /> : <Square size={20} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
              {task.title}
            </span>
            <span className={FREQ_COLORS[task.frequency] || 'badge-blue'}>
              {task.frequency}
            </span>
            {overdue && !completed && (
              <span className="badge-red flex items-center gap-1">
                <AlertTriangle size={10} /> Overdue
              </span>
            )}
            {isEarly && (
              <span className="badge-purple flex items-center gap-1">
                <Zap size={10} /> Completed early
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              Window: {format(start, 'MMM d')} – {format(end, 'MMM d')}
            </span>
            {windowCompletion && (
              <span className="text-green-400">
                Done {format(parseISO(windowCompletion.completed_at), 'MMM d, h:mm a')}
              </span>
            )}
          </div>
        </div>

        <button onClick={() => setExpanded(e => !e)}
          className="shrink-0 text-slate-600 hover:text-slate-400 transition-colors">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-surface-border space-y-2 text-xs text-slate-400">
          {task.instructions && (
            <div>
              <p className="font-medium text-slate-300 mb-1">Instructions</p>
              <p className="whitespace-pre-line">{task.instructions}</p>
            </div>
          )}
          {windowCompletion?.note && (
            <div>
              <p className="font-medium text-slate-300 mb-1">Completion Note</p>
              <p>{windowCompletion.note}</p>
            </div>
          )}
          {windowCompletion?.attachment_url && (
            <a href={windowCompletion.attachment_url} target="_blank" rel="noreferrer"
              className="text-brand-400 hover:underline">View attachment</a>
          )}
        </div>
      )}
    </div>
  )
}

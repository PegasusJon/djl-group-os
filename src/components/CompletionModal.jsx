import { useState, useRef } from 'react'
import { X, Paperclip, Loader2 } from 'lucide-react'
import { useUiStore } from '../store/uiStore'
import { useAuthStore } from '../store/authStore'
import { useTaskStore } from '../store/taskStore'
import { wasCompletedEarly, getCurrentWindow } from '../lib/scheduling'

export default function CompletionModal() {
  const { modalData, closeModal } = useUiStore()
  const { profile } = useAuthStore()
  const { completeTask, uploadAttachment } = useTaskStore()
  const notify = useUiStore(s => s.notify)

  const [note, setNote]       = useState('')
  const [file, setFile]       = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  const task = modalData?.task
  if (!task) return null

  const now = new Date()
  const { start } = getCurrentWindow(task, now)
  const isEarly = now < start

  const handleSubmit = async () => {
    setLoading(true)
    let fileUrl = null

    if (file) {
      const { url, error } = await uploadAttachment(file, profile.id)
      if (error) {
        notify('File upload failed: ' + error.message, 'error')
        setLoading(false)
        return
      }
      fileUrl = url
    }

    const { error } = await completeTask({
      taskId:         task.id,
      userId:         profile.id,
      storeId:        profile.store_id,
      note,
      fileUrl,
      earlyCompletion: isEarly,
    })

    if (error) {
      notify('Failed to complete task: ' + error.message, 'error')
    } else {
      notify(isEarly ? '⚡ Task completed early! +15 pts' : 'Task completed! +10 pts', 'success')
      closeModal()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-200">Complete Task</h2>
            <p className="text-sm text-slate-400 mt-0.5 truncate">{task.title}</p>
          </div>
          <button onClick={closeModal} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>

        {isEarly && (
          <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300">
            ⚡ You're completing this early — you'll earn <strong>15 bonus points</strong>!
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="label">Note (optional)</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Add a note about this completion…"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Attachment (optional)</label>
            <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
            <button onClick={() => fileRef.current.click()}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
              <Paperclip size={14} />
              {file ? file.name : 'Attach a file…'}
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={closeModal} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Mark Complete'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'

export default function UpdateBanner() {
  const [status, setStatus] = useState(null) // 'available' | 'downloaded' | null

  useEffect(() => {
    if (!window.electron) return

    // Subscribe to future events
    window.electron.onUpdateAvailable(()  => setStatus('available'))
    window.electron.onUpdateDownloaded(() => setStatus('downloaded'))

    // Also ask main process for any state that already fired before we mounted
    window.electron.getUpdateStatus().then(s => {
      if (s) setStatus(s)
    })
  }, [])

  if (!status) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border border-brand-600/50 bg-brand-600/20 shadow-2xl text-sm text-slate-200 backdrop-blur-sm whitespace-nowrap">
      {status === 'available' ? (
        <>
          <Download size={15} className="text-brand-400 shrink-0 animate-bounce" />
          <span>A new update is downloading in the background…</span>
        </>
      ) : (
        <>
          <RefreshCw size={15} className="text-green-400 shrink-0" />
          <span>Update ready to install.</span>
          <button
            onClick={() => window.electron.installUpdate()}
            className="btn-primary text-xs px-3 py-1.5 ml-1">
            Restart &amp; Install
          </button>
        </>
      )}
      <button onClick={() => setStatus(null)} className="text-slate-500 hover:text-slate-300 ml-1">
        <X size={14} />
      </button>
    </div>
  )
}

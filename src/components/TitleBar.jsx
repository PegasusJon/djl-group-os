import { Minus, Square, X } from 'lucide-react'

export default function TitleBar() {
  const isElectron = !!window.electron

  return (
    <div className="h-10 bg-surface-card border-b border-surface-border flex items-center justify-between px-4 select-none"
         style={{ WebkitAppRegion: 'drag' }}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center text-xs font-bold text-white">D</div>
        <span className="text-sm font-semibold text-slate-200">DJL Group OS</span>
      </div>
      {isElectron && (
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
          <button onClick={() => window.electron.minimize()}
            className="w-8 h-7 flex items-center justify-center rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <Minus size={12} />
          </button>
          <button onClick={() => window.electron.maximize()}
            className="w-8 h-7 flex items-center justify-center rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <Square size={10} />
          </button>
          <button onClick={() => window.electron.close()}
            className="w-8 h-7 flex items-center justify-center rounded hover:bg-red-500 text-slate-400 hover:text-white transition-colors">
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

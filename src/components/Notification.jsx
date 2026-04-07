import { useUiStore } from '../store/uiStore'
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react'

const icons = {
  success: <CheckCircle size={16} className="text-green-400" />,
  error:   <XCircle size={16} className="text-red-400" />,
  warning: <AlertCircle size={16} className="text-yellow-400" />,
  info:    <Info size={16} className="text-blue-400" />,
}

const colors = {
  success: 'border-green-500/30 bg-green-500/10',
  error:   'border-red-500/30 bg-red-500/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
  info:    'border-blue-500/30 bg-blue-500/10',
}

export default function Notification() {
  const notification = useUiStore(s => s.notification)
  if (!notification) return null

  const { message, type = 'info' } = notification

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium text-slate-200 animate-in slide-in-from-bottom-2 duration-300 ${colors[type]}`}>
      {icons[type]}
      {message}
    </div>
  )
}

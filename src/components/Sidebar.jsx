import { NavLink, useNavigate } from 'react-router-dom'
import {
  CheckSquare, LayoutDashboard, History, Target,
  Gift, BookOpen, Users, Store, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'

const NAV = [
  { to: '/tasks',     icon: CheckSquare,    label: 'My Tasks',      roles: [] },
  { to: '/dashboard', icon: LayoutDashboard,label: 'Dashboard',     roles: ['owner','district_manager','manager'] },
  { to: '/history',   icon: History,        label: 'Task History',  roles: [] },
  { to: '/goals',     icon: Target,         label: 'Goals',         roles: [] },
  { to: '/rewards',   icon: Gift,           label: 'Rewards',       roles: [] },
  { to: '/knowledge', icon: BookOpen,       label: 'Knowledge Hub', roles: [] },
  { to: '/stores',    icon: Store,           label: 'Stores',        roles: ['owner','district_manager','manager'] },
  { to: '/users',     icon: Users,          label: 'Users',         roles: ['owner','district_manager'] },
]

export default function Sidebar() {
  const { profile, signOut } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUiStore()
  const navigate = useNavigate()

  const role = profile?.role || ''
  const items = NAV.filter(n => n.roles.length === 0 || n.roles.includes(role))

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className={`flex flex-col bg-surface-card border-r border-surface-border transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-14'}`}>
      <div className="flex-1 overflow-y-auto py-3">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-brand-600/20 text-brand-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }>
            <Icon size={16} className="shrink-0" />
            {sidebarOpen && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </div>

      {/* User info + logout */}
      <div className="border-t border-surface-border p-3 space-y-2">
        {sidebarOpen && profile && (
          <div className="px-1">
            <p className="text-xs font-medium text-slate-200 truncate">{profile.full_name}</p>
            <p className="text-xs text-slate-500 capitalize">{profile.role?.replace('_',' ')}</p>
            <p className="text-xs text-slate-500 truncate">{profile.stores?.name}</p>
          </div>
        )}
        <button onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut size={16} className="shrink-0" />
          {sidebarOpen && <span>Sign Out</span>}
        </button>
        <button onClick={toggleSidebar}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          {sidebarOpen && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}

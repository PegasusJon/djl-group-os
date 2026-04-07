import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import MyTasks from './pages/MyTasks'
import Dashboard from './pages/Dashboard'
import TaskHistory from './pages/TaskHistory'
import Goals from './pages/Goals'
import Rewards from './pages/Rewards'
import KnowledgeHub from './pages/KnowledgeHub'
import UserManagement from './pages/UserManagement'
import StoreManagement from './pages/StoreManagement'
import Notification from './components/Notification'

function PrivateRoute({ children, roles }) {
  const { user, profile, loading } = useAuthStore()
  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const init = useAuthStore(s => s.init)

  useEffect(() => { init() }, [init])

  return (
    <>
      <Notification />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/tasks" replace />} />
          <Route path="tasks" element={<MyTasks />} />
          <Route path="dashboard" element={
            <PrivateRoute roles={['owner','district_manager','manager']}>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="history" element={<TaskHistory />} />
          <Route path="goals" element={<Goals />} />
          <Route path="rewards" element={<Rewards />} />
          <Route path="knowledge" element={<KnowledgeHub />} />
          <Route path="users" element={
            <PrivateRoute roles={['owner','district_manager']}>
              <UserManagement />
            </PrivateRoute>
          } />
          <Route path="stores" element={
            <PrivateRoute roles={['owner','district_manager','manager']}>
              <StoreManagement />
            </PrivateRoute>
          } />
        </Route>
      </Routes>
    </>
  )
}

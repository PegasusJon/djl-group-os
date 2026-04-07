import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TitleBar from './TitleBar'
import CompletionModal from './CompletionModal'
import RedeemModal from './RedeemModal'
import { useUiStore } from '../store/uiStore'

export default function Layout() {
  const { activeModal } = useUiStore()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-surface p-6">
          <Outlet />
        </main>
      </div>
      {activeModal === 'completion' && <CompletionModal />}
      {activeModal === 'redeem'     && <RedeemModal />}
    </div>
  )
}

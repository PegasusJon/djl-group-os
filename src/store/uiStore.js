import { create } from 'zustand'

export const useUiStore = create((set) => ({
  sidebarOpen:    true,
  activeModal:    null,   // 'completion' | 'redeem' | null
  modalData:      null,
  notification:   null,

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  openModal: (name, data = null) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  notify: (message, type = 'info') => {
    set({ notification: { message, type } })
    setTimeout(() => set({ notification: null }), 4000)
  },
}))

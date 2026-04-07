import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user:    null,
  profile: null,
  loading: true,
  error:   null,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await get().fetchProfile(session.user)
    } else {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await get().fetchProfile(session.user)
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, loading: false })
      }
    })
  },

  fetchProfile: async (user) => {
    const { data, error } = await supabase
      .from('users')
      .select('*, stores(*)')
      .eq('id', user.id)
      .single()

    if (error) {
      set({ user, profile: null, loading: false, error: error.message })
    } else {
      set({ user, profile: data, loading: false, error: null })
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) set({ loading: false, error: error.message })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },

  hasRole: (...roles) => {
    const profile = get().profile
    return profile ? roles.includes(profile.role) : false
  },
}))

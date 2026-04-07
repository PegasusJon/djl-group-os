import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { sortTasks, isDueToday, isOverdue, getCurrentWindow } from '../lib/scheduling'

export const useTaskStore = create((set, get) => ({
  tasks:       [],
  completions: [],
  loading:     false,
  error:       null,

  fetchTasks: async (storeId) => {
    set({ loading: true })
    let q = supabase.from('tasks').select('*').eq('active', true)
    if (storeId) q = q.eq('store_id', storeId)

    const { data, error } = await q
    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ tasks: data, loading: false })
    }
  },

  fetchCompletions: async (storeId, userId) => {
    let q = supabase
      .from('task_completions')
      .select('*')
      .gte('completed_at', new Date(Date.now() - 90 * 86400000).toISOString())

    if (storeId) q = q.eq('store_id', storeId)
    if (userId)  q = q.eq('completed_by', userId)

    const { data } = await q
    if (data) set({ completions: data })
  },

  completeTask: async ({ taskId, userId, storeId, note, fileUrl, earlyCompletion }) => {
    const { error, data } = await supabase
      .from('task_completions')
      .insert({
        task_id:          taskId,
        completed_by:     userId,
        store_id:         storeId,
        note:             note || null,
        attachment_url:   fileUrl || null,
        early_completion: earlyCompletion || false,
        completed_at:     new Date().toISOString(),
      })
      .select()
      .single()

    if (!error && data) {
      set(state => ({ completions: [...state.completions, data] }))
      // Award points
      await supabase.from('points_ledger').insert({
        user_id:     userId,
        points:      earlyCompletion ? 15 : 10,
        reason:      earlyCompletion ? 'early_completion' : 'task_completion',
        reference_id: data.id,
      })
    }
    return { error }
  },

  uploadAttachment: async (file, userId) => {
    const ext  = file.name.split('.').pop()
    const path = `attachments/${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('attachments').upload(path, file)
    if (error) return { url: null, error }
    const { data } = supabase.storage.from('attachments').getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  },

  isCompletedInWindow: (taskId, today = new Date()) => {
    const { tasks, completions } = get()
    const task = tasks.find(t => t.id === taskId)
    if (!task) return false
    const { start, end } = getCurrentWindow(task, today)
    return completions.some(c =>
      c.task_id === taskId &&
      new Date(c.completed_at) >= start &&
      new Date(c.completed_at) <= end
    )
  },

  getSortedTasks: (today = new Date()) => sortTasks(get().tasks, today),

  getDueTodayTasks: (today = new Date()) =>
    get().tasks.filter(t => isDueToday(t, today) && !get().isCompletedInWindow(t.id, today)),

  getOverdueTasks: (today = new Date()) =>
    get().tasks.filter(t => isOverdue(t, today)),
}))

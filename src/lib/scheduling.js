import {
  startOfDay, endOfDay, addDays, addWeeks, addMonths,
  getDay, getDate, getMonth, isWithinInterval,
  differenceInDays, isBefore, isAfter, parseISO, format,
} from 'date-fns'

/**
 * WINDOW-KEY SCHEDULING
 *
 * Each task has a frequency and an anchor date (first_due_date).
 * A "window" is the period during which a task is considered due.
 * A task is completed early if it's done before the window opens.
 *
 * Frequencies:
 *   daily      → window opens every day at midnight, closes at EOD
 *   weekly     → window: Mon–Sun of the anchor's week, repeats weekly
 *   biweekly   → window: 14-day period starting on anchor
 *   monthly    → window: calendar month of anchor day
 *   quarterly  → window: 90-day block from anchor
 */

const WINDOW_DAYS = {
  daily:     1,
  weekly:    7,
  biweekly:  14,
  monthly:   30,
  quarterly: 90,
}

/**
 * Compute the current window [start, end] for a task given today.
 */
export function getCurrentWindow(task, today = new Date()) {
  const anchor = parseISO(task.first_due_date)
  const freq   = task.frequency
  const dayLen = WINDOW_DAYS[freq] ?? 1

  if (freq === 'daily') {
    return { start: startOfDay(today), end: endOfDay(today) }
  }

  // Find which cycle we're in
  const daysSinceAnchor = differenceInDays(startOfDay(today), startOfDay(anchor))
  if (daysSinceAnchor < 0) {
    // Before first due date — window hasn't opened yet
    return { start: startOfDay(anchor), end: endOfDay(addDays(anchor, dayLen - 1)) }
  }

  const cycleIndex = Math.floor(daysSinceAnchor / dayLen)
  const windowStart = addDays(startOfDay(anchor), cycleIndex * dayLen)
  const windowEnd   = endOfDay(addDays(windowStart, dayLen - 1))

  return { start: windowStart, end: windowEnd }
}

/**
 * Is the task due today (window includes today)?
 */
export function isDueToday(task, today = new Date()) {
  const { start, end } = getCurrentWindow(task, today)
  return isWithinInterval(startOfDay(today), { start, end })
}

/**
 * Is the task overdue (window has passed and no completion recorded)?
 */
export function isOverdue(task, today = new Date()) {
  const { end } = getCurrentWindow(task, today)
  return isAfter(startOfDay(today), end) && !task.last_completed_at
}

/**
 * Was the task completed early (completed before current window opened)?
 */
export function wasCompletedEarly(task, completedAt) {
  if (!completedAt) return false
  const completedDate = typeof completedAt === 'string' ? parseISO(completedAt) : completedAt
  const { start } = getCurrentWindow(task, completedDate)
  return isBefore(completedDate, start)
}

/**
 * Get the next due date after today.
 */
export function getNextDueDate(task, today = new Date()) {
  const { end } = getCurrentWindow(task, today)
  const dayLen = WINDOW_DAYS[task.frequency] ?? 1
  return addDays(endOfDay(end), 1)
}

/**
 * Sort tasks: overdue first, then due today, then upcoming by next due date.
 */
export function sortTasks(tasks, today = new Date()) {
  return [...tasks].sort((a, b) => {
    const aOverdue  = isOverdue(a, today)
    const bOverdue  = isOverdue(b, today)
    const aDueToday = isDueToday(a, today)
    const bDueToday = isDueToday(b, today)

    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1
    if (aDueToday && !bDueToday) return -1
    if (!aDueToday && bDueToday) return 1

    const aNext = getNextDueDate(a, today)
    const bNext = getNextDueDate(b, today)
    return aNext - bNext
  })
}

/**
 * Calculate completion rate for a set of completions vs expected.
 */
export function calcCompletionRate(completions, tasks, startDate, endDate) {
  const days = differenceInDays(endDate, startDate) + 1
  let expected = 0
  let completed = 0

  tasks.forEach(task => {
    const dayLen = WINDOW_DAYS[task.frequency] ?? 1
    const windows = Math.ceil(days / dayLen)
    expected += windows

    const taskCompletions = completions.filter(c => c.task_id === task.id)
    completed += Math.min(taskCompletions.length, windows)
  })

  return expected === 0 ? 0 : Math.round((completed / expected) * 100)
}

export { WINDOW_DAYS }

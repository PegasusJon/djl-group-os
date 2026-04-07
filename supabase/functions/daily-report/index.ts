// Supabase Edge Function: daily-report
// Schedule: "0 18 * * *" (6pm UTC daily)
// Sends per-store EOD summary to Microsoft Teams webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async () => {
  const today = new Date().toISOString().split('T')[0]
  const start = `${today}T00:00:00Z`
  const end   = `${today}T23:59:59Z`

  // Get all stores with a Teams webhook configured
  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, teams_webhook_url')
    .eq('active', true)
    .not('teams_webhook_url', 'is', null)

  if (!stores?.length) return new Response('No stores with webhooks', { status: 200 })

  const results = await Promise.allSettled(stores.map(async (store) => {
    // Count tasks due today
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('store_id', store.id)
      .eq('active', true)

    const taskIds = tasks?.map(t => t.id) || []

    // Count completions today
    const { count: completedCount } = await supabase
      .from('task_completions')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id)
      .gte('completed_at', start)
      .lte('completed_at', end)

    const due       = taskIds.length
    const completed = completedCount || 0
    const rate      = due === 0 ? 0 : Math.round((completed / due) * 100)

    // Upsert EOD snapshot
    await supabase.from('eod_snapshots').upsert({
      store_id:        store.id,
      snapshot_date:   today,
      tasks_due:       due,
      tasks_completed: completed,
    }, { onConflict: 'store_id,snapshot_date' })

    // Top performers today
    const { data: topUsers } = await supabase
      .from('task_completions')
      .select('completed_by, users!completed_by(full_name)')
      .eq('store_id', store.id)
      .gte('completed_at', start)
      .lte('completed_at', end)

    const userCounts: Record<string, { name: string; count: number }> = {}
    topUsers?.forEach(c => {
      const id = c.completed_by
      if (!userCounts[id]) userCounts[id] = { name: (c.users as any)?.full_name || 'Unknown', count: 0 }
      userCounts[id].count++
    })
    const top3 = Object.values(userCounts).sort((a, b) => b.count - a.count).slice(0, 3)

    // Build Teams Adaptive Card payload
    const color = rate >= 80 ? '00b050' : rate >= 50 ? 'ffc000' : 'ff0000'
    const payload = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: `📊 Daily Report — ${store.name}`,
              weight: 'Bolder',
              size: 'Medium',
            },
            {
              type: 'TextBlock',
              text: today,
              isSubtle: true,
              spacing: 'None',
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Tasks Due',       value: String(due) },
                { title: 'Completed',        value: String(completed) },
                { title: 'Completion Rate',  value: `${rate}%` },
              ],
            },
            ...(top3.length ? [{
              type: 'TextBlock',
              text: '🏆 Top Performers',
              weight: 'Bolder',
              spacing: 'Medium',
            }, {
              type: 'FactSet',
              facts: top3.map((u, i) => ({ title: `#${i + 1} ${u.name}`, value: `${u.count} tasks` })),
            }] : []),
          ],
        },
      }],
    }

    const res = await fetch(store.teams_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    return { store: store.name, status: res.status }
  }))

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  })
})

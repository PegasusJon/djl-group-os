import { useState } from 'react'
import { X, Loader2, Gift } from 'lucide-react'
import { useUiStore } from '../store/uiStore'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'

export default function RedeemModal() {
  const { modalData, closeModal } = useUiStore()
  const { profile, fetchProfile, user } = useAuthStore()
  const notify = useUiStore(s => s.notify)
  const [loading, setLoading] = useState(false)

  const reward = modalData?.reward
  if (!reward) return null

  const canAfford = (profile?.points_balance || 0) >= reward.cost

  const handleRedeem = async () => {
    if (!canAfford) return
    setLoading(true)

    const { error } = await supabase.from('points_ledger').insert({
      user_id: profile.id,
      points:  -reward.cost,
      reason:  'redemption',
      reference_id: reward.id,
    })

    if (error) {
      notify('Redemption failed: ' + error.message, 'error')
    } else {
      await supabase.from('redemptions').insert({
        user_id:   profile.id,
        reward_id: reward.id,
        store_id:  profile.store_id,
      })
      await fetchProfile(user)
      notify(`Redeemed: ${reward.name}!`, 'success')
      closeModal()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-200">Redeem Reward</h2>
          <button onClick={closeModal} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>

        <div className="flex flex-col items-center py-4 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-brand-600/20 flex items-center justify-center">
            <Gift size={28} className="text-brand-400" />
          </div>
          <p className="text-lg font-semibold text-slate-200">{reward.name}</p>
          <p className="text-sm text-slate-400 text-center">{reward.description}</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-yellow-400">{reward.cost}</span>
            <span className="text-slate-400">pts</span>
          </div>
          <p className="text-xs text-slate-500">Your balance: <strong className="text-slate-300">{profile?.points_balance || 0} pts</strong></p>
          {!canAfford && <p className="text-xs text-red-400">Insufficient points</p>}
        </div>

        <div className="flex gap-3 mt-2">
          <button onClick={closeModal} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleRedeem} disabled={loading || !canAfford} className="btn-primary flex-1">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Redeeming…</> : 'Confirm Redeem'}
          </button>
        </div>
      </div>
    </div>
  )
}

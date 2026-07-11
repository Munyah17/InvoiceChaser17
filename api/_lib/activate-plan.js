// Server-authoritative plan activation. The ONLY place a paid plan is written
// to profiles/subscriptions — clients can no longer update their own plan
// (RLS column grants block it), so every payment path funnels through here
// after the payment has been confirmed with the gateway server-side.

export async function activatePlan(supabase, {
  userId,
  planId,
  method,
  transactionRef,
  amount = 0,
  currency = 'USD',
  stripeCustomerId = null,
  stripeSubscriptionId = null,
}) {
  if (!supabase || !userId || userId === 'guest' || !planId) {
    return { activated: false, reason: 'missing userId or planId' }
  }

  // Idempotency: if this transaction was already recorded, do nothing.
  if (transactionRef) {
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('transaction_ref', transactionRef)
      .eq('status', 'completed')
      .maybeSingle()
    if (existing) return { activated: true, alreadyProcessed: true }
  }

  await supabase
    .from('profiles')
    .update({ plan: planId, updated_at: new Date().toISOString() })
    .eq('id', userId)

  const isSubscription = ['starter', 'professional', 'business'].includes(planId)

  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan: planId,
      status: 'active',
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      current_period_start: isSubscription ? new Date().toISOString() : null,
      current_period_end: isSubscription
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (transactionRef) {
    await supabase.from('payments').insert({
      user_id: userId,
      amount: amount / (method === 'stripe' ? 100 : 1),
      currency,
      method,
      status: 'completed',
      transaction_ref: transactionRef,
      metadata: { plan_id: planId, customer_id: stripeCustomerId, subscription_id: stripeSubscriptionId },
    })
  }

  return { activated: true }
}

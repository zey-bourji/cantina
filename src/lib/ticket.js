import { supabase } from './supabase'

export async function fetchTicket(orderId) {
  const { data } = await supabase
    .from('orders')
    .select('id, number, total, pickup_day, created_at, order_items(label, qty, unit_price)')
    .eq('id', orderId)
    .single()
  return data
}

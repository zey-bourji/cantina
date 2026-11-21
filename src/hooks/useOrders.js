import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const dateStr = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('sv-SE')
}
export const today = () => dateStr(0)

export const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`
export const STATUS = {
  commandee: 'Commandée',
  en_preparation: 'En préparation',
  prete: 'Prête',
  recuperee: 'Récupérée',
  annulee: 'Annulée',
}

// Quantités à préparer par plat (hors commandes annulées)
export function tally(orders) {
  const m = {}
  for (const o of orders) {
    if (o.status === 'annulee') continue
    for (const i of o.order_items || []) m[i.label] = (m[i.label] || 0) + i.qty
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}

export function useOrders(day, intervalMs = 5000) {
  const [orders, setOrders] = useState([])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select(
        'id, number, status, total, pickup_day, arriving, created_at, payment_method, walkin_name, profiles(full_name), order_items(label, qty)'
      )
      .eq('pickup_day', day)
      .order('created_at')
    setOrders(data || [])
  }, [day])

  useEffect(() => {
    load()
    const t = setInterval(load, intervalMs)
    return () => clearInterval(t)
  }, [load, intervalMs])

  return { orders, reload: load }
}

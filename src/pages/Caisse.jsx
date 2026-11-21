import { useState } from 'react'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'
import { useOrders, today, fcfa, STATUS } from '../hooks/useOrders'

const NEXT = {
  commandee: ['prete', 'Marquer prête'],
  en_preparation: ['prete', 'Marquer prête'],
  prete: ['recuperee', 'Remise au client'],
}

export default function Caisse() {
  const { orders, reload } = useOrders(today())
  const [q, setQ] = useState('')

  async function setStatus(id, status) {
    await supabase.from('orders').update({ status }).eq('id', id)
    reload()
  }

  const list = orders
    .filter((o) => !['recuperee', 'annulee'].includes(o.status))
    .filter((o) => !q || String(o.number).includes(q))

  return (
    <div>
      <Header />
      <main style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
        <h2>Caisse</h2>
        <input
          placeholder="Numéro de commande"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginBottom: 16, padding: 8 }}
        />
        {list.length === 0 && <p>Aucune commande en cours.</p>}
        <div style={{ display: 'grid', gap: 12 }}>
          {list.map((o) => (
            <div
              key={o.id}
              style={{
                border: o.arriving ? '2px solid #e65100' : '1px solid #e5e0d8',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <strong>#{o.number}</strong> · {o.profiles?.full_name || 'Client'} ·{' '}
              {STATUS[o.status]}
              {o.arriving && (
                <strong style={{ color: '#e65100' }}> · Arrive dans 5 min</strong>
              )}
              <ul style={{ margin: '8px 0' }}>
                {(o.order_items || []).map((i, k) => (
                  <li key={k}>
                    {i.qty} × {i.label}
                  </li>
                ))}
              </ul>
              <div>
                Total : {fcfa(o.total)}{' '}
                {NEXT[o.status] && (
                  <button onClick={() => setStatus(o.id, NEXT[o.status][0])}>
                    {NEXT[o.status][1]}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

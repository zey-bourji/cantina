import { useState } from 'react'
import Header from '../components/Header'
import { useOrders, dateStr, tally, STATUS } from '../hooks/useOrders'

export default function Cuisine() {
  const [offset, setOffset] = useState(0)
  const { orders } = useOrders(dateStr(offset))
  const recap = tally(orders)
  const toPrepare = orders.filter((o) => ['commandee', 'en_preparation'].includes(o.status))

  return (
    <div>
      <Header />
      <main style={{ padding: 20, maxWidth: 1000, margin: '0 auto', fontSize: 20 }}>
        <h2>Cuisine</h2>
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setOffset(0)} style={{ fontWeight: offset === 0 ? 700 : 400 }}>
            Aujourd'hui
          </button>{' '}
          <button onClick={() => setOffset(1)} style={{ fontWeight: offset === 1 ? 700 : 400 }}>
            Demain
          </button>
        </div>

        <h3>À préparer ({offset === 0 ? "aujourd'hui" : 'demain'})</h3>
        {recap.length === 0 && <p>Aucune réservation.</p>}
        <ul>
          {recap.map(([label, qty]) => (
            <li key={label}>
              <strong>{qty}</strong> × {label}
            </li>
          ))}
        </ul>

        {offset === 0 && (
          <>
            <h3>Commandes en attente</h3>
            {toPrepare.length === 0 && <p>Rien en attente.</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {toPrepare.map((o) => (
                <div key={o.id} style={{ border: '1px solid #e5e0d8', borderRadius: 12, padding: 12 }}>
                  <strong>#{o.number}</strong> · {STATUS[o.status]}
                  {o.arriving && <strong style={{ color: '#e65100' }}> · arrive !</strong>}
                  <ul>
                    {(o.order_items || []).map((i, k) => (
                      <li key={k}>
                        {i.qty} × {i.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

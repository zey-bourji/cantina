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
      <main className="container" style={{ fontSize: '1.15rem' }}>
        <h2>Cuisine</h2>
        <div className="tabs">
          <button className={offset === 0 ? 'on' : ''} onClick={() => setOffset(0)}>Aujourd'hui</button>
          <button className={offset === 1 ? 'on' : ''} onClick={() => setOffset(1)}>Demain</button>
        </div>

        <h3>À préparer ({offset === 0 ? "aujourd'hui" : 'demain'})</h3>
        {recap.length === 0 && <p className="muted">Aucune réservation.</p>}
        <div className="recap">
          {recap.map(([label, qty]) => (
            <div key={label} className="recap-item"><b>{qty}</b><span>{label}</span></div>
          ))}
        </div>

        {offset === 0 && (
          <>
            <h3 style={{ marginTop: 24 }}>Commandes en attente</h3>
            {toPrepare.length === 0 && <p className="muted">Rien en attente.</p>}
            <div className="tickets">
              {toPrepare.map((o) => (
                <div key={o.id} className={`card ticket-card ${o.arriving ? 'arriving' : ''}`}>
                  <div className="ticket-head">
                    <strong style={{ fontSize: '1.4rem' }}>#{o.number}</strong>
                    <span className="pill pill-mint">{STATUS[o.status]}</span>
                  </div>
                  {o.arriving && <div className="arrive-tag">Le client arrive !</div>}
                  <ul>
                    {(o.order_items || []).map((i, k) => (
                      <li key={k}>{i.qty} × {i.label}</li>
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

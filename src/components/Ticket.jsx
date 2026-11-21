import { useState } from 'react'
import { supabase } from '../lib/supabase'

const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`

const css = `
.rc-overlay { position: fixed; inset: 0; z-index: 60; overflow: auto; padding: 28px 14px 40px; display: grid; place-items: start center; background: radial-gradient(ellipse at 50% 18%, #fff6dc 0%, #f6ead2 55%, #ecdcbc 100%); animation: rc-fade 0.25s ease-out; }
@keyframes rc-fade { from { opacity: 0; } to { opacity: 1; } }
.rc-machine { position: relative; z-index: 2; height: 34px; border-radius: 10px; background: linear-gradient(#fff0b8, #f6c453 55%, #e0a02c); box-shadow: 0 0 46px rgba(255, 196, 66, 0.75), 0 8px 16px rgba(120, 80, 0, 0.25), inset 0 2px 0 #fffbe6; }
.rc-machine::after { content: ''; position: absolute; left: 7%; right: 7%; bottom: 7px; height: 5px; border-radius: 3px; background: #7a5200; opacity: 0.85; }
.rc-slot { overflow: hidden; margin: 0 6%; padding-bottom: 10px; }
.rc-paper { animation: rc-feed 2.6s steps(26, end) both; }
@keyframes rc-feed { from { transform: translateY(-100%); } to { transform: translateY(0); } }
.rc-sheet { background: linear-gradient(90deg, #f6efe0, #fffdf6 12%, #fffdf6 88%, #f3ead6); color: #151515; font-family: 'DM Sans', system-ui, sans-serif; padding: 22px 20px 38px; font-size: 14px;
  -webkit-mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 16px 100%;
  mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 16px 100%; }
.rc-sheet h3 { margin: 0; text-align: center; font-size: 1.5rem; letter-spacing: 0.04em; font-weight: 800; }
.rc-sheet small { color: #666; }
.rc-sheet hr { border: 0; border-top: 1px solid #222; margin: 10px 0; }
.rc-sheet hr.thin { border-top: 1px dashed #bbb; }
.rc-row { display: flex; justify-content: space-between; gap: 10px; padding: 2px 0; }
.rc-row.head { font-weight: 700; }
.rc-row.total { font-weight: 800; font-size: 1.1rem; }
.rc-num { text-align: center; font-size: 2.1rem; font-weight: 800; letter-spacing: -0.02em; margin: 4px 0 0; }
.rc-bar { display: block; width: 100%; height: 44px; margin-top: 14px; }
.rc-actions { opacity: 0; animation: rc-fade 0.4s ease-out 2.7s forwards; text-align: center; margin-top: 16px; display: grid; gap: 8px; justify-items: center; }
@media (prefers-reduced-motion: reduce) { .rc-paper { animation: none; } .rc-actions { animation: none; opacity: 1; } }
`

// Code-barres décoratif dérivé du numéro de commande
function Barcode({ seed }) {
  const digits = String(seed).padStart(6, '0') + '4093'
  let x = 0
  const bars = []
  for (let i = 0; i < 46; i++) {
    const d = Number(digits[i % digits.length]) + i * 3
    const w = 1 + (d % 3)
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y="0" width={w} height="44" fill="#111" />)
    x += w + 1
  }
  return (
    <svg className="rc-bar" viewBox={`0 0 ${x} 44`} preserveAspectRatio="none" aria-hidden="true">
      {bars}
    </svg>
  )
}

export default function Ticket({ ticket, onClose }) {
  const [sent, setSent] = useState(false)
  if (!ticket) return null
  async function arrive() {
    const { error } = await supabase.rpc('notify_arrival', { p_order: ticket.id })
    if (!error) setSent(true)
  }
  const date = new Date(ticket.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  const pickup = ticket.pickup_day
    ? new Date(`${ticket.pickup_day}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : null
  const items = ticket.order_items || []
  const lines = items.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const remise = Math.max(0, lines - ticket.total)
  return (
    <div className="rc-overlay">
      <style>{css}</style>
      <div style={{ width: 'min(360px, 100%)' }}>
        <div className="rc-machine" />
        <div className="rc-slot">
          <div className="rc-paper">
            <div className="rc-sheet">
              <h3>REÇU</h3>
              <div style={{ textAlign: 'center' }}>
                <small>Cantina · la cantine de Vatel</small>
              </div>
              <hr />
              <div style={{ textAlign: 'center' }}>
                <small>Numéro de commande</small>
                <div className="rc-num">#{ticket.number}</div>
                <small>{date}</small>
                {pickup && (
                  <div>
                    <small>Retrait : {pickup}</small>
                  </div>
                )}
              </div>
              <hr />
              <div className="rc-row head">
                <span>Description</span>
                <span>Prix</span>
              </div>
              <div style={{ height: 6 }} />
              {items.map((i, k) => (
                <div key={k} className="rc-row">
                  <span>
                    {i.qty} × {i.label}
                  </span>
                  <span>{(i.qty * i.unit_price).toLocaleString('fr-FR')}</span>
                </div>
              ))}
              <hr className="thin" />
              <div className="rc-row">
                <span>Sous-total</span>
                <span>{fcfa(lines)}</span>
              </div>
              {remise > 0 && (
                <div className="rc-row">
                  <span>Remise fidélité</span>
                  <span>- {fcfa(remise)}</span>
                </div>
              )}
              <div className="rc-row total">
                <span>Total payé</span>
                <span>{fcfa(ticket.total)}</span>
              </div>
              <Barcode seed={ticket.number} />
              <div style={{ textAlign: 'center', marginTop: 6 }}>
                <small>Montre ce numéro à la caisse. Bon appétit !</small>
              </div>
            </div>
          </div>
        </div>
        <div className="rc-actions">
          {ticket.id && (
            <button className="btn-coral btn-big" onClick={arrive} disabled={sent}>
              {sent ? 'La caisse est prévenue ✔' : "J'arrive dans 5 min"}
            </button>
          )}
          <button className="btn-big" onClick={onClose}>
            C'est noté
          </button>
        </div>
      </div>
    </div>
  )
}

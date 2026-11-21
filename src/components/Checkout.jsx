import { useState } from 'react'
import { fcfa } from '../hooks/useOrders'

const METHODS = [
  ['solde', 'Mon solde Cantina', '#ffc244'],
  ['wave', 'Wave', '#1dc8ff'],
  ['orange_money', 'Orange Money', '#ff7900'],
  ['carte', 'Carte bancaire', '#6b7280'],
]
const mark = { solde: 'C', wave: 'W', orange_money: 'O', carte: '💳' }

// Fenêtre de paiement. Wave, Orange Money et carte sont simulés (aucun vrai argent).
export default function Checkout({ total, balance, onPay, onTopUp, onClose, busy, error, noSolde }) {
  const [method, setMethod] = useState(noSolde ? 'wave' : 'solde')
  const methods = noSolde ? METHODS.filter(([k]) => k !== 'solde') : METHODS
  const [phone, setPhone] = useState('')
  const [card, setCard] = useState({ num: '', exp: '', cvc: '' })
  const [waiting, setWaiting] = useState(false)

  const short = method === 'solde' && Number(balance || 0) < total
  const phoneOk = /^\d{8,10}$/.test(phone.replace(/\s/g, ''))
  const cardOk = card.num.replace(/\s/g, '').length >= 12 && card.exp.length >= 4 && card.cvc.length >= 3
  const ready = method === 'solde' ? !short : method === 'carte' ? cardOk : phoneOk

  function pay() {
    if (method === 'solde') return onPay('solde')
    setWaiting(true)
    setTimeout(async () => {
      await onPay(method)
      setWaiting(false)
    }, 1600)
  }

  return (
    <div className="co-overlay" onClick={onClose}>
      <div className="co-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="co-head">
          <h3 style={{ margin: 0 }}>Paiement</h3>
          <button className="btn-light" onClick={onClose} disabled={waiting}>Fermer</button>
        </div>
        <div className="co-total">{fcfa(total)}</div>

        <div className="methods">
          {methods.map(([k, label, color]) => (
            <button key={k} className={`method ${method === k ? 'on' : ''}`} onClick={() => !waiting && setMethod(k)}>
              <span className="method-dot" style={{ background: color }}>{mark[k]}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>
                {label}
                {k === 'solde' && <small className="muted" style={{ display: 'block' }}>Disponible : {fcfa(balance)}</small>}
              </span>
              <span className="method-radio" />
            </button>
          ))}
        </div>

        {(method === 'wave' || method === 'orange_money') && (
          <div style={{ marginTop: 12 }}>
            <input placeholder={`Numéro ${method === 'wave' ? 'Wave' : 'Orange Money'}`} inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '100%' }} />
            <small className="muted">Tu recevras une demande de confirmation sur ton téléphone (simulée).</small>
          </div>
        )}
        {method === 'carte' && (
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <input placeholder="Numéro de carte" inputMode="numeric" value={card.num} onChange={(e) => setCard({ ...card, num: e.target.value })} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="MM/AA" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} style={{ flex: 1, minWidth: 0 }} />
              <input placeholder="CVC" inputMode="numeric" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} style={{ flex: 1, minWidth: 0 }} />
            </div>
          </div>
        )}
        {short && (
          <div className="card" style={{ marginTop: 12 }}>
            <p className="error" style={{ margin: '0 0 8px' }}>Solde insuffisant : il te manque {fcfa(total - Number(balance || 0))}.</p>
            {onTopUp && <button className="btn-coral btn-big" style={{ width: '100%' }} onClick={() => onTopUp(Math.max(1000, Math.ceil((total - Number(balance || 0)) / 500) * 500))}>Recharger {fcfa(Math.max(1000, Math.ceil((total - Number(balance || 0)) / 500) * 500))}</button>}
          </div>
        )}
        {error && <p className="error">{error}</p>}

        <button className="btn-coral btn-big" style={{ width: '100%', marginTop: 14 }} disabled={!ready || busy || waiting} onClick={pay}>
          {waiting ? 'Validation en cours…' : `Payer ${fcfa(total)}`}
        </button>
        <p className="muted" style={{ fontSize: '0.78rem', textAlign: 'center', margin: '8px 0 0' }}>
          Paiement simulé pour la démo : aucun vrai argent n'est débité.
        </p>
      </div>
    </div>
  )
}

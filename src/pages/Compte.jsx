import { useCallback, useEffect, useState } from 'react'
import Header from '../components/Header'
import Checkout from '../components/Checkout'
import TabBar from '../components/TabBar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fcfa } from '../hooks/useOrders'

const AMOUNTS = [2000, 5000, 10000, 20000]

export default function Compte() {
  const { profile, refreshProfile } = useAuth()
  const [plans, setPlans] = useState([])
  const [links, setLinks] = useState([])
  const [names, setNames] = useState({})
  const [custom, setCustom] = useState('')
  const [email, setEmail] = useState('')
  const [pay, setPay] = useState(null) // { kind, amount, plan, child, label }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [note, setNote] = useState(null)

  const load = useCallback(async () => {
    const [p, l] = await Promise.all([
      supabase.from('plans').select('*').eq('active', true).order('price'),
      supabase.from('family_links').select('*').order('created_at', { ascending: false }),
    ])
    setPlans(p.data || [])
    const ls = l.data || []
    setLinks(ls)
    const ids = [...new Set(ls.flatMap((x) => [x.parent_id, x.child_id]))].filter((i) => i !== profile?.id)
    if (ids.length) {
      const { data } = await supabase.rpc('names_of', { p_ids: ids })
      setNames(Object.fromEntries((data || []).map((r) => [r.id, r.full_name])))
    }
  }, [profile?.id])
  useEffect(() => { load() }, [load])

  async function onPay(method) {
    setBusy(true)
    setError(null)
    let res
    if (pay.kind === 'topup') res = await supabase.rpc('top_up', { p_amount: pay.amount, p_method: method })
    else if (pay.kind === 'plan') res = await supabase.rpc('buy_plan', { p_plan: pay.plan, p_method: method })
    else res = await supabase.rpc('top_up_child', { p_child: pay.child, p_amount: pay.amount, p_method: method })
    setBusy(false)
    if (res.error) return setError(res.error.message)
    setPay(null)
    setNote(`Paiement réussi : ${pay.label}.`)
    await refreshProfile()
    load()
  }

  async function addChild(e) {
    e.preventDefault()
    setError(null)
    const { error: err } = await supabase.rpc('link_child', { p_email: email.trim() })
    if (err) return setError(err.message)
    setEmail('')
    setNote('Demande envoyée. Ton enfant doit l’accepter dans sa boîte de réception.')
    load()
  }
  async function respond(id, accept) {
    await supabase.rpc('respond_link', { p_link: id, p_accept: accept })
    load()
  }

  const myChildren = links.filter((l) => l.parent_id === profile?.id)
  const myParents = links.filter((l) => l.child_id === profile?.id)
  const customAmount = Number(custom) || 0

  return (
    <div>
      <Header />
      <main className="container">
        <h2>Mon portefeuille</h2>
        <div className="card" style={{ background: '#FFC244', border: 0 }}>
          <small>Solde disponible</small>
          <div className="display" style={{ fontSize: '2.6rem' }}>{fcfa(profile?.balance)}</div>
        </div>
        {note && <p className="ok">{note}</p>}
        {error && !pay && <p className="error">{error}</p>}

        <div className="section-title"><h3 style={{ margin: 0 }}>Recharger</h3></div>
        <p className="muted" style={{ marginTop: 0 }}>Par Wave, Orange Money ou carte (paiements simulés pour la démo).</p>
        <div className="tabs">
          {AMOUNTS.map((a) => (
            <button key={a} onClick={() => setPay({ kind: 'topup', amount: a, label: `recharge de ${fcfa(a)}` })}>{a.toLocaleString('fr-FR')}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (customAmount >= 500) setPay({ kind: 'topup', amount: customAmount, label: `recharge de ${fcfa(customAmount)}` }) }} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input type="number" min="500" step="500" placeholder="Autre montant" value={custom} onChange={(e) => setCustom(e.target.value)} style={{ flex: 1 }} />
          <button type="submit" disabled={customAmount < 500}>Recharger</button>
        </form>

        <div className="section-title"><h3 style={{ margin: 0 }}>Formules</h3></div>
        <p className="muted" style={{ marginTop: 0 }}>Paie une formule, reçois plus de crédit que tu n’as payé.</p>
        <div style={{ display: 'grid', gap: 10 }}>
          {plans.map((p) => (
            <div key={p.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span>
                <strong>{p.name}</strong><br />
                <small className="muted">{p.description}</small><br />
                <small>Tu paies {fcfa(p.price)} · tu reçois <strong>{fcfa(p.credit)}</strong></small>
              </span>
              <button className="btn-coral" onClick={() => setPay({ kind: 'plan', amount: p.price, plan: p.id, label: p.name })}>Choisir</button>
            </div>
          ))}
          {plans.length === 0 && <p className="muted">Aucune formule pour l’instant.</p>}
        </div>

        <div className="section-title"><h3 style={{ margin: 0 }}>Famille</h3></div>
        <p className="muted" style={{ marginTop: 0 }}>Un parent peut ajouter de l’argent sur le solde de son enfant.</p>
        <form onSubmit={addChild} style={{ display: 'flex', gap: 8 }}>
          <input type="email" placeholder="Email de ton enfant" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ flex: 1 }} />
          <button type="submit">Ajouter</button>
        </form>
        {myChildren.map((l) => (
          <div key={l.id} className="order-row">
            <span><strong>{names[l.child_id] || 'Enfant'}</strong><br /><small className="muted">{l.status === 'accepted' ? 'Lien confirmé' : 'En attente de réponse'}</small></span>
            {l.status === 'accepted' && (
              <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[2000, 5000, 10000].map((a) => (
                  <button key={a} className="btn-light" onClick={() => setPay({ kind: 'child', child: l.child_id, amount: a, label: `${fcfa(a)} envoyés à ${names[l.child_id] || 'ton enfant'}` })}>+{a.toLocaleString('fr-FR')}</button>
                ))}
              </span>
            )}
          </div>
        ))}
        {myParents.map((l) => (
          <div key={l.id} className="order-row">
            <span><strong>{names[l.parent_id] || 'Parent'}</strong><br /><small className="muted">{l.status === 'accepted' ? 'Peut recharger ton solde' : 'Demande en attente'}</small></span>
            {l.status === 'pending' && (
              <span style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => respond(l.id, true)}>Accepter</button>
                <button className="btn-light" onClick={() => respond(l.id, false)}>Refuser</button>
              </span>
            )}
          </div>
        ))}
      </main>
      {pay && (
        <Checkout noSolde total={pay.amount} balance={profile?.balance} busy={busy} error={error} onPay={onPay} onClose={() => { setPay(null); setError(null) }} />
      )}
      <TabBar />
    </div>
  )
}

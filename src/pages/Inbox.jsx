import { useCallback, useEffect, useState } from 'react'
import Header from '../components/Header'
import TabBar from '../components/TabBar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const KIND = {
  bienvenue: ['Bienvenue', '#FFC244'],
  connexion: ['Connexion', '#9CA3AF'],
  facture: ['Facture', '#34A853'],
  solde: ['Solde', '#E8541E'],
  recharge: ['Recharge', '#1DC8FF'],
  offre: ['Pour toi', '#8B5CF6'],
  demande_famille: ['Famille', '#FF7900'],
  info: ['Info', '#9CA3AF'],
}
const when = (d) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function Inbox() {
  const { profile } = useAuth()
  const [list, setList] = useState([])
  const [links, setLinks] = useState({})
  const [offer, setOffer] = useState({ title: '', body: '' })
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(60)
    setList(data || [])
    const ids = (data || []).map((m) => m.link_id).filter(Boolean)
    if (ids.length) {
      const l = await supabase.from('family_links').select('id, status').in('id', ids)
      setLinks(Object.fromEntries((l.data || []).map((x) => [x.id, x.status])))
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function read(m) {
    if (m.read) return
    await supabase.from('messages').update({ read: true }).eq('id', m.id)
    setList((l) => l.map((x) => (x.id === m.id ? { ...x, read: true } : x)))
  }
  async function readAll() {
    await supabase.from('messages').update({ read: true }).eq('read', false)
    load()
  }
  async function respond(m, accept) {
    await supabase.rpc('respond_link', { p_link: m.link_id, p_accept: accept })
    await read(m)
    load()
  }
  async function send(e) {
    e.preventDefault()
    const { error } = await supabase.rpc('broadcast', { p_title: offer.title, p_body: offer.body })
    setMsg(error ? error.message : 'Message envoyé à tous les utilisateurs.')
    if (!error) setOffer({ title: '', body: '' })
  }

  const unread = list.filter((m) => !m.read).length
  return (
    <div>
      <Header />
      <main className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0 }}>Boîte de réception</h2>
          {unread > 0 && <button className="btn-light" onClick={readAll}>Tout marquer comme lu</button>}
        </div>
        {list.length === 0 && <p className="muted">Rien pour l’instant.</p>}
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {list.map((m) => {
            const [label, color] = KIND[m.kind] || KIND.info
            return (
              <div key={m.id} className="card" onClick={() => read(m)} style={{ cursor: 'pointer', borderLeft: `6px solid ${color}`, opacity: m.read ? 0.7 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{m.title}</strong>
                  <small className="muted">{when(m.created_at)}</small>
                </div>
                <small style={{ color }}>{label}{!m.read && ' · nouveau'}</small>
                {m.body && <p style={{ margin: '6px 0 0' }}>{m.body}</p>}
                {m.link_id && links[m.link_id] === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={(e) => { e.stopPropagation(); respond(m, true) }}>Accepter</button>
                    <button className="btn-light" onClick={(e) => { e.stopPropagation(); respond(m, false) }}>Refuser</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {profile?.role === 'admin' && (
          <form onSubmit={send} className="card" style={{ marginTop: 24, display: 'grid', gap: 8 }}>
            <h3 style={{ margin: 0 }}>Envoyer une offre à tous</h3>
            <input placeholder="Titre (ex. Plat du jour à -20 %)" value={offer.title} onChange={(e) => setOffer({ ...offer, title: e.target.value })} required />
            <input placeholder="Message" value={offer.body} onChange={(e) => setOffer({ ...offer, body: e.target.value })} />
            <button type="submit">Envoyer</button>
            {msg && <small className="muted">{msg}</small>}
          </form>
        )}
      </main>
      <TabBar />
    </div>
  )
}

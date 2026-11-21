import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const LINKS = {
  client: [['/menu', 'Menu'], ['/compte', 'Portefeuille']],
  admin: [['/admin', 'Admin'], ['/caisse', 'Caisse'], ['/cuisine', 'Cuisine'], ['/courses', 'Courses']],
  caisse: [['/caisse', 'Caisse'], ['/gestion', 'Gestion'], ['/courses', 'Courses']],
  cuisine: [['/cuisine', 'Cuisine'], ['/gestion', 'Gestion'], ['/courses', 'Courses']],
}

const ROLE = {
  client: 'Client',
  caisse: 'Caisse',
  cuisine: 'Cuisine',
  admin: 'Admin',
  partenaire: 'Partenaire',
  approvisionnement: 'Coursier',
}

export default function Header() {
  const { profile, signOut } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!profile) return
    // Un message « Connexion » par session
    if (!sessionStorage.getItem('cantina-login')) {
      sessionStorage.setItem('cantina-login', '1')
      supabase.rpc('log_login')
    }
    const count = async () => {
      const { count: c } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('read', false)
      setUnread(c || 0)
    }
    count()
    const t = setInterval(count, 15000)
    return () => clearInterval(t)
  }, [profile])

  const low = profile?.role === 'client' && Number(profile?.balance || 0) < 1500
  return (
    <>
    <header className="topbar">
      <Link to="/" className="logo">
        cantina<span>.</span>
      </Link>
      <nav className="topnav">
        {(LINKS[profile?.role] || []).map(([to, label]) => (
          <Link key={to} to={to}>{label}</Link>
        ))}
      </nav>
      <div className="topbar-right">
        <Link to="/boite" className="bell" aria-label="Boîte de réception" style={{ position: 'relative', display: 'inline-grid', placeItems: 'center', width: 38, height: 38, borderRadius: '50%', background: '#fff' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#151515" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>
          {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#E8541E', color: '#fff', borderRadius: 99, fontSize: 11, fontWeight: 800, padding: '1px 6px' }}>{unread > 9 ? '9+' : unread}</span>}
        </Link>
        <span className="who">
          {profile?.full_name || 'Utilisateur'} · {ROLE[profile?.role]}
        </span>
        <button className="btn-light" onClick={signOut}>
          Déconnexion
        </button>
      </div>
    </header>
    {low && (
      <Link to="/compte" style={{ display: 'block', textAlign: 'center', background: '#FFE3D6', color: '#151515', padding: '10px 14px', fontWeight: 600, textDecoration: 'none' }}>
        Ton solde est presque fini ({Number(profile.balance || 0).toLocaleString('fr-FR')} FCFA). Recharger →
      </Link>
    )}
    </>
  )
}

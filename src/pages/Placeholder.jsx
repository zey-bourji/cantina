import { useAuth } from '../context/AuthContext'

export default function Placeholder({ title, text }) {
  const { profile, signOut } = useAuth()
  return (
    <div>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          borderBottom: '1px solid #e5e0d8',
        }}
      >
        <strong>Cantina</strong>
        <span>
          {profile?.full_name || 'Utilisateur'} ({profile?.role}) ·{' '}
          <button onClick={signOut}>Déconnexion</button>
        </span>
      </header>
      <main style={{ padding: 20 }}>
        <h2>{title}</h2>
        <p>{text}</p>
      </main>
    </div>
  )
}

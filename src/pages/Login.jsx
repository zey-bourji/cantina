import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) setError(error.message)
      else if (!data.session)
        setInfo('Compte créé. Vérifie ton email pour confirmer, puis connecte-toi.')
      else navigate('/')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Email ou mot de passe incorrect.')
      else navigate('/')
    }
    setBusy(false)
  }

  return (
    <main style={{ maxWidth: 380, margin: '10vh auto', padding: 24 }}>
      <h1 style={{ marginBottom: 4 }}>Cantina</h1>
      <p style={{ marginTop: 0, color: '#666' }}>La cantine de Vatel</p>

      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        {mode === 'signup' && (
          <input
            placeholder="Nom complet"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mot de passe (6 caractères min.)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <button type="submit" disabled={busy}>
          {mode === 'login' ? 'Se connecter' : "S'inscrire"}
        </button>
      </form>

      {error && <p style={{ color: '#b00020' }}>{error}</p>}
      {info && <p style={{ color: '#2e7d32' }}>{info}</p>}

      <p>
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          style={{ background: 'none', border: 'none', color: '#555', textDecoration: 'underline', padding: 0 }}
        >
          {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </button>
      </p>
    </main>
  )
}

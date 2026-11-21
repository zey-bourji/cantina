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
    <main className="auth-page">
      <div className="auth-card">
        <h1 className="display" style={{ marginBottom: 0 }}>
          cantina<span style={{ color: 'var(--coral)' }}>.</span>
        </h1>
        <p className="muted" style={{ marginTop: 4 }}>
          La cantine de Vatel, sans la file d'attente.
        </p>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <input
              placeholder="Ton nom"
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
          <button type="submit" className="btn-big" disabled={busy}>
            {mode === 'login' ? 'Se connecter' : "Créer mon compte"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
        {info && <p className="ok">{info}</p>}

        <p>
          <button
            type="button"
            className="link"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </button>
        </p>
      </div>
    </main>
  )
}

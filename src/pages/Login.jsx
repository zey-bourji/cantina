import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'signup' : 'login')
  const [step, setStep] = useState('email') // email -> code
  const [usePassword, setUsePassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  async function sendCode(e) {
    e?.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: mode === 'signup',
        data: mode === 'signup' ? { full_name: fullName.trim() } : undefined,
      },
    })
    setBusy(false)
    if (error) {
      const m = (error.message || '').toLowerCase()
      if (m.includes('signups not allowed') || m.includes('not found')) setError("Aucun compte avec cet email. Inscris-toi d'abord.")
      else if (m.includes('rate') || m.includes('seconds')) setError('Trop de demandes : attends une minute puis réessaie.')
      else setError(error.message)
      return
    }
    setStep('code')
    setCode('')
    setWait(30)
    setInfo(`Un code à 6 chiffres vient d'être envoyé à ${email.trim()}.`)
  }

  async function verify(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError('Code incorrect ou expiré. Vérifie ton email ou demande un nouveau code.')
    else navigate('/')
  }

  async function loginPassword(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError('Email ou mot de passe incorrect.')
    else navigate('/')
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h1 className="display" style={{ marginBottom: 0 }}>
            cantina<span style={{ color: 'var(--coral)' }}>.</span>
          </h1>
        </Link>
        <p className="muted" style={{ marginTop: 4 }}>
          {mode === 'signup' ? 'Crée ton compte avec un code reçu par email.' : 'Connecte-toi avec un code reçu par email.'}
        </p>

        {!usePassword && step === 'email' && (
          <form onSubmit={sendCode}>
            {mode === 'signup' && (
              <input placeholder="Ton nom" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            )}
            <input type="email" placeholder="Ton email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <button type="submit" className="btn-big" disabled={busy}>
              {busy ? 'Envoi…' : 'Recevoir mon code'}
            </button>
          </form>
        )}

        {!usePassword && step === 'code' && (
          <form onSubmit={verify}>
            <input
              className="otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="······"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
              required
            />
            <button type="submit" className="btn-big" disabled={busy || code.length < 6}>
              {busy ? 'Vérification…' : mode === 'signup' ? 'Valider mon compte' : 'Me connecter'}
            </button>
            <button type="button" className="link" disabled={wait > 0 || busy} onClick={sendCode}>
              {wait > 0 ? `Renvoyer le code dans ${wait} s` : 'Renvoyer le code'}
            </button>
            <button type="button" className="link" onClick={() => { setStep('email'); setError(''); setInfo('') }}>
              Changer d'email
            </button>
          </form>
        )}

        {usePassword && (
          <form onSubmit={loginPassword}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" className="btn-big" disabled={busy}>Se connecter</button>
          </form>
        )}

        {error && <p className="error">{error}</p>}
        {info && <p className="ok">{info}</p>}

        <p>
          <button
            type="button"
            className="link"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setStep('email')
              setError('')
              setInfo('')
              setUsePassword(false)
            }}
          >
            {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </button>
        </p>
        <p style={{ marginTop: -6 }}>
          <button type="button" className="link" onClick={() => { setUsePassword(!usePassword); setError(''); setInfo('') }}>
            {usePassword ? 'Utiliser un code par email' : 'Connexion équipe avec mot de passe'}
          </button>
        </p>
      </div>
    </main>
  )
}

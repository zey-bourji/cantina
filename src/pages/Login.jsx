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
  const [verified, setVerified] = useState(false)

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
    setVerified(false)
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
    else {
      setVerified(true)
      setTimeout(() => navigate('/'), 700)
    }
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

  const digits = Array.from({ length: 6 }, (_, i) => code[i] || '')

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-top">
          <Link to="/" className="auth-brand">
            <h1 className="display">cantina<span className="auth-dot">.</span></h1>
          </Link>
          <Link to="/" className="auth-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            Accueil
          </Link>
        </div>
        <p className="auth-lead">
          {mode === 'signup' ? 'Crée ton compte avec un code reçu par email.' : 'Connecte-toi avec un code reçu par email.'}
        </p>

        {!usePassword && step === 'email' && (
          <form onSubmit={sendCode}>
            {mode === 'signup' && (
              <input placeholder="Ton nom" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            )}
            <input type="email" placeholder="Ton email" enterKeyHint="send" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <button type="submit" className="btn-big" disabled={busy}>
              {busy ? 'Envoi…' : 'Recevoir mon code'}
            </button>
          </form>
        )}

        {!usePassword && step === 'code' && (
          <form className="auth-form" onSubmit={verify}>
            <div className="auth-otp-header">
              <span className="auth-otp-label">Code à 6 chiffres</span>
              {verified && (
                <span className="auth-otp-valid" aria-label="Code validé">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle className="auth-check-ring" cx="12" cy="12" r="9.5" />
                    <path className="auth-check-mark" d="M7.5 12.5l3 3 6-6.5" />
                  </svg>
                </span>
              )}
            </div>
            <div className={`auth-otp-wrap${error ? ' is-error' : ''}${verified ? ' is-valid' : ''}`}>
              <input
                className="otp-input"
                inputMode="numeric"
                enterKeyHint="go"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                aria-label="Code reçu par email"
                maxLength={6}
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); if (error) setError('') }}
                autoFocus
                required
              />
              <div className="auth-otp-boxes" aria-hidden="true">
                {digits.map((d, i) => (
                  <span key={i} className={`auth-otp-box${d ? ' is-filled' : ''}${i === Math.min(code.length, 5) && !verified ? ' is-active' : ''}`}>
                    {d || (i === code.length && !verified ? <span className="auth-otp-caret" /> : null)}
                  </span>
                ))}
              </div>
            </div>
            <button type="submit" className="btn-big" disabled={busy || verified || code.length < 6}>
              {busy ? 'Vérification…' : verified ? 'Code validé' : mode === 'signup' ? 'Valider mon compte' : 'Me connecter'}
            </button>
            <div className="auth-code-actions">
              <button type="button" className="link" disabled={wait > 0 || busy} onClick={sendCode}>
                {wait > 0 ? `Renvoyer le code dans ${wait} s` : 'Renvoyer le code'}
              </button>
              <button type="button" className="link" onClick={() => { setStep('email'); setError(''); setInfo('') }}>
                Changer d'email
              </button>
            </div>
          </form>
        )}

        {usePassword && (
          <form onSubmit={loginPassword}>
            <input type="email" placeholder="Email" enterKeyHint="next" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Mot de passe" enterKeyHint="go" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" className="btn-big" disabled={busy}>Se connecter</button>
          </form>
        )}

        {error && <p className="error">{error}</p>}
        {info && !error && <p className="ok">{info}</p>}

        <div className="auth-footer">
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
          <p>
            <button type="button" className="link" onClick={() => { setUsePassword(!usePassword); setError(''); setInfo('') }}>
              {usePassword ? 'Utiliser un code par email' : 'Connexion équipe avec mot de passe'}
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}

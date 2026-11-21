import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function IconCheck({ className = '' }) {
  return (
    <svg
      className={className}
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle className="auth-check-ring" cx="12" cy="12" r="9.5" />
      <path className="auth-check-mark" d="M8.2 12.3l2.6 2.6 5.2-5.4" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 8v4.5" />
      <path d="M12 16h.01" />
    </svg>
  )
}

function IconArrowLeft() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  )
}

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

  const boxCount = code.length > 6 ? 8 : 6
  const digits = code.slice(0, boxCount).split('')
  const activeIdx = Math.min(digits.length, boxCount - 1)
  const codeReady = digits.length >= 6 && !error

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-top">
          <Link to="/" className="auth-brand">
            <h1 className="display">
              cantina<span className="auth-dot">.</span>
            </h1>
          </Link>
          <Link to="/" className="auth-back">
            <IconArrowLeft />
            <span>Accueil</span>
          </Link>
        </div>

        <p className="muted auth-lead">
          {mode === 'signup' ? 'Crée ton compte avec un code reçu par email.' : 'Connecte-toi avec un code reçu par email.'}
        </p>

        {!usePassword && step === 'email' && (
          <form className="auth-form" onSubmit={sendCode}>
            {mode === 'signup' && (
              <input
                placeholder="Ton nom"
                enterKeyHint="next"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}
            <input
              type="email"
              placeholder="Ton email"
              enterKeyHint="send"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <button type="submit" className="btn-big" disabled={busy}>
              {busy ? 'Envoi…' : 'Recevoir mon code'}
            </button>
          </form>
        )}

        {!usePassword && step === 'code' && (
          <form className="auth-form" onSubmit={verify}>
            <div className={`auth-otp-wrap ${error ? 'is-error' : ''} ${codeReady ? 'is-valid' : ''}`}>
              <input
                className="otp-input"
                inputMode="numeric"
                enterKeyHint="go"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                placeholder="······"
                maxLength={8}
                value={code}
                onChange={(e) => {
                  if (error) setError('')
                  setCode(e.target.value.replace(/\D/g, ''))
                }}
                autoFocus
                required
              />
              <div className="auth-otp-boxes" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${boxCount}, minmax(0, 1fr))` }}>
                {Array.from({ length: boxCount }, (_, i) => i).map((idx) => {
                  const char = digits[idx] || ''
                  const isActive = idx === activeIdx && digits.length < boxCount
                  return (
                    <span
                      key={idx}
                      className={`auth-otp-box ${char ? 'is-filled' : ''} ${isActive ? 'is-active' : ''}`}
                    >
                      {char || (isActive ? <span className="auth-otp-caret" /> : null)}
                    </span>
                  )
                })}
              </div>
              {codeReady && (
                <span className="auth-otp-valid" aria-hidden="true">
                  <IconCheck />
                </span>
              )}
            </div>

            <button type="submit" className="btn-big" disabled={busy || code.length < 6}>
              {busy ? 'Vérification…' : mode === 'signup' ? 'Valider mon compte' : 'Me connecter'}
            </button>

            <div className="auth-code-actions">
              <button type="button" className="link" disabled={wait > 0 || busy} onClick={sendCode}>
                {wait > 0 ? `Renvoyer le code dans ${wait} s` : 'Renvoyer le code'}
              </button>
              <button
                type="button"
                className="link"
                onClick={() => {
                  setStep('email')
                  setError('')
                  setInfo('')
                }}
              >
                Changer d'email
              </button>
            </div>
          </form>
        )}

        {usePassword && (
          <form className="auth-form" onSubmit={loginPassword}>
            <input
              type="email"
              placeholder="Email"
              enterKeyHint="next"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Mot de passe"
              enterKeyHint="go"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="btn-big" disabled={busy}>
              Se connecter
            </button>
          </form>
        )}

        {error && (
          <p className="error" role="alert">
            <IconAlert />
            <span>{error}</span>
          </p>
        )}
        {info && (
          <p className="ok" role="status">
            <IconCheck />
            <span>{info}</span>
          </p>
        )}

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
            <button
              type="button"
              className="link"
              onClick={() => {
                setUsePassword(!usePassword)
                setError('')
                setInfo('')
              }}
            >
              {usePassword ? 'Utiliser un code par email' : 'Connexion équipe avec mot de passe'}
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}
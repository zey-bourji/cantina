import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Placeholder from './pages/Placeholder'
import ClientMenu from './pages/ClientMenu'
import Caisse from './pages/Caisse'
import Composer from './pages/Composer'
import Cuisine from './pages/Cuisine'
import Admin from './pages/Admin'
import Courses from './pages/Courses'
import Plateau from './pages/Plateau'
import Partenaire from './pages/Partenaire'
import Gestion from './pages/Gestion'
import Compte from './pages/Compte'
import Inbox from './pages/Inbox'

const HOME = {
  client: '/menu',
  caisse: '/caisse',
  cuisine: '/cuisine',
  admin: '/admin',
  partenaire: '/partenaire',
  approvisionnement: '/courses',
}

function ProfileError() {
  const { signOut } = useAuth()
  return (
    <p style={{ padding: 20 }}>
      Impossible de charger ton profil. <button onClick={signOut}>Se déconnecter</button>
    </p>
  )
}

function Protected({ roles, children }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <p style={{ padding: 20 }}>Chargement…</p>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <ProfileError />
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />
  return children
}

function HomeRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return <p style={{ padding: 20 }}>Chargement…</p>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <ProfileError />
  return <Navigate to={HOME[profile.role] || '/menu'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route
        path="/menu"
        element={
          <Protected roles={['client', 'admin']}>
            <ClientMenu />
          </Protected>
        }
      />
      <Route
        path="/composer"
        element={
          <Protected roles={['client', 'admin']}>
            <Composer />
          </Protected>
        }
      />
      <Route
        path="/plateau"
        element={
          <Protected roles={['client', 'admin']}>
            <Plateau />
          </Protected>
        }
      />
      <Route
        path="/gestion"
        element={
          <Protected roles={['caisse', 'cuisine', 'admin']}>
            <Gestion />
          </Protected>
        }
      />
      <Route
        path="/caisse"
        element={
          <Protected roles={['caisse', 'admin']}>
            <Caisse />
          </Protected>
        }
      />
      <Route
        path="/cuisine"
        element={
          <Protected roles={['cuisine', 'admin']}>
            <Cuisine />
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected roles={['admin']}>
            <Admin />
          </Protected>
        }
      />
      <Route
        path="/partenaire"
        element={
          <Protected roles={['partenaire', 'admin']}>
            <Partenaire />
          </Protected>
        }
      />
      <Route
        path="/courses"
        element={
          <Protected roles={['approvisionnement', 'admin', 'caisse', 'cuisine']}>
            <Courses />
          </Protected>
        }
      />
      <Route path="/compte" element={<Protected roles={['client', 'admin']}><Compte /></Protected>} />
      <Route path="/boite" element={<Protected><Inbox /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

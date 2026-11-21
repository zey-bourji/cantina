import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Placeholder from './pages/Placeholder'
import ClientMenu from './pages/ClientMenu'
import Caisse from './pages/Caisse'
import Cuisine from './pages/Cuisine'
import Admin from './pages/Admin'

const HOME = {
  client: '/menu',
  caisse: '/caisse',
  cuisine: '/cuisine',
  admin: '/admin',
  partenaire: '/partenaire',
  approvisionnement: '/courses',
}

function Protected({ roles, children }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <p style={{ padding: 20 }}>Chargement…</p>
  if (!session) return <Navigate to="/login" replace />
  if (roles && !roles.includes(profile?.role)) return <Navigate to="/" replace />
  return children
}

function HomeRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return <p style={{ padding: 20 }}>Chargement…</p>
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={HOME[profile?.role] || '/menu'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route
        path="/menu"
        element={
          <Protected roles={['client']}>
            <ClientMenu />
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
            <Placeholder title="Partenaire" text="Stock du jour." />
          </Protected>
        }
      />
      <Route
        path="/courses"
        element={
          <Protected roles={['approvisionnement', 'admin']}>
            <Placeholder title="Liste de courses" text="Courses du coursier." />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

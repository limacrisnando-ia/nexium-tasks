import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ToastContainer from './components/Toast'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import ClienteDetalhe from './pages/ClienteDetalhe'
import Tarefas from './pages/Tarefas'
import Calendario from './pages/Calendario'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsuarios from './pages/AdminUsuarios'
import AdminRelatorios from './pages/AdminRelatorios'

import { FocoProvider } from './contexts/FocoContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="login-loading"><div className="login-spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, loading } = useAuth()
  if (loading) return <div className="login-loading"><div className="login-spinner" /></div>
  if (!isSuperAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function LoginRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="login-loading"><div className="login-spinner" /></div>
  if (user) return <Navigate to="/" replace />
  return <Login />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FocoProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route element={<AuthGuard><Layout /></AuthGuard>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/clientes/:id" element={<ClienteDetalhe />} />
              <Route path="/tarefas" element={<Tarefas />} />
              <Route path="/calendario" element={<Calendario />} />
              {/* Admin routes */}
              <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
              <Route path="/admin/usuarios" element={<AdminGuard><AdminUsuarios /></AdminGuard>} />
              <Route path="/admin/relatorios" element={<AdminGuard><AdminRelatorios /></AdminGuard>} />
            </Route>
          </Routes>
          <ToastContainer />
        </FocoProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

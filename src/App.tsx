import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from './components/Layout'
import ToastContainer from './components/Toast'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

import { FocoProvider } from './contexts/FocoContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Lazy load pages that aren't immediately needed
const Clientes = lazy(() => import('./pages/Clientes'))
const ClienteDetalhe = lazy(() => import('./pages/ClienteDetalhe'))
const Tarefas = lazy(() => import('./pages/Tarefas'))
const Calendario = lazy(() => import('./pages/Calendario'))
const MeuPerfil = lazy(() => import('./pages/MeuPerfil'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminUsuarios = lazy(() => import('./pages/AdminUsuarios'))
const AdminRelatorios = lazy(() => import('./pages/AdminRelatorios'))

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="login-spinner" />
    </div>
  )
}

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
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route element={<AuthGuard><Layout /></AuthGuard>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/clientes/:id" element={<ClienteDetalhe />} />
                <Route path="/tarefas" element={<Tarefas />} />
                <Route path="/calendario" element={<Calendario />} />
                <Route path="/perfil" element={<MeuPerfil />} />
                {/* Admin routes */}
                <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
                <Route path="/admin/usuarios" element={<AdminGuard><AdminUsuarios /></AdminGuard>} />
                <Route path="/admin/relatorios" element={<AdminGuard><AdminRelatorios /></AdminGuard>} />
              </Route>
            </Routes>
          </Suspense>
          <ToastContainer />
        </FocoProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ToastContainer from './components/Toast'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import ClienteDetalhe from './pages/ClienteDetalhe'
import Tarefas from './pages/Tarefas'
import Calendario from './pages/Calendario'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/:id" element={<ClienteDetalhe />} />
          <Route path="/tarefas" element={<Tarefas />} />
          <Route path="/calendario" element={<Calendario />} />
        </Route>
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  )
}

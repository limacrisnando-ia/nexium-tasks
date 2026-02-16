import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useFoco, phaseLabel } from '../contexts/FocoContext'

function pad(n: number) { return n.toString().padStart(2, '0') }
function fmtTime(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}` }

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()
    const foco = useFoco()

    const showWidget = foco.running && location.pathname !== '/tarefas'
    const currentTask = foco.fila[foco.currentIndex]

    return (
        <div className="app-layout">
            {/* Mobile menu button */}
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {sidebarOpen
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    }
                </svg>
            </button>

            {/* Sidebar overlay (mobile) */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <svg viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="7" cy="15" r="7" fill="#fff" />
                            <rect x="14" y="14" width="10" height="2" fill="#fff" />
                            <circle cx="25" cy="15" r="7" fill="#fff" />
                            <rect x="32" y="14" width="10" height="2" fill="#fff" />
                            <circle cx="43" cy="15" r="7" fill="#fff" />
                        </svg>
                    </div>
                    <div className="sidebar-logo-text">
                        <span className="brand-name">NEXIUM</span>
                        <span className="brand-sub">Tasks</span>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end onClick={() => setSidebarOpen(false)}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Dashboard
                    </NavLink>
                    <NavLink to="/clientes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Clientes
                    </NavLink>
                    <NavLink to="/tarefas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Tarefas
                    </NavLink>
                    <NavLink to="/calendario" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Calendário
                    </NavLink>

                </nav>
                <div className="sidebar-footer">
                    <div className="sidebar-footer-text">NEXIUM Tasks</div>
                </div>
            </aside>

            {/* Main content */}
            <main className="main-content">
                <Outlet />
            </main>

            {/* Floating timer widget */}
            {showWidget && (
                <div className="foco-widget" onClick={() => navigate('/tarefas')}>
                    <div className="foco-widget-pulse" />
                    <div className="foco-widget-timer">
                        {fmtTime(foco.timeLeft)}
                    </div>
                    <div className="foco-widget-info">
                        <div className="foco-widget-phase">{phaseLabel[foco.phase]}</div>
                        {currentTask && (
                            <div className="foco-widget-task">{currentTask.titulo}</div>
                        )}
                    </div>
                    <div className="foco-widget-arrow">→</div>
                </div>
            )}
        </div>
    )
}

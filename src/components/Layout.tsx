import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useFoco, phaseLabel } from '../contexts/FocoContext'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

function pad(n: number) { return n.toString().padStart(2, '0') }
function fmtTime(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}` }

const SIDEBAR_EXPANDED = 300
const SIDEBAR_COLLAPSED = 60

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()
    const foco = useFoco()
    const { usuario, isSuperAdmin, signOut } = useAuth()
    const { t } = useLanguage()

    const showWidget = foco.running && location.pathname !== '/tarefas'
    const currentTask = foco.fila[foco.currentIndex]

    const desktopWidth = isHovered ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED

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
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        className="sidebar-overlay visible"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <motion.aside
                className="sidebar desktop-sidebar"
                animate={{ width: desktopWidth }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{ overflow: 'hidden' }}
            >
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
                    <motion.div
                        className="sidebar-logo-text"
                        animate={{ opacity: isHovered ? 1 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <span className="brand-name">NEXIUM</span>
                        <span className="brand-sub">Tasks</span>
                    </motion.div>
                </div>
                <nav className="sidebar-nav">
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <motion.span animate={{ opacity: isHovered ? 1 : 0 }} transition={{ duration: 0.2 }}>{t('sidebar.dashboard')}</motion.span>
                    </NavLink>
                    <NavLink to="/clientes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <motion.span animate={{ opacity: isHovered ? 1 : 0 }} transition={{ duration: 0.2 }}>{t('sidebar.clients')}</motion.span>
                    </NavLink>
                    <NavLink to="/tarefas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <motion.span animate={{ opacity: isHovered ? 1 : 0 }} transition={{ duration: 0.2 }}>{t('sidebar.tasks')}</motion.span>
                    </NavLink>
                    <NavLink to="/calendario" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <motion.span animate={{ opacity: isHovered ? 1 : 0 }} transition={{ duration: 0.2 }}>{t('sidebar.calendar')}</motion.span>
                    </NavLink>

                    {/* Admin Section */}
                    {isSuperAdmin && (
                        <>
                            <div className="sidebar-admin-divider">
                                <motion.span animate={{ opacity: isHovered ? 1 : 0 }} transition={{ duration: 0.2 }}>{t('sidebar.admin').toUpperCase()}</motion.span>
                            </div>
                            <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <motion.span animate={{ opacity: isHovered ? 1 : 0 }} transition={{ duration: 0.2 }}>{t('sidebar.adminDashboard')}</motion.span>
                            </NavLink>
                            <NavLink to="/admin/usuarios" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <motion.span animate={{ opacity: isHovered ? 1 : 0 }} transition={{ duration: 0.2 }}>{t('sidebar.adminUsers')}</motion.span>
                            </NavLink>
                            <NavLink to="/admin/relatorios" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <motion.span animate={{ opacity: isHovered ? 1 : 0 }} transition={{ duration: 0.2 }}>{t('sidebar.adminReports')}</motion.span>
                            </NavLink>
                        </>
                    )}
                </nav>
                <div className="sidebar-footer">
                    {!isHovered ? (
                        <NavLink to="/perfil" className="sidebar-footer-icon" title={t('profile.title')}>
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </NavLink>
                    ) : (
                        <>
                            <NavLink to="/perfil" className="sidebar-user-info" title={t('profile.title')}>
                                <div className="sidebar-user-name">
                                    {usuario?.nome || t('profile.user')}
                                    {isSuperAdmin && <span className="admin-badge">ADMIN</span>}
                                </div>
                                <div className="sidebar-user-email">{usuario?.email}</div>
                            </NavLink>
                            <button className="sidebar-logout-btn" onClick={signOut} title={t('sidebar.logout')}>
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>
            </motion.aside>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        className="sidebar mobile-sidebar"
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        style={{ width: SIDEBAR_EXPANDED }}
                    >
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
                                {t('sidebar.dashboard')}
                            </NavLink>
                            <NavLink to="/clientes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {t('sidebar.clients')}
                            </NavLink>
                            <NavLink to="/tarefas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                {t('sidebar.tasks')}
                            </NavLink>
                            <NavLink to="/calendario" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {t('sidebar.calendar')}
                            </NavLink>

                            {/* Admin Section */}
                            {isSuperAdmin && (
                                <>
                                    <div className="sidebar-admin-divider">
                                        <span>ADMIN</span>
                                    </div>
                                    <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {t('sidebar.adminDashboard')}
                                    </NavLink>
                                    <NavLink to="/admin/usuarios" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        {t('sidebar.adminUsers')}
                                    </NavLink>
                                    <NavLink to="/admin/relatorios" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        {t('sidebar.adminReports')}
                                    </NavLink>
                                </>
                            )}
                        </nav>
                        <div className="sidebar-footer">
                            <NavLink to="/perfil" className="sidebar-user-info" onClick={() => setSidebarOpen(false)} title={t('profile.title')}>
                                <div className="sidebar-user-name">
                                    {usuario?.nome || t('profile.user')}
                                    {isSuperAdmin && <span className="admin-badge">ADMIN</span>}
                                </div>
                                <div className="sidebar-user-email">{usuario?.email}</div>
                            </NavLink>
                            <button className="sidebar-logout-btn" onClick={signOut} title={t('sidebar.logout')}>
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

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

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR')
}

interface UserReport {
    id: string; nome: string; email: string; total_clientes: number
    total_tarefas: number; tarefas_concluidas: number
    valor_total_faturado: number; valor_pendente: number; created_at: string
}

export default function AdminRelatorios() {
    const [tab, setTab] = useState<'usuarios' | 'clientes' | 'tarefas'>('usuarios')
    const [users, setUsers] = useState<UserReport[]>([])
    const [clientes, setClientes] = useState<any[]>([])
    const [tarefas, setTarefas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            setLoading(true)
            const [uRes, cRes, tRes] = await Promise.all([
                supabase.from('vw_relatorio_usuarios').select('*'),
                supabase.rpc('admin_get_all_clientes'),
                supabase.rpc('admin_get_all_tarefas'),
            ])
            if (uRes.data) setUsers(uRes.data)
            if (cRes.data) setClientes(cRes.data)
            if (tRes.data) setTarefas(tRes.data)
            setLoading(false)
        }
        load()
    }, [])

    const tabs = [
        { key: 'usuarios' as const, label: '📊 Usuários' },
        { key: 'clientes' as const, label: '👥 Clientes' },
        { key: 'tarefas' as const, label: '📋 Tarefas' },
    ]

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>
                    📈 Relatórios Gerenciais
                    <span className="admin-badge">ADMIN</span>
                </h2>
                <p>Visão consolidada de todos os dados do sistema</p>
            </div>

            {/* Tabs */}
            <div className="filters-bar" style={{ gap: 0 }}>
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setTab(t.key)}
                        style={{ borderRadius: 0, ...(t.key === 'usuarios' ? { borderRadius: '8px 0 0 8px' } : t.key === 'tarefas' ? { borderRadius: '0 8px 8px 0' } : {}) }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="section-card">
                    <div className="section-card-body" style={{ padding: 24 }}>
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="loading-skeleton" style={{ height: 48, marginBottom: 8 }} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="section-card animate-fade-in">
                    <div className="section-card-body">
                        {tab === 'usuarios' && (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Usuário</th>
                                        <th>Email</th>
                                        <th>Clientes</th>
                                        <th>Tarefas</th>
                                        <th>Concluídas</th>
                                        <th>Faturado</th>
                                        <th>A Receber</th>
                                        <th>Desde</th>
                                    </tr>
                                </thead>
                                <tbody className="stagger-children">
                                    {users.map((u) => (
                                        <tr key={u.id}>
                                            <td><strong>{u.nome}</strong></td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{u.email}</td>
                                            <td>{u.total_clientes}</td>
                                            <td>{u.total_tarefas}</td>
                                            <td>{u.tarefas_concluidas}</td>
                                            <td>{formatCurrency(u.valor_total_faturado)}</td>
                                            <td>{formatCurrency(u.valor_pendente)}</td>
                                            <td style={{ fontSize: '0.8rem' }}>{formatDate(u.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ fontWeight: 700 }}>
                                        <td>Total</td>
                                        <td />
                                        <td>{users.reduce((s, u) => s + u.total_clientes, 0)}</td>
                                        <td>{users.reduce((s, u) => s + u.total_tarefas, 0)}</td>
                                        <td>{users.reduce((s, u) => s + u.tarefas_concluidas, 0)}</td>
                                        <td>{formatCurrency(users.reduce((s, u) => s + u.valor_total_faturado, 0))}</td>
                                        <td>{formatCurrency(users.reduce((s, u) => s + u.valor_pendente, 0))}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        )}

                        {tab === 'clientes' && (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Cliente</th>
                                        <th>Empresa</th>
                                        <th>Status</th>
                                        <th>Dono</th>
                                    </tr>
                                </thead>
                                <tbody className="stagger-children">
                                    {clientes.map((c: any) => (
                                        <tr key={c.id}>
                                            <td><strong>{c.nome}</strong></td>
                                            <td>{c.empresa || '—'}</td>
                                            <td>
                                                <span className={`badge badge-status-${c.status?.toLowerCase()}`}>{c.status}</span>
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                                                {c.usuario_nome || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {tab === 'tarefas' && (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Tarefa</th>
                                        <th>Cliente</th>
                                        <th>Status</th>
                                        <th>Prioridade</th>
                                        <th>Prazo</th>
                                        <th>Dono</th>
                                    </tr>
                                </thead>
                                <tbody className="stagger-children">
                                    {tarefas.map((t: any) => (
                                        <tr key={t.id}>
                                            <td><strong>{t.titulo}</strong></td>
                                            <td>{t.cliente_nome || '—'}</td>
                                            <td>
                                                <span className={`badge badge-status-${t.status === 'A Fazer' ? 'afazer' : t.status === 'Em Andamento' ? 'andamento' : 'concluida'}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge badge-priority-${t.prioridade?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>
                                                    {t.prioridade}
                                                </span>
                                            </td>
                                            <td>{formatDate(t.prazo)}</td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                                                {t.usuario_nome || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

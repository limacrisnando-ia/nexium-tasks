import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { NexiumIcon } from '../components/NexiumIcon'

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface UserReport {
    id: string
    nome: string
    email: string
    role: string
    ativo: boolean
    total_clientes: number
    total_tarefas: number
    tarefas_concluidas: number
    tarefas_pendentes: number
    valor_total_faturado: number
    valor_pendente: number
    created_at: string
}

interface GlobalMetrics {
    total_usuarios: number
    total_clientes: number
    total_tarefas: number
    tarefas_pendentes: number
    valor_faturado: number
    valor_a_receber: number
    tarefas_atrasadas: number
}

export default function AdminDashboard() {
    const [users, setUsers] = useState<UserReport[]>([])
    const [metrics, setMetrics] = useState<GlobalMetrics | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            setLoading(true)
            const [usersRes, metricsRes] = await Promise.all([
                supabase.from('vw_relatorio_usuarios').select('*'),
                supabase.rpc('admin_get_global_metrics'),
            ])
            if (usersRes.data) setUsers(usersRes.data)
            if (metricsRes.data && metricsRes.data.length > 0) {
                const m = metricsRes.data[0]
                setMetrics({
                    total_usuarios: Number(m.total_usuarios),
                    total_clientes: Number(m.total_clientes),
                    total_tarefas: Number(m.total_tarefas),
                    tarefas_pendentes: Number(m.tarefas_pendentes),
                    valor_faturado: Number(m.valor_faturado),
                    valor_a_receber: Number(m.valor_a_receber),
                    tarefas_atrasadas: Number(m.tarefas_atrasadas),
                })
            }
            setLoading(false)
        }
        load()
    }, [])

    const totalConcluidas = users.reduce((s, u) => s + u.tarefas_concluidas, 0)

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header"><h2>Dashboard Global</h2></div>
                <div className="metrics-grid stagger-children">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="metric-card">
                            <div className="loading-skeleton" style={{ width: '60%', marginBottom: 12 }} />
                            <div className="loading-skeleton" style={{ width: '40%', height: 32 }} />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <NexiumIcon size={24} />
                    Dashboard Global
                    <span className="admin-badge">ADMIN</span>
                </h2>
                <p>Visão geral de todo o sistema</p>
            </div>

            {/* Global Metrics */}
            <div className="metrics-grid stagger-children">
                <div className="metric-card">
                    <div className="label">Usuários Ativos</div>
                    <div className="value">{metrics?.total_usuarios ?? 0}</div>
                </div>
                <div className="metric-card">
                    <div className="label">Total de Clientes</div>
                    <div className="value">{metrics?.total_clientes ?? 0}</div>
                </div>
                <div className="metric-card">
                    <div className="label">Tarefas Pendentes</div>
                    <div className="value">{metrics?.tarefas_pendentes ?? 0}</div>
                    {(metrics?.tarefas_atrasadas ?? 0) > 0 && (
                        <div className="sub" style={{ fontWeight: 600 }}>
                            {metrics?.tarefas_atrasadas} atrasada(s)
                        </div>
                    )}
                </div>
                <div className="metric-card">
                    <div className="label">Total de Tarefas</div>
                    <div className="value">{metrics?.total_tarefas ?? 0}</div>
                    <div className="sub">{totalConcluidas} concluída(s)</div>
                </div>
                <div className="metric-card">
                    <div className="label">Faturado Total</div>
                    <div className="value" style={{ fontSize: '1.4rem' }}>
                        {formatCurrency(metrics?.valor_faturado ?? 0)}
                    </div>
                </div>
                <div className="metric-card">
                    <div className="label">A Receber</div>
                    <div className="value" style={{ fontSize: '1.4rem' }}>
                        {formatCurrency(metrics?.valor_a_receber ?? 0)}
                    </div>
                </div>
            </div>

            {/* Performance Table */}
            <div className="section-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="section-card-header">
                    <h3>Performance por Usuário</h3>
                </div>
                <div className="section-card-body">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Usuário</th>
                                <th>Clientes</th>
                                <th>Tarefas</th>
                                <th>Concluídas</th>
                                <th>Faturado</th>
                                <th>A Receber</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody className="stagger-children">
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td>
                                        <strong>{u.nome}</strong>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{u.email}</div>
                                    </td>
                                    <td>{u.total_clientes}</td>
                                    <td>{u.total_tarefas}</td>
                                    <td>{u.tarefas_concluidas}</td>
                                    <td>{formatCurrency(u.valor_total_faturado)}</td>
                                    <td>{formatCurrency(u.valor_pendente)}</td>
                                    <td>
                                        <span className={`badge ${u.ativo ? 'badge-status-ativo' : 'badge-status-inativo'}`}>
                                            {u.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

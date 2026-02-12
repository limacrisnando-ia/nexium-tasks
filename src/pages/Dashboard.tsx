import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { DashboardMetricas, ProximaTarefa } from '../lib/types'
import { NexiumIcon } from '../components/NexiumIcon'

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function urgenciaBadgeClass(urgencia: string) {
    switch (urgencia) {
        case 'Atrasada': return 'badge-urgencia-atrasada'
        case 'Hoje': return 'badge-urgencia-hoje'
        case 'Próximos 7 dias': return 'badge-urgencia-proximos'
        default: return 'badge-urgencia-futuro'
    }
}

function prioridadeBadgeClass(prioridade: string) {
    switch (prioridade) {
        case 'Alta': return 'badge-priority-alta'
        case 'Média': return 'badge-priority-media'
        default: return 'badge-priority-baixa'
    }
}

export default function Dashboard() {
    const [metricas, setMetricas] = useState<DashboardMetricas | null>(null)
    const [tarefas, setTarefas] = useState<ProximaTarefa[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            setLoading(true)
            const [metricasRes, tarefasRes] = await Promise.all([
                supabase.from('vw_dashboard_metricas').select('*').single(),
                supabase.from('vw_proximas_tarefas').select('*').limit(10),
            ])
            if (metricasRes.data) setMetricas(metricasRes.data)
            if (tarefasRes.data) setTarefas(tarefasRes.data)
            setLoading(false)
        }
        load()
    }, [])

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header"><h2>Dashboard</h2></div>
                <div className="metrics-grid stagger-children">
                    {[1, 2, 3, 4].map((i) => (
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
                    Dashboard
                </h2>
                <p>Visão geral do seu sistema</p>
            </div>

            {/* Metric Cards */}
            <div className="metrics-grid stagger-children">
                <div className="metric-card">
                    <div className="label">Clientes Ativos</div>
                    <div className="value">{metricas?.clientes_ativos ?? 0}</div>
                </div>
                <div className="metric-card">
                    <div className="label">Tarefas Pendentes</div>
                    <div className="value">{metricas?.tarefas_pendentes ?? 0}</div>
                    {(metricas?.tarefas_atrasadas ?? 0) > 0 && (
                        <div className="sub" style={{ fontWeight: 600 }}>
                            {metricas?.tarefas_atrasadas} atrasada(s)
                        </div>
                    )}
                </div>
                <div className="metric-card">
                    <div className="label">Tarefas Hoje / 7 dias</div>
                    <div className="value">
                        {metricas?.tarefas_hoje ?? 0}
                        <span style={{ fontSize: '1rem', color: 'var(--gray-500)', marginLeft: 8 }}>
                            / {metricas?.tarefas_proximos_7_dias ?? 0}
                        </span>
                    </div>
                </div>
                <div className="metric-card">
                    <div className="label">Valor a Receber</div>
                    <div className="value" style={{ fontSize: '1.5rem' }}>
                        {formatCurrency(metricas?.valor_total_receber ?? 0)}
                    </div>
                </div>
            </div>

            {/* Próximas Tarefas */}
            <div className="section-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="section-card-header">
                    <h3>Próximas Tarefas</h3>
                    <span className="badge badge-light">{tarefas.length} tarefa(s)</span>
                </div>
                <div className="section-card-body">
                    {tarefas.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-brand">
                                <NexiumIcon size={60} color="#000" />
                            </div>
                            <p>Nenhuma tarefa pendente. Tudo em dia!</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Tarefa</th>
                                    <th>Cliente</th>
                                    <th>Prazo</th>
                                    <th>Prioridade</th>
                                    <th>Urgência</th>
                                </tr>
                            </thead>
                            <tbody className="stagger-children">
                                {tarefas.map((t) => (
                                    <tr
                                        key={t.id}
                                        className={`${t.prioridade === 'Alta' ? 'priority-alta' : ''} ${t.urgencia === 'Atrasada' ? 'tarefa-atrasada' : ''}`}
                                    >
                                        <td>
                                            <strong>{t.titulo}</strong>
                                            {t.nome_projeto && (
                                                <div style={{ fontSize: '0.75rem', color: t.urgencia === 'Atrasada' ? 'var(--gray-400)' : 'var(--gray-500)', marginTop: 2 }}>
                                                    {t.nome_projeto}
                                                </div>
                                            )}
                                        </td>
                                        <td>{t.cliente_nome || '—'}</td>
                                        <td>
                                            {t.prazo
                                                ? new Date(t.prazo + 'T00:00:00').toLocaleDateString('pt-BR')
                                                : '—'}
                                        </td>
                                        <td>
                                            <span className={`badge ${prioridadeBadgeClass(t.prioridade)}`}>
                                                {t.prioridade}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${urgenciaBadgeClass(t.urgencia)}`}>
                                                {t.urgencia}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}

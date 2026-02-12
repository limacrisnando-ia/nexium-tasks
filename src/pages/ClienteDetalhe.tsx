import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Cliente, Projeto, Tarefa } from '../lib/types'
import Modal from '../components/Modal'
import { showToast } from '../components/Toast'

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

const tipoOpts = ['Pontual', 'Recorrente'] as const
const statusPgtoOpts = ['Pendente', 'Pago'] as const
const statusTarefaOpts = ['A Fazer', 'Em Andamento', 'Concluída'] as const
const prioridadeOpts = ['Alta', 'Média', 'Baixa'] as const

const emptyProjeto: { nome_projeto: string; tipo: Projeto['tipo']; descricao: string; valor: string; data_pagamento: string; status_pagamento: Projeto['status_pagamento']; data_inicio: string; data_conclusao: string } = { nome_projeto: '', tipo: 'Pontual', descricao: '', valor: '', data_pagamento: '', status_pagamento: 'Pendente', data_inicio: '', data_conclusao: '' }
const emptyTarefa: { titulo: string; descricao: string; prazo: string; status: Tarefa['status']; prioridade: Tarefa['prioridade']; projeto_id: string } = { titulo: '', descricao: '', prazo: '', status: 'A Fazer', prioridade: 'Média', projeto_id: '' }

export default function ClienteDetalhe() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [cliente, setCliente] = useState<Cliente | null>(null)
    const [projetos, setProjetos] = useState<Projeto[]>([])
    const [tarefas, setTarefas] = useState<Tarefa[]>([])
    const [loading, setLoading] = useState(true)

    // Projeto modal
    const [projetoModal, setProjetoModal] = useState(false)
    const [editingProjeto, setEditingProjeto] = useState<string | null>(null)
    const [projetoForm, setProjetoForm] = useState(emptyProjeto)
    const [savingP, setSavingP] = useState(false)

    // Tarefa modal
    const [tarefaModal, setTarefaModal] = useState(false)
    const [editingTarefa, setEditingTarefa] = useState<string | null>(null)
    const [tarefaForm, setTarefaForm] = useState(emptyTarefa)
    const [savingT, setSavingT] = useState(false)

    async function loadAll() {
        if (!id) return
        setLoading(true)
        const [cRes, pRes, tRes] = await Promise.all([
            supabase.from('clientes').select('*').eq('id', id).single(),
            supabase.from('projetos').select('*').eq('cliente_id', id).order('created_at', { ascending: false }),
            supabase.from('tarefas').select('*').eq('cliente_id', id).order('prazo'),
        ])
        if (cRes.data) setCliente(cRes.data)
        if (pRes.data) setProjetos(pRes.data)
        if (tRes.data) setTarefas(tRes.data)
        setLoading(false)
    }

    useEffect(() => { loadAll() }, [id])

    const totalFaturado = projetos
        .filter((p) => p.status_pagamento === 'Pago')
        .reduce((sum, p) => sum + (p.valor || 0), 0)
    const totalPendente = projetos
        .filter((p) => p.status_pagamento === 'Pendente')
        .reduce((sum, p) => sum + (p.valor || 0), 0)

    // Projeto CRUD
    function openCreateProjeto() {
        setEditingProjeto(null)
        setProjetoForm(emptyProjeto)
        setProjetoModal(true)
    }

    function openEditProjeto(p: Projeto) {
        setEditingProjeto(p.id)
        setProjetoForm({
            nome_projeto: p.nome_projeto,
            tipo: p.tipo,
            descricao: p.descricao || '',
            valor: p.valor?.toString() || '',
            data_pagamento: p.data_pagamento || '',
            status_pagamento: p.status_pagamento,
            data_inicio: p.data_inicio || '',
            data_conclusao: p.data_conclusao || '',
        })
        setProjetoModal(true)
    }

    async function saveProjeto() {
        if (!projetoForm.nome_projeto.trim()) return
        setSavingP(true)
        const payload = {
            nome_projeto: projetoForm.nome_projeto,
            cliente_id: id,
            tipo: projetoForm.tipo,
            descricao: projetoForm.descricao || null,
            valor: projetoForm.valor ? parseFloat(projetoForm.valor) : null,
            data_pagamento: projetoForm.data_pagamento || null,
            status_pagamento: projetoForm.status_pagamento,
            data_inicio: projetoForm.data_inicio || null,
            data_conclusao: projetoForm.data_conclusao || null,
            updated_at: new Date().toISOString(),
        }
        if (editingProjeto) {
            const { error } = await supabase.from('projetos').update(payload).eq('id', editingProjeto)
            if (error) { showToast('Erro: ' + error.message); setSavingP(false); return }
            showToast('Projeto atualizado')
        } else {
            const { error } = await supabase.from('projetos').insert(payload)
            if (error) { showToast('Erro: ' + error.message); setSavingP(false); return }
            showToast('Projeto criado')
        }
        setSavingP(false)
        setProjetoModal(false)
        loadAll()
    }

    async function deleteProjeto(pid: string) {
        if (!confirm('Excluir projeto?')) return
        const { error } = await supabase.from('projetos').delete().eq('id', pid)
        if (error) { showToast('Erro: ' + error.message); return }
        showToast('Projeto excluído')
        loadAll()
    }

    // Tarefa CRUD
    function openCreateTarefa() {
        setEditingTarefa(null)
        setTarefaForm(emptyTarefa)
        setTarefaModal(true)
    }

    function openEditTarefa(t: Tarefa) {
        setEditingTarefa(t.id)
        setTarefaForm({
            titulo: t.titulo,
            descricao: t.descricao || '',
            prazo: t.prazo || '',
            status: t.status,
            prioridade: t.prioridade,
            projeto_id: t.projeto_id || '',
        })
        setTarefaModal(true)
    }

    async function saveTarefa() {
        if (!tarefaForm.titulo.trim()) return
        setSavingT(true)
        const payload = {
            titulo: tarefaForm.titulo,
            descricao: tarefaForm.descricao || null,
            cliente_id: id,
            projeto_id: tarefaForm.projeto_id || null,
            prazo: tarefaForm.prazo || null,
            status: tarefaForm.status,
            prioridade: tarefaForm.prioridade,
            updated_at: new Date().toISOString(),
            ...(tarefaForm.status === 'Concluída' ? { data_conclusao: new Date().toISOString() } : { data_conclusao: null }),
        }
        if (editingTarefa) {
            const { error } = await supabase.from('tarefas').update(payload).eq('id', editingTarefa)
            if (error) { showToast('Erro: ' + error.message); setSavingT(false); return }
            showToast('Tarefa atualizada')
        } else {
            const { error } = await supabase.from('tarefas').insert(payload)
            if (error) { showToast('Erro: ' + error.message); setSavingT(false); return }
            showToast('Tarefa criada')
        }
        setSavingT(false)
        setTarefaModal(false)
        loadAll()
    }

    async function deleteTarefa(tid: string) {
        if (!confirm('Excluir tarefa?')) return
        const { error } = await supabase.from('tarefas').delete().eq('id', tid)
        if (error) { showToast('Erro: ' + error.message); return }
        showToast('Tarefa excluída')
        loadAll()
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-skeleton" style={{ width: 200, height: 32, marginBottom: 24 }} />
                <div className="loading-skeleton" style={{ height: 120, marginBottom: 16 }} />
                <div className="loading-skeleton" style={{ height: 200 }} />
            </div>
        )
    }

    if (!cliente) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <p>Cliente não encontrado</p>
                    <button className="btn btn-secondary" onClick={() => navigate('/clientes')}>Voltar</button>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            {/* Header with back button */}
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button className="btn btn-ghost" onClick={() => navigate('/clientes')}>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h2>{cliente.nome}</h2>
                    <p>{cliente.empresa || 'Sem empresa'}</p>
                </div>
            </div>

            {/* Client Info Card */}
            <div className="section-card animate-fade-in" style={{ marginBottom: 24 }}>
                <div className="client-info-grid">
                    <div className="client-info-item">
                        <div className="info-label">Status</div>
                        <div className="info-value">
                            <span className={`badge badge-status-${cliente.status.toLowerCase()}`}>
                                {cliente.status}
                            </span>
                        </div>
                    </div>
                    <div className="client-info-item">
                        <div className="info-label">Contato</div>
                        <div className="info-value">{cliente.contato || '—'}</div>
                    </div>
                    <div className="client-info-item">
                        <div className="info-label">Total Faturado</div>
                        <div className="info-value">{formatCurrency(totalFaturado)}</div>
                    </div>
                    <div className="client-info-item">
                        <div className="info-label">Pendente</div>
                        <div className="info-value">{totalPendente > 0 ? formatCurrency(totalPendente) : '—'}</div>
                    </div>
                    <div className="client-info-item">
                        <div className="info-label">Desde</div>
                        <div className="info-value">
                            {cliente.data_cadastro
                                ? new Date(cliente.data_cadastro).toLocaleDateString('pt-BR')
                                : '—'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Projetos */}
            <div className="section-card animate-fade-in-up" style={{ animationDelay: '0.1s', marginBottom: 24 }}>
                <div className="section-card-header">
                    <h3>Projetos / Serviços</h3>
                    <button className="btn btn-primary btn-sm" onClick={openCreateProjeto}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Novo
                    </button>
                </div>
                <div className="section-card-body">
                    {projetos.length === 0 ? (
                        <div className="empty-state">
                            <p>Nenhum projeto vinculado</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead><tr><th>Projeto</th><th>Tipo</th><th>Valor</th><th>Pagamento</th><th>Início</th><th>Conclusão</th><th></th></tr></thead>
                            <tbody>
                                {projetos.map((p) => (
                                    <tr key={p.id} className={p.status_pagamento === 'Pendente' ? 'pagamento-pendente' : ''}>
                                        <td>
                                            <strong>{p.nome_projeto}</strong>
                                            {p.descricao && <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>{p.descricao}</div>}
                                        </td>
                                        <td><span className="badge badge-light">{p.tipo}</span></td>
                                        <td>{p.valor ? formatCurrency(p.valor) : '—'}</td>
                                        <td>
                                            <span className={`badge ${p.status_pagamento === 'Pago' ? 'badge-black' : 'badge-light'}`}>
                                                {p.status_pagamento}
                                            </span>
                                        </td>
                                        <td>{formatDate(p.data_inicio)}</td>
                                        <td>{formatDate(p.data_conclusao)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEditProjeto(p)}>Editar</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => deleteProjeto(p.id)}>Excluir</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Tarefas */}
            <div className="section-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="section-card-header">
                    <h3>Tarefas</h3>
                    <button className="btn btn-primary btn-sm" onClick={openCreateTarefa}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Nova
                    </button>
                </div>
                <div className="section-card-body">
                    {tarefas.length === 0 ? (
                        <div className="empty-state">
                            <p>Nenhuma tarefa vinculada</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead><tr><th>Tarefa</th><th>Prazo</th><th>Status</th><th>Prioridade</th><th></th></tr></thead>
                            <tbody>
                                {tarefas.map((t) => {
                                    const atrasada = t.prazo && t.status !== 'Concluída' && new Date(t.prazo + 'T00:00:00') < new Date(new Date().toDateString())
                                    return (
                                        <tr key={t.id} className={`${t.prioridade === 'Alta' ? 'priority-alta' : ''} ${atrasada ? 'tarefa-atrasada' : ''}`}>
                                            <td><strong>{t.titulo}</strong></td>
                                            <td>{formatDate(t.prazo)}</td>
                                            <td>
                                                <span className={`badge ${t.status === 'Concluída' ? 'badge-black' : t.status === 'Em Andamento' ? 'badge-dark' : 'badge-light'}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge badge-priority-${t.prioridade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>
                                                    {t.prioridade}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => openEditTarefa(t)}>Editar</button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => deleteTarefa(t.id)}>Excluir</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Projeto Modal */}
            <Modal
                isOpen={projetoModal}
                onClose={() => setProjetoModal(false)}
                title={editingProjeto ? 'Editar Projeto' : 'Novo Projeto'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setProjetoModal(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={saveProjeto} disabled={savingP}>
                            {savingP ? 'Salvando...' : 'Salvar'}
                        </button>
                    </>
                }
            >
                <div className="form-group">
                    <label>Nome do Projeto *</label>
                    <input className="form-input" value={projetoForm.nome_projeto} onChange={(e) => setProjetoForm({ ...projetoForm, nome_projeto: e.target.value })} placeholder="Nome do projeto" />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Tipo</label>
                        <select className="form-select" value={projetoForm.tipo} onChange={(e) => setProjetoForm({ ...projetoForm, tipo: e.target.value as 'Pontual' | 'Recorrente' })}>
                            {tipoOpts.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Valor (R$)</label>
                        <input className="form-input" type="number" step="0.01" value={projetoForm.valor} onChange={(e) => setProjetoForm({ ...projetoForm, valor: e.target.value })} placeholder="0,00" />
                    </div>
                </div>
                <div className="form-group">
                    <label>Descrição</label>
                    <textarea className="form-textarea" value={projetoForm.descricao} onChange={(e) => setProjetoForm({ ...projetoForm, descricao: e.target.value })} placeholder="Descrição do projeto" />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Status Pagamento</label>
                        <select className="form-select" value={projetoForm.status_pagamento} onChange={(e) => setProjetoForm({ ...projetoForm, status_pagamento: e.target.value as 'Pendente' | 'Pago' })}>
                            {statusPgtoOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Data Pagamento</label>
                        <input className="form-input" type="date" value={projetoForm.data_pagamento} onChange={(e) => setProjetoForm({ ...projetoForm, data_pagamento: e.target.value })} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Data Início</label>
                        <input className="form-input" type="date" value={projetoForm.data_inicio} onChange={(e) => setProjetoForm({ ...projetoForm, data_inicio: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Data Conclusão</label>
                        <input className="form-input" type="date" value={projetoForm.data_conclusao} onChange={(e) => setProjetoForm({ ...projetoForm, data_conclusao: e.target.value })} />
                    </div>
                </div>
            </Modal>

            {/* Tarefa Modal */}
            <Modal
                isOpen={tarefaModal}
                onClose={() => setTarefaModal(false)}
                title={editingTarefa ? 'Editar Tarefa' : 'Nova Tarefa'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setTarefaModal(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={saveTarefa} disabled={savingT}>
                            {savingT ? 'Salvando...' : 'Salvar'}
                        </button>
                    </>
                }
            >
                <div className="form-group">
                    <label>Título *</label>
                    <input className="form-input" value={tarefaForm.titulo} onChange={(e) => setTarefaForm({ ...tarefaForm, titulo: e.target.value })} placeholder="Título da tarefa" />
                </div>
                <div className="form-group">
                    <label>Descrição</label>
                    <textarea className="form-textarea" value={tarefaForm.descricao} onChange={(e) => setTarefaForm({ ...tarefaForm, descricao: e.target.value })} placeholder="Descrição" />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Prazo</label>
                        <input className="form-input" type="date" value={tarefaForm.prazo} onChange={(e) => setTarefaForm({ ...tarefaForm, prazo: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Projeto</label>
                        <select className="form-select" value={tarefaForm.projeto_id} onChange={(e) => setTarefaForm({ ...tarefaForm, projeto_id: e.target.value })}>
                            <option value="">Nenhum</option>
                            {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome_projeto}</option>)}
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Status</label>
                        <select className="form-select" value={tarefaForm.status} onChange={(e) => setTarefaForm({ ...tarefaForm, status: e.target.value as Tarefa['status'] })}>
                            {statusTarefaOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Prioridade</label>
                        <select className="form-select" value={tarefaForm.prioridade} onChange={(e) => setTarefaForm({ ...tarefaForm, prioridade: e.target.value as Tarefa['prioridade'] })}>
                            {prioridadeOpts.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

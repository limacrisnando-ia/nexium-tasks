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

const tipoOpts = ['Site', 'Automação'] as const
const modeloPgtoOpts = ['50/50', 'Integral'] as const
const statusPgtoOpts = ['Pendente', 'Pago'] as const
const statusTarefaOpts = ['A Fazer', 'Em Andamento', 'Concluída'] as const
const prioridadeOpts = ['Alta', 'Média', 'Baixa'] as const

interface ProjetoFormState {
    nome_projeto: string
    tipo: Projeto['tipo']
    descricao: string
    valor_total: string
    modelo_pagamento: Projeto['modelo_pagamento']
    status_entrada: Projeto['status_entrada']
    data_entrada: string
    status_entrega: Projeto['status_entrega']
    data_entrega: string
    valor_manutencao: string
    status_manutencao: Projeto['status_manutencao']
    data_inicio: string
    data_conclusao: string
}

const emptyProjeto: ProjetoFormState = { nome_projeto: '', tipo: 'Site', descricao: '', valor_total: '', modelo_pagamento: '50/50', status_entrada: 'Pendente', data_entrada: '', status_entrega: 'Pendente', data_entrega: '', valor_manutencao: '', status_manutencao: 'Inativo', data_inicio: '', data_conclusao: '' }
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

    const totalFaturado = projetos.reduce((sum, p) => {
        let v = 0
        if (p.status_entrada === 'Pago') v += (p.valor_entrada || 0)
        if (p.status_entrega === 'Pago') v += (p.valor_entrega || 0)
        return sum + v
    }, 0)
    const totalPendente = projetos.reduce((sum, p) => {
        let v = 0
        if (p.status_entrada === 'Pendente') v += (p.valor_entrada || 0)
        if (p.status_entrega === 'Pendente') v += (p.valor_entrega || 0)
        return sum + v
    }, 0)

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
            valor_total: p.valor_total?.toString() || '',
            modelo_pagamento: p.modelo_pagamento,
            status_entrada: p.status_entrada,
            data_entrada: p.data_entrada || '',
            status_entrega: p.status_entrega,
            data_entrega: p.data_entrega || '',
            valor_manutencao: p.valor_manutencao?.toString() || '',
            status_manutencao: p.status_manutencao,
            data_inicio: p.data_inicio || '',
            data_conclusao: p.data_conclusao || '',
        })
        setProjetoModal(true)
    }

    async function saveProjeto() {
        if (!projetoForm.nome_projeto.trim()) return
        setSavingP(true)

        const vTotal = projetoForm.valor_total ? parseFloat(projetoForm.valor_total) : 0
        const modelo = projetoForm.modelo_pagamento
        const is5050 = modelo === '50/50'

        const payload = {
            nome_projeto: projetoForm.nome_projeto,
            cliente_id: id,
            tipo: projetoForm.tipo,
            descricao: projetoForm.descricao || null,
            valor_total: vTotal || null,
            modelo_pagamento: modelo,
            valor_entrada: is5050 ? Math.round(vTotal / 2 * 100) / 100 : vTotal,
            status_entrada: projetoForm.status_entrada,
            data_entrada: projetoForm.data_entrada || null,
            valor_entrega: is5050 ? Math.round(vTotal / 2 * 100) / 100 : 0,
            status_entrega: is5050 ? projetoForm.status_entrega : 'Pago',
            data_entrega: projetoForm.data_entrega || null,
            valor_manutencao: projetoForm.valor_manutencao ? parseFloat(projetoForm.valor_manutencao) : 0,
            status_manutencao: projetoForm.valor_manutencao ? projetoForm.status_manutencao : 'Inativo',
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
                            <thead><tr><th>Projeto</th><th>Tipo</th><th>Valor Total</th><th>Entrada</th><th>Entrega</th>{projetos.some(p => p.tipo === 'Automação') && <th>Manutenção</th>}<th></th></tr></thead>
                            <tbody>
                                {projetos.map((p) => {
                                    const temPendente = p.status_entrada === 'Pendente' || p.status_entrega === 'Pendente'
                                    return (
                                        <tr key={p.id} className={temPendente ? 'pagamento-pendente' : ''}>
                                            <td>
                                                <strong>{p.nome_projeto}</strong>
                                                {p.descricao && <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>{p.descricao}</div>}
                                            </td>
                                            <td><span className="badge badge-light">{p.tipo}</span></td>
                                            <td>{p.valor_total ? formatCurrency(p.valor_total) : '—'}</td>
                                            <td>
                                                <span className={`badge ${p.status_entrada === 'Pago' ? 'badge-black' : 'badge-light'}`}>
                                                    {p.status_entrada}
                                                </span>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>{p.valor_entrada ? formatCurrency(p.valor_entrada) : ''}</div>
                                            </td>
                                            <td>
                                                {p.modelo_pagamento === '50/50' ? (
                                                    <>
                                                        <span className={`badge ${p.status_entrega === 'Pago' ? 'badge-black' : 'badge-light'}`}>
                                                            {p.status_entrega}
                                                        </span>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>{p.valor_entrega ? formatCurrency(p.valor_entrega) : ''}</div>
                                                    </>
                                                ) : <span style={{ color: 'var(--gray-400)' }}>—</span>}
                                            </td>
                                            {projetos.some(pp => pp.tipo === 'Automação') && (
                                                <td>
                                                    {p.tipo === 'Automação' && p.valor_manutencao ? (
                                                        <>
                                                            <span className={`badge ${p.status_manutencao === 'Ativo' ? 'badge-black' : 'badge-light'}`}>
                                                                {p.status_manutencao}
                                                            </span>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>{formatCurrency(p.valor_manutencao)}/mês</div>
                                                        </>
                                                    ) : '—'}
                                                </td>
                                            )}
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => openEditProjeto(p)}>Editar</button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => deleteProjeto(p.id)}>Excluir</button>
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
                        <label>Tipo de Serviço</label>
                        <select className="form-select" value={projetoForm.tipo} onChange={(e) => setProjetoForm({ ...projetoForm, tipo: e.target.value as Projeto['tipo'] })}>
                            {tipoOpts.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Valor Total (R$)</label>
                        <input className="form-input" type="number" step="0.01" value={projetoForm.valor_total} onChange={(e) => setProjetoForm({ ...projetoForm, valor_total: e.target.value })} placeholder="0,00" />
                    </div>
                    <div className="form-group">
                        <label>Modelo de Pagamento</label>
                        <select className="form-select" value={projetoForm.modelo_pagamento} onChange={(e) => setProjetoForm({ ...projetoForm, modelo_pagamento: e.target.value as Projeto['modelo_pagamento'] })}>
                            {modeloPgtoOpts.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>Descrição</label>
                    <textarea className="form-textarea" value={projetoForm.descricao} onChange={(e) => setProjetoForm({ ...projetoForm, descricao: e.target.value })} placeholder="Descrição do projeto" />
                </div>

                {/* Pagamento do Serviço */}
                <div style={{ borderTop: '1px solid var(--gray-200)', margin: '12px 0', paddingTop: 12 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8, letterSpacing: 1 }}>
                        {projetoForm.modelo_pagamento === '50/50' ? 'ENTRADA (50%)' : 'PAGAMENTO INTEGRAL'}
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Valor</label>
                            <div className="form-input" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)', cursor: 'default' }}>
                                {projetoForm.valor_total ? formatCurrency(
                                    projetoForm.modelo_pagamento === '50/50'
                                        ? parseFloat(projetoForm.valor_total) / 2
                                        : parseFloat(projetoForm.valor_total)
                                ) : 'R$ 0,00'}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Status</label>
                            <select className="form-select" value={projetoForm.status_entrada} onChange={(e) => setProjetoForm({ ...projetoForm, status_entrada: e.target.value as 'Pendente' | 'Pago' })}>
                                {statusPgtoOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Data Pgto</label>
                            <input className="form-input" type="date" value={projetoForm.data_entrada} onChange={(e) => setProjetoForm({ ...projetoForm, data_entrada: e.target.value })} />
                        </div>
                    </div>
                </div>

                {/* Entrega — só se 50/50 */}
                {projetoForm.modelo_pagamento === '50/50' && (
                    <div style={{ borderTop: '1px solid var(--gray-200)', margin: '12px 0', paddingTop: 12 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8, letterSpacing: 1 }}>ENTREGA (50%)</div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Valor</label>
                                <div className="form-input" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)', cursor: 'default' }}>
                                    {projetoForm.valor_total ? formatCurrency(parseFloat(projetoForm.valor_total) / 2) : 'R$ 0,00'}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select className="form-select" value={projetoForm.status_entrega} onChange={(e) => setProjetoForm({ ...projetoForm, status_entrega: e.target.value as 'Pendente' | 'Pago' })}>
                                    {statusPgtoOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Data Pgto</label>
                                <input className="form-input" type="date" value={projetoForm.data_entrega} onChange={(e) => setProjetoForm({ ...projetoForm, data_entrega: e.target.value })} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Manutenção / Suporte — sempre visível, opcional */}
                <div style={{ borderTop: '1px solid var(--gray-200)', margin: '12px 0', paddingTop: 12 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8, letterSpacing: 1 }}>MANUTENÇÃO / SUPORTE (OPCIONAL)</div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Valor Mensal (R$)</label>
                            <input className="form-input" type="number" step="0.01" value={projetoForm.valor_manutencao} onChange={(e) => setProjetoForm({ ...projetoForm, valor_manutencao: e.target.value })} placeholder="0,00" />
                        </div>
                        <div className="form-group">
                            <label>Status</label>
                            <select className="form-select" value={projetoForm.status_manutencao} onChange={(e) => setProjetoForm({ ...projetoForm, status_manutencao: e.target.value as 'Ativo' | 'Inativo' })}>
                                <option value="Ativo">Ativo</option>
                                <option value="Inativo">Inativo</option>
                            </select>
                        </div>
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

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Tarefa, Cliente, Projeto } from '../lib/types'
import Modal from '../components/Modal'
import { showToast } from '../components/Toast'
import { NexiumIcon } from '../components/NexiumIcon'

function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

const statusOpts = ['A Fazer', 'Em Andamento', 'Concluída'] as const
const prioridadeOpts = ['Alta', 'Média', 'Baixa'] as const
const emptyForm: { titulo: string; descricao: string; cliente_id: string; projeto_id: string; prazo: string; status: Tarefa['status']; prioridade: Tarefa['prioridade'] } = { titulo: '', descricao: '', cliente_id: '', projeto_id: '', prazo: '', status: 'A Fazer', prioridade: 'Média' }

export default function Tarefas() {
    const [tarefas, setTarefas] = useState<(Tarefa & { cliente_nome?: string; nome_projeto?: string })[]>([])
    const [clientes, setClientes] = useState<Pick<Cliente, 'id' | 'nome'>[]>([])
    const [projetos, setProjetos] = useState<Pick<Projeto, 'id' | 'nome_projeto' | 'cliente_id'>[]>([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState('Todos')
    const [filterPrioridade, setFilterPrioridade] = useState('Todos')
    const [filterCliente, setFilterCliente] = useState('Todos')
    const [modalOpen, setModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)

    async function loadData() {
        setLoading(true)
        const [tRes, cRes, pRes] = await Promise.all([
            supabase.from('tarefas').select('*, clientes(nome), projetos(nome_projeto)').order('prazo'),
            supabase.from('clientes').select('id, nome').order('nome'),
            supabase.from('projetos').select('id, nome_projeto, cliente_id').order('nome_projeto'),
        ])
        if (tRes.data) {
            setTarefas(tRes.data.map((t: any) => ({
                ...t,
                cliente_nome: t.clientes?.nome,
                nome_projeto: t.projetos?.nome_projeto,
            })))
        }
        if (cRes.data) setClientes(cRes.data)
        if (pRes.data) setProjetos(pRes.data)
        setLoading(false)
    }

    useEffect(() => { loadData() }, [])

    const filtered = tarefas.filter((t) => {
        if (filterStatus !== 'Todos' && t.status !== filterStatus) return false
        if (filterPrioridade !== 'Todos' && t.prioridade !== filterPrioridade) return false
        if (filterCliente !== 'Todos' && t.cliente_id !== filterCliente) return false
        return true
    })

    function openCreate() {
        setEditingId(null)
        setForm(emptyForm)
        setModalOpen(true)
    }

    function openEdit(t: Tarefa) {
        setEditingId(t.id)
        setForm({
            titulo: t.titulo,
            descricao: t.descricao || '',
            cliente_id: t.cliente_id || '',
            projeto_id: t.projeto_id || '',
            prazo: t.prazo || '',
            status: t.status,
            prioridade: t.prioridade,
        })
        setModalOpen(true)
    }

    async function handleSave() {
        if (!form.titulo.trim()) return
        setSaving(true)
        const payload = {
            titulo: form.titulo,
            descricao: form.descricao || null,
            cliente_id: form.cliente_id || null,
            projeto_id: form.projeto_id || null,
            prazo: form.prazo || null,
            status: form.status,
            prioridade: form.prioridade,
            updated_at: new Date().toISOString(),
            ...(form.status === 'Concluída' ? { data_conclusao: new Date().toISOString() } : { data_conclusao: null }),
        }
        if (editingId) {
            const { error } = await supabase.from('tarefas').update(payload).eq('id', editingId)
            if (error) { showToast('Erro: ' + error.message); setSaving(false); return }
            showToast('Tarefa atualizada')
        } else {
            const { error } = await supabase.from('tarefas').insert(payload)
            if (error) { showToast('Erro: ' + error.message); setSaving(false); return }
            showToast('Tarefa criada')
        }
        setSaving(false)
        setModalOpen(false)
        loadData()
    }

    async function handleDelete(id: string) {
        if (!confirm('Excluir tarefa?')) return
        const { error } = await supabase.from('tarefas').delete().eq('id', id)
        if (error) { showToast('Erro: ' + error.message); return }
        showToast('Tarefa excluída')
        loadData()
    }

    const filteredProjetos = form.cliente_id
        ? projetos.filter((p) => p.cliente_id === form.cliente_id)
        : projetos

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>Tarefas</h2>
                <p>Gerencie todas as suas tarefas</p>
            </div>

            <div className="filters-bar">
                <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="Todos">Todos os status</option>
                    {statusOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="filter-select" value={filterPrioridade} onChange={(e) => setFilterPrioridade(e.target.value)}>
                    <option value="Todos">Todas as prioridades</option>
                    {prioridadeOpts.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select className="filter-select" value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}>
                    <option value="Todos">Todos os clientes</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <div style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={openCreate}>
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Nova Tarefa
                </button>
            </div>

            <div className="section-card animate-fade-in">
                <div className="section-card-body">
                    {loading ? (
                        <div style={{ padding: 24 }}>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="loading-skeleton" style={{ height: 48, marginBottom: 8 }} />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-brand">
                                <NexiumIcon size={60} color="#000" />
                            </div>
                            <p>Nenhuma tarefa encontrada</p>
                            <button className="btn btn-secondary" onClick={openCreate}>Criar primeira tarefa</button>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Tarefa</th>
                                    <th>Cliente</th>
                                    <th>Prazo</th>
                                    <th>Status</th>
                                    <th>Prioridade</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody className="stagger-children">
                                {filtered.map((t) => {
                                    const atrasada = t.prazo && t.status !== 'Concluída' && new Date(t.prazo + 'T00:00:00') < new Date(new Date().toDateString())
                                    return (
                                        <tr key={t.id} className={`${t.prioridade === 'Alta' ? 'priority-alta' : ''} ${atrasada ? 'tarefa-atrasada' : ''}`}>
                                            <td>
                                                <strong>{t.titulo}</strong>
                                                {t.nome_projeto && (
                                                    <div style={{ fontSize: '0.75rem', color: atrasada ? 'var(--gray-400)' : 'var(--gray-500)', marginTop: 2 }}>
                                                        {t.nome_projeto}
                                                    </div>
                                                )}
                                            </td>
                                            <td>{t.cliente_nome || '—'}</td>
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
                                                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Editar</button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(t.id)}>Excluir</button>
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

            {/* Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingId ? 'Editar Tarefa' : 'Nova Tarefa'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </>
                }
            >
                <div className="form-group">
                    <label>Título *</label>
                    <input className="form-input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título da tarefa" />
                </div>
                <div className="form-group">
                    <label>Descrição</label>
                    <textarea className="form-textarea" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição" />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Cliente</label>
                        <select className="form-select" value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value, projeto_id: '' })}>
                            <option value="">Nenhum</option>
                            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Projeto</label>
                        <select className="form-select" value={form.projeto_id} onChange={(e) => setForm({ ...form, projeto_id: e.target.value })}>
                            <option value="">Nenhum</option>
                            {filteredProjetos.map((p) => <option key={p.id} value={p.id}>{p.nome_projeto}</option>)}
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Prazo</label>
                        <input className="form-input" type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Prioridade</label>
                        <select className="form-select" value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value as Tarefa['prioridade'] })}>
                            {prioridadeOpts.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label>Status</label>
                    <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Tarefa['status'] })}>
                        {statusOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </Modal>
        </div>
    )
}

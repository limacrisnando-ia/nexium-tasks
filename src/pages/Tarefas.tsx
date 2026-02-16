import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Tarefa, Cliente, Projeto } from '../lib/types'
import Modal from '../components/Modal'
import { showToast } from '../components/Toast'
import { NexiumIcon } from '../components/NexiumIcon'
import { useFoco, phaseLabel, phaseColor, type QueueTask } from '../contexts/FocoContext'

function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}
function pad(n: number) { return n.toString().padStart(2, '0') }
function fmtTime(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}` }

const FOCUS_TIME = 25 * 60
const SHORT_BREAK = 5 * 60
const LONG_BREAK = 15 * 60

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
    const [focoMode, setFocoMode] = useState(false)
    const [focoClienteId, setFocoClienteId] = useState('')

    const foco = useFoco()
    const {
        phase, timeLeft, running, cycleCount,
        fila, currentIndex,
        startTimer, pauseTimer, resetTimer, skipPhase,
        addToQueue, removeFromQueue, moveUp, moveDown,
        completeCurrent, setSelectedCliente,
    } = foco

    const currentTask = fila[currentIndex]
    const totalTime = phase === 'focus' ? FOCUS_TIME : phase === 'shortBreak' ? SHORT_BREAK : LONG_BREAK
    const progress = 1 - timeLeft / totalTime
    const circumference = 2 * Math.PI * 45
    const strokeDashoffset = circumference * (1 - progress)

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
        if (focoMode && focoClienteId) {
            if (t.cliente_id !== focoClienteId) return false
        } else if (filterCliente !== 'Todos' && t.cliente_id !== filterCliente) {
            return false
        }
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

    async function updateStatus(id: string, status: string) {
        await supabase.from('tarefas').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    }

    async function syncQueueStatuses(queue: QueueTask[], activeIdx: number) {
        // Position at activeIdx → "Em Andamento"; all others (non-concluded) → "A Fazer"
        const updates: Promise<void>[] = []
        for (let i = 0; i < queue.length; i++) {
            if (queue[i].status === 'Concluída') continue
            const target = i === activeIdx ? 'Em Andamento' : 'A Fazer'
            if (queue[i].status !== target) {
                updates.push(updateStatus(queue[i].id, target))
            }
        }
        if (updates.length > 0) {
            await Promise.all(updates)
            loadData()
        }
    }

    function activateFocoMode() {
        if (!focoClienteId) {
            showToast('Selecione um cliente para o modo foco')
            return
        }
        const clientTasks = tarefas.filter(
            t => t.cliente_id === focoClienteId && t.status !== 'Concluída'
        )
        if (clientTasks.length === 0) {
            showToast('Nenhuma tarefa pendente para este cliente')
            return
        }
        setSelectedCliente(focoClienteId)
        fila.forEach(f => removeFromQueue(f.id))
        clientTasks.forEach(t => {
            addToQueue({ ...t, cliente_nome: t.cliente_nome, nome_projeto: t.nome_projeto })
        })
        syncQueueStatuses(clientTasks, 0)
        setFocoMode(true)
        const clientName = clientes.find(c => c.id === focoClienteId)?.nome || ''
        showToast(`🎯 Modo Foco ativado — ${clientTasks.length} tarefa(s) de ${clientName}`)
    }

    async function deactivateFocoMode() {
        pauseTimer()
        // Revert the current active task (at currentIndex) back to "A Fazer"
        const activeTask = fila[currentIndex]
        if (activeTask && activeTask.status !== 'Concluída') {
            await updateStatus(activeTask.id, 'A Fazer')
        }
        fila.forEach(f => removeFromQueue(f.id))
        setFocoMode(false)
        setFocoClienteId('')
        loadData()
    }

    async function handleCompleteCurrent() {
        const nextTask = fila[currentIndex + 1]
        await completeCurrent()
        if (nextTask && nextTask.status !== 'Concluída') {
            await updateStatus(nextTask.id, 'Em Andamento')
        }
        loadData()
    }

    async function handleMoveUp(idx: number) {
        if (idx === 0) return
        moveUp(idx)
        // After swap the queue has changed — sync based on currentIndex
        // Build the new queue state manually (fila hasn't updated yet in this render)
        const newQueue = [...fila];
        [newQueue[idx - 1], newQueue[idx]] = [newQueue[idx], newQueue[idx - 1]]
        await syncQueueStatuses(newQueue, currentIndex)
    }

    async function handleMoveDown(idx: number) {
        if (idx === fila.length - 1) return
        moveDown(idx)
        const newQueue = [...fila];
        [newQueue[idx], newQueue[idx + 1]] = [newQueue[idx + 1], newQueue[idx]]
        await syncQueueStatuses(newQueue, currentIndex)
    }

    async function handleRemoveFromQueue(id: string) {
        const taskIdx = fila.findIndex(f => f.id === id)
        const task = fila[taskIdx]
        removeFromQueue(id)
        // Revert removed task if it was active
        if (task && task.status === 'Em Andamento') {
            await updateStatus(id, 'A Fazer')
        }
        // If removed task was at currentIndex, new task at that index needs "Em Andamento"
        if (taskIdx === currentIndex) {
            const remaining = fila.filter(f => f.id !== id)
            const newIdx = Math.min(currentIndex, remaining.length - 1)
            if (newIdx >= 0 && remaining[newIdx] && remaining[newIdx].status !== 'Concluída') {
                await updateStatus(remaining[newIdx].id, 'Em Andamento')
            }
        }
        loadData()
    }

    const filteredProjetos = form.cliente_id
        ? projetos.filter((p) => p.cliente_id === form.cliente_id)
        : projetos

    const filaIds = new Set(fila.map(f => f.id))

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

            {/* ─── Modo Foco Section ─── */}
            {!focoMode && fila.length === 0 ? (
                <div className="foco-section animate-fade-in">
                    <div className="foco-section-inner">
                        <div className="foco-section-left">
                            <span className="foco-section-icon">⏱</span>
                            <div>
                                <div className="foco-section-title">Modo Foco</div>
                                <div className="foco-section-desc">Selecione um cliente para iniciar o timer com todas as tarefas pendentes</div>
                            </div>
                        </div>
                        <div className="foco-section-right">
                            <select
                                className="filter-select"
                                value={focoClienteId}
                                onChange={(e) => setFocoClienteId(e.target.value)}
                            >
                                <option value="">Selecionar cliente...</option>
                                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                            <button className="btn btn-primary" onClick={activateFocoMode}>
                                Ativar Modo Foco
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* ─── Inline Timer Bar (active) ─── */
                <div className="timer-bar animate-fade-in">
                    <div className="timer-bar-main">
                        {/* Mini circle */}
                        <div className="timer-bar-circle">
                            <svg viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--gray-200)" strokeWidth="6" />
                                <circle
                                    cx="50" cy="50" r="45"
                                    fill="none"
                                    stroke={phaseColor[phase]}
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    transform="rotate(-90 50 50)"
                                    style={{ transition: 'stroke-dashoffset 0.3s linear' }}
                                />
                            </svg>
                            <span className="timer-bar-time" style={{ color: phaseColor[phase] }}>{fmtTime(timeLeft)}</span>
                        </div>

                        {/* Info */}
                        <div className="timer-bar-info">
                            <div className="timer-bar-phase" style={{ color: phaseColor[phase] }}>{phaseLabel[phase]}</div>
                            {currentTask && (
                                <div className="timer-bar-task">
                                    {currentTask.titulo}
                                    {currentTask.cliente_nome && <span className="timer-bar-task-client"> · {currentTask.cliente_nome}</span>}
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="timer-bar-controls">
                            {!running ? (
                                <button className="timer-bar-btn timer-bar-btn-primary" onClick={startTimer} title="Iniciar">▶</button>
                            ) : (
                                <button className="timer-bar-btn" onClick={pauseTimer} title="Pausar">⏸</button>
                            )}
                            <button className="timer-bar-btn" onClick={skipPhase} title="Pular fase">⏭</button>
                            <button className="timer-bar-btn" onClick={resetTimer} title="Resetar">↺</button>
                            {currentTask && (
                                <button className="timer-bar-btn timer-bar-btn-success" onClick={handleCompleteCurrent} title="Concluir tarefa atual">✓</button>
                            )}
                        </div>

                        <div className="timer-bar-cycle">Ciclo {cycleCount + 1}</div>

                        {/* Queue count */}
                        <div className="timer-bar-queue-info">
                            {currentIndex + 1}/{fila.length} tarefas
                        </div>

                        <button className="timer-bar-btn timer-bar-btn-exit" onClick={deactivateFocoMode} title="Encerrar modo foco">✕</button>
                    </div>

                    {/* Queue list */}
                    {fila.length > 1 && (
                        <div className="timer-bar-queue">
                            {fila.map((t, idx) => (
                                <div key={t.id} className={`timer-bar-queue-item ${idx === currentIndex ? 'active' : ''}`}>
                                    <span className="timer-bar-queue-num">{idx + 1}</span>
                                    <span className="timer-bar-queue-title">{t.titulo}</span>
                                    <div className="timer-bar-queue-actions">
                                        <button onClick={() => handleMoveUp(idx)} disabled={idx === 0}>↑</button>
                                        <button onClick={() => handleMoveDown(idx)} disabled={idx === fila.length - 1}>↓</button>
                                        <button onClick={() => handleRemoveFromQueue(t.id)} className="timer-bar-queue-remove">×</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Kanban Board ─── */}
            {loading ? (
                <div className="section-card animate-fade-in">
                    <div className="section-card-body" style={{ padding: 24 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="loading-skeleton" style={{ height: 48, marginBottom: 8 }} />
                        ))}
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="section-card animate-fade-in">
                    <div className="section-card-body">
                        <div className="empty-state">
                            <div className="empty-state-brand">
                                <NexiumIcon size={60} color="#000" />
                            </div>
                            <p>Nenhuma tarefa encontrada</p>
                            <button className="btn btn-secondary" onClick={openCreate}>Criar primeira tarefa</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="kanban-board animate-fade-in">
                    {statusOpts.map((status) => {
                        const columnTasks = filtered.filter(t => t.status === status)
                        const statusIcon = status === 'A Fazer' ? '⏳' : status === 'Em Andamento' ? '🔄' : '✅'
                        const statusClass = status === 'A Fazer' ? 'afazer' : status === 'Em Andamento' ? 'andamento' : 'concluida'
                        return (
                            <div key={status} className={`kanban-column kanban-${statusClass}`}>
                                <div className="kanban-column-header">
                                    <span className="kanban-column-icon">{statusIcon}</span>
                                    <span className="kanban-column-title">{status}</span>
                                    <span className="kanban-column-count">{columnTasks.length}</span>
                                </div>
                                <div className="kanban-column-body">
                                    {columnTasks.length === 0 ? (
                                        <div className="kanban-empty">Nenhuma tarefa</div>
                                    ) : (
                                        columnTasks.map((t) => {
                                            const atrasada = t.prazo && t.status !== 'Concluída' && new Date(t.prazo + 'T00:00:00') < new Date(new Date().toDateString())
                                            const inQueue = filaIds.has(t.id)
                                            return (
                                                <div key={t.id} className={`kanban-card ${atrasada ? 'kanban-card-late' : ''} ${inQueue ? 'kanban-card-queued' : ''}`}>
                                                    <div className="kanban-card-header">
                                                        <span className="kanban-card-title">{t.titulo}</span>
                                                        <span className={`kanban-card-priority kanban-priority-${t.prioridade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>
                                                            {t.prioridade}
                                                        </span>
                                                    </div>
                                                    {t.nome_projeto && (
                                                        <div className="kanban-card-project">{t.nome_projeto}</div>
                                                    )}
                                                    <div className="kanban-card-meta">
                                                        {t.cliente_nome && <span>👤 {t.cliente_nome}</span>}
                                                        {t.prazo && <span className={atrasada ? 'kanban-card-late-text' : ''}>📅 {formatDate(t.prazo)}</span>}
                                                    </div>
                                                    <div className="kanban-card-actions">
                                                        {status !== 'Concluída' && (
                                                            <button
                                                                className="kanban-card-action-btn kanban-advance-btn"
                                                                onClick={async () => {
                                                                    const nextStatus = status === 'A Fazer' ? 'Em Andamento' : 'Concluída'
                                                                    await supabase.from('tarefas').update({
                                                                        status: nextStatus,
                                                                        updated_at: new Date().toISOString(),
                                                                        ...(nextStatus === 'Concluída' ? { data_conclusao: new Date().toISOString().split('T')[0] } : {}),
                                                                    }).eq('id', t.id)
                                                                    showToast(`Tarefa movida para "${nextStatus}"`)
                                                                    loadData()
                                                                }}
                                                                title={status === 'A Fazer' ? 'Mover para Em Andamento' : 'Concluir'}
                                                            >
                                                                {status === 'A Fazer' ? '→ Iniciar' : '✓ Concluir'}
                                                            </button>
                                                        )}
                                                        <button className="kanban-card-action-btn" onClick={() => openEdit(t)}>✏️</button>
                                                        <button className="kanban-card-action-btn kanban-delete-btn" onClick={() => handleDelete(t.id)}>🗑</button>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

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

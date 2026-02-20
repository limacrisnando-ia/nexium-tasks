import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from '../components/Modal'
import { showToast } from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'

interface Usuario {
    id: string
    email: string
    nome: string
    role: 'SUPERADMIN' | 'USER'
    ativo: boolean
    created_at: string
    total_clientes?: number
    total_tarefas?: number
    tarefas_concluidas?: number
    valor_total_faturado?: number
}

export default function AdminUsuarios() {
    const { usuario: currentUser } = useAuth()
    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [form, setForm] = useState({ nome: '', email: '' })
    const [saving, setSaving] = useState(false)

    async function loadUsuarios() {
        setLoading(true)
        const { data } = await supabase.from('vw_relatorio_usuarios').select('*').order('created_at')
        if (data) setUsuarios(data)
        setLoading(false)
    }

    useEffect(() => { loadUsuarios() }, [])

    async function handleCreate() {
        if (!form.email.trim() || !form.nome.trim()) {
            showToast('Preencha nome e email')
            return
        }
        setSaving(true)
        const { error } = await supabase.from('usuarios').insert({
            nome: form.nome,
            email: form.email,
            role: 'USER',
            ativo: true,
        })
        if (error) {
            showToast('Erro: ' + (error.message.includes('duplicate') ? 'Email já cadastrado' : error.message))
        } else {
            showToast('Usuário criado com sucesso')
            setModalOpen(false)
            setForm({ nome: '', email: '' })
        }
        setSaving(false)
        loadUsuarios()
    }

    async function toggleAtivo(user: Usuario) {
        // Prevent self-deactivation
        if (user.id === currentUser?.id) {
            showToast('Você não pode desativar a si próprio')
            return
        }
        const { error } = await supabase
            .from('usuarios')
            .update({ ativo: !user.ativo, updated_at: new Date().toISOString() })
            .eq('id', user.id)
        if (error) {
            showToast('Erro: ' + error.message)
        } else {
            showToast(user.ativo ? 'Usuário desativado' : 'Usuário ativado')
        }
        loadUsuarios()
    }

    function formatCurrency(value: number) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>
                    👤 Gerenciar Usuários
                    <span className="admin-badge">ADMIN</span>
                </h2>
                <p>Adicione e gerencie os usuários do sistema</p>
            </div>

            <div className="filters-bar">
                <div style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={() => { setForm({ nome: '', email: '' }); setModalOpen(true) }}>
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Novo Usuário
                </button>
            </div>

            {loading ? (
                <div className="section-card">
                    <div className="section-card-body" style={{ padding: 24 }}>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="loading-skeleton" style={{ height: 48, marginBottom: 8 }} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="section-card animate-fade-in">
                    <div className="section-card-body">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Usuário</th>
                                    <th>Role</th>
                                    <th>Clientes</th>
                                    <th>Tarefas</th>
                                    <th>Faturado</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody className="stagger-children">
                                {usuarios.map((u) => (
                                    <tr key={u.id} style={{ opacity: u.ativo ? 1 : 0.5 }}>
                                        <td>
                                            <strong>{u.nome}</strong>
                                            {u.role === 'SUPERADMIN' && <span className="admin-badge" style={{ marginLeft: 6 }}>ADMIN</span>}
                                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{u.email}</div>
                                        </td>
                                        <td>
                                            <span className={`badge ${u.role === 'SUPERADMIN' ? 'badge-priority-alta' : 'badge-light'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td>{u.total_clientes ?? 0}</td>
                                        <td>{u.total_tarefas ?? 0} ({u.tarefas_concluidas ?? 0} ✓)</td>
                                        <td>{formatCurrency(u.valor_total_faturado ?? 0)}</td>
                                        <td>
                                            <span className={`badge ${u.ativo ? 'badge-status-ativo' : 'badge-status-inativo'}`}>
                                                {u.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={`kanban-card-action-btn ${u.ativo ? 'kanban-delete-btn' : 'kanban-advance-btn'}`}
                                                onClick={() => toggleAtivo(u)}
                                                disabled={u.id === currentUser?.id}
                                                title={u.id === currentUser?.id ? 'Não é possível desativar a si próprio' : ''}
                                            >
                                                {u.ativo ? 'Desativar' : 'Ativar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Novo Usuário"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                            {saving ? 'Salvando...' : 'Criar Usuário'}
                        </button>
                    </>
                }
            >
                <div className="form-group">
                    <label>Nome *</label>
                    <input className="form-input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do usuário" />
                </div>
                <div className="form-group">
                    <label>Email *</label>
                    <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 8 }}>
                    O usuário será criado com role <strong>USER</strong> e status <strong>Ativo</strong>.
                    Ele precisará fazer login com este email para acessar o sistema.
                </p>
            </Modal>
        </div>
    )
}

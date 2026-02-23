import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Cliente, ValorTotalCliente } from '../lib/types'
import Modal from '../components/Modal'
import { showToast } from '../components/Toast'
import { NexiumIcon } from '../components/NexiumIcon'
import { useLanguage } from '../contexts/LanguageContext'

const statusOptions = ['Ativo', 'Inativo', 'Prospect'] as const

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const emptyCliente: { nome: string; contato: string; empresa: string; status: Cliente['status'] } = { nome: '', contato: '', empresa: '', status: 'Prospect' }

export default function Clientes() {
    const navigate = useNavigate()
    const { t } = useLanguage()
    const [clientes, setClientes] = useState<ValorTotalCliente[]>([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState<string>('Todos')
    const [modalOpen, setModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState(emptyCliente)
    const [saving, setSaving] = useState(false)

    async function loadClientes() {
        setLoading(true)
        const { data } = await supabase.from('vw_valor_total_cliente').select('*').order('nome')
        if (data) setClientes(data)
        setLoading(false)
    }

    useEffect(() => { loadClientes() }, [])

    const filtered = filterStatus === 'Todos'
        ? clientes
        : clientes.filter((c) => c.status === filterStatus)

    function openCreate() {
        setEditingId(null)
        setForm(emptyCliente)
        setModalOpen(true)
    }

    async function openEdit(id: string) {
        const { data } = await supabase.from('clientes').select('*').eq('id', id).single()
        if (data) {
            setEditingId(id)
            setForm({
                nome: data.nome,
                contato: data.contato || '',
                empresa: data.empresa || '',
                status: data.status || 'Prospect',
            })
            setModalOpen(true)
        }
    }

    async function handleSave() {
        if (!form.nome.trim()) return
        setSaving(true)
        if (editingId) {
            const { error } = await supabase.from('clientes').update({
                nome: form.nome,
                contato: form.contato || null,
                empresa: form.empresa || null,
                status: form.status,
                updated_at: new Date().toISOString(),
            }).eq('id', editingId)
            if (error) { showToast(t('common.error') + ': ' + error.message); setSaving(false); return }
            showToast(t('clients.updated'))
        } else {
            const { error } = await supabase.from('clientes').insert({
                nome: form.nome,
                contato: form.contato || null,
                empresa: form.empresa || null,
                status: form.status,
            })
            if (error) { showToast(t('common.error') + ': ' + error.message); setSaving(false); return }
            showToast(t('clients.created'))
        }
        setSaving(false)
        setModalOpen(false)
        loadClientes()
    }

    async function handleDelete(id: string) {
        if (!confirm(t('clients.deleteConfirm'))) return
        const { error } = await supabase.from('clientes').delete().eq('id', id)
        if (error) { showToast(t('common.error') + ': ' + error.message); return }
        showToast(t('clients.deleted'))
        loadClientes()
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>{t('clients.title')}</h2>
                <p>{t('clients.subtitle')}</p>
            </div>

            <div className="filters-bar">
                <select
                    className="filter-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="Todos">{t('clients.allStatuses')}</option>
                    {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={openCreate}>
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {t('clients.new')}
                </button>
            </div>

            <div className="section-card animate-fade-in">
                <div className="section-card-body">
                    {loading ? (
                        <div style={{ padding: 24 }}>
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="loading-skeleton" style={{ height: 48, marginBottom: 8 }} />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-brand">
                                <NexiumIcon size={60} color="#000" />
                            </div>
                            <p>{t('clients.noClients')}</p>
                            <button className="btn btn-secondary" onClick={openCreate}>{t('clients.addFirst')}</button>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>{t('clients.name')}</th>
                                    <th>{t('clients.company')}</th>
                                    <th>{t('clients.status')}</th>
                                    <th>{t('clients.billed')}</th>
                                    <th>{t('clients.pending')}</th>
                                    <th>{t('clients.projects')}</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody className="stagger-children">
                                {filtered.map((c) => (
                                    <tr key={c.id} className="clickable-row" onClick={() => navigate(`/clientes/${c.id}`)}>
                                        <td><strong>{c.nome}</strong></td>
                                        <td>{c.empresa || '—'}</td>
                                        <td>
                                            <span className={`badge badge-status-${c.status.toLowerCase()}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td>{formatCurrency(c.valor_total_faturado)}</td>
                                        <td>{c.valor_pendente > 0 ? formatCurrency(c.valor_pendente) : '—'}</td>
                                        <td>{c.total_projetos}</td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c.id)}>
                                                    {t('common.edit')}
                                                </button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)}>
                                                    {t('common.delete')}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal Create/Edit */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingId ? t('clients.editClient') : t('clients.newClient')}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? t('common.saving') : t('common.save')}
                        </button>
                    </>
                }
            >
                <div className="form-group">
                    <label>{t('clients.name')} *</label>
                    <input
                        className="form-input"
                        value={form.nome}
                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        placeholder={t('clients.clientName')}
                    />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>{t('clients.contact')}</label>
                        <input
                            className="form-input"
                            value={form.contato}
                            onChange={(e) => setForm({ ...form, contato: e.target.value })}
                            placeholder={t('clients.phonePlaceholder')}
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('clients.company')}</label>
                        <input
                            className="form-input"
                            value={form.empresa}
                            onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                            placeholder={t('clients.companyPlaceholder')}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label>{t('clients.status')}</label>
                    <select
                        className="form-select"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value as Cliente['status'] })}
                    >
                        {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </Modal>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useLanguage } from '../contexts/LanguageContext'
import { showToast } from '../components/Toast'
import type { SistemaAtualizacao } from '../lib/types'

export default function AdminAtualizacoes() {
    const { t } = useLanguage()
    const [atualizacoes, setAtualizacoes] = useState<SistemaAtualizacao[]>([])
    const [loading, setLoading] = useState(true)

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<SistemaAtualizacao | null>(null)
    const [formData, setFormData] = useState({
        tipo: 'Novo',
        titulo: '',
        descricao: '',
        data: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        fetchAtualizacoes()
    }, [])

    async function fetchAtualizacoes() {
        setLoading(true)
        const { data, error } = await supabase
            .from('sistema_atualizacoes')
            .select('*')
            .order('data', { ascending: false })

        if (error) {
            console.error('Error fetching updates:', error)
            showToast(t('common.error'))
        } else {
            setAtualizacoes(data || [])
        }
        setLoading(false)
    }

    function openModal(item?: SistemaAtualizacao) {
        if (item) {
            setEditingItem(item)
            setFormData({
                tipo: item.tipo,
                titulo: item.titulo,
                descricao: item.descricao,
                data: item.data.split('T')[0]
            })
        } else {
            setEditingItem(null)
            setFormData({
                tipo: 'Novo',
                titulo: '',
                descricao: '',
                data: new Date().toISOString().split('T')[0]
            })
        }
        setIsModalOpen(true)
    }

    function closeModal() {
        setIsModalOpen(false)
        setEditingItem(null)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!formData.titulo.trim()) {
            showToast(t('clientDetail.titleRequired'))
            return
        }

        let error
        if (editingItem) {
            const { error: err } = await supabase
                .from('sistema_atualizacoes')
                .update({
                    ...formData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingItem.id)
            error = err
        } else {
            const { error: err } = await supabase
                .from('sistema_atualizacoes')
                .insert([formData])
            error = err
        }

        if (error) {
            console.error('Error saving update:', error)
            showToast(t('common.error'))
        } else {
            showToast(editingItem ? t('clientDetail.noteUpdated') : t('clientDetail.noteCreated'))
            closeModal()
            fetchAtualizacoes()
        }
    }

    async function handleDelete(id: string) {
        if (!window.confirm(t('clientDetail.confirmDeleteNote'))) return

        const { error } = await supabase
            .from('sistema_atualizacoes')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting update:', error)
            showToast(t('common.error'))
        } else {
            showToast(t('clientDetail.noteDeleted'))
            fetchAtualizacoes()
        }
    }

    function handleCopy(item: SistemaAtualizacao) {
        const emojiMap: Record<string, string> = {
            'Novo': '🚀',
            'Melhoria': '✨',
            'Correção': '🔧',
            'Aviso': '📢'
        }

        const emoji = emojiMap[item.tipo] || '💡'
        const text = `${emoji} *${item.tipo}:* ${item.titulo}\n\n${item.descricao}`

        navigator.clipboard.writeText(text).then(() => {
            showToast(t('admin.updates.copied'))
        }).catch(() => {
            showToast(t('common.error'))
        })
    }

    function getTypeColor(tipo: string) {
        switch (tipo) {
            case 'Novo': return 'var(--color-success)'
            case 'Melhoria': return 'var(--color-primary)'
            case 'Correção': return 'var(--color-warning)'
            case 'Aviso': return 'var(--color-text-secondary)'
            default: return 'var(--color-primary)'
        }
    }

    return (
        <div className="page-container fade-in">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">{t('admin.updates.title')}</h1>
                    <p className="page-subtitle">{t('admin.updates.subtitle')}</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    + {t('admin.updates.new')}
                </button>
            </header>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <div className="login-spinner" />
                </div>
            ) : atualizacoes.length === 0 ? (
                <div className="empty-state">
                    <p>{t('tasks.none')}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                    {atualizacoes.map(item => (
                        <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        backgroundColor: `${getTypeColor(item.tipo)}15`,
                                        color: getTypeColor(item.tipo),
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {item.tipo}
                                    </span>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{item.titulo}</h3>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                        {new Date(item.data).toLocaleDateString()}
                                    </span>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleCopy(item)}
                                        title={t('admin.updates.copyText')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        <span style={{ fontSize: '12px' }}>{t('admin.updates.copyText')}</span>
                                    </button>
                                    <button className="icon-btn" onClick={() => openModal(item)} title={t('common.edit')}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    <button className="icon-btn" onClick={() => handleDelete(item.id)} title={t('common.delete')} style={{ color: 'var(--color-danger)' }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                {item.descricao}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Criação / Edição */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px', padding: '24px' }}>
                        <div className="modal-header" style={{ marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                                {editingItem ? t('common.edit') : t('admin.updates.new')}
                            </h2>
                            <button className="icon-btn" onClick={closeModal}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">{t('admin.updates.type')}</label>
                                <select
                                    className="form-input"
                                    value={formData.tipo}
                                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                >
                                    <option value="Novo">{t('admin.updates.typeNew')}</option>
                                    <option value="Melhoria">{t('admin.updates.typeImprovement')}</option>
                                    <option value="Correção">{t('admin.updates.typeFix')}</option>
                                    <option value="Aviso">{t('admin.updates.typeNotice')}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('admin.updates.date')}</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.data}
                                    onChange={e => setFormData({ ...formData, data: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Título</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.titulo}
                                    onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                                    placeholder={t('admin.updates.placeholderTitle')}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('admin.updates.desc')}</label>
                                <textarea
                                    className="form-textarea"
                                    value={formData.descricao}
                                    onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                    placeholder={t('admin.updates.placeholderDesc')}
                                    rows={6}
                                    required
                                />
                            </div>
                            <div className="modal-actions" style={{ marginTop: '8px' }}>
                                <button type="button" className="btn btn-ghost" onClick={closeModal}>
                                    {t('common.cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

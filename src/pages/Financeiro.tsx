import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Gasto } from '../lib/types'
import { NexiumIcon } from '../components/NexiumIcon'
import { useLanguage } from '../contexts/LanguageContext'
import { showToast } from '../components/Toast'

function formatCurrency(value: number, locale: string = 'pt-BR') {
    return locale === 'en'
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
        : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const monthNamesPt = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function Financeiro() {
    const { t, locale } = useLanguage()
    const [gastos, setGastos] = useState<Gasto[]>([])
    const [loading, setLoading] = useState(true)

    // Valores do mês
    const [faturamentoTotal, setFaturamentoTotal] = useState(0)
    const [receitaRecorrente, setReceitaRecorrente] = useState(0)
    const [totalGastosMes, setTotalGastosMes] = useState(0)

    // Filtros
    const now = new Date()
    const [filterMes, setFilterMes] = useState(now.getMonth() + 1)
    const [filterAno, setFilterAno] = useState(now.getFullYear())

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingGasto, setEditingGasto] = useState<Gasto | null>(null)
    const [formData, setFormData] = useState({
        descricao: '',
        valor: '',
        tipo: 'Único' as 'Único' | 'Recorrente',
        cobranca: 'Cartão',
        categoria: 'admin.finance.catTools',
        data_gasto: new Date().toISOString().split('T')[0],
        data_fim: '',
        status: 'Ativo' as 'Ativo' | 'Inativo'
    })

    const loadDados = async () => {
        setLoading(true)
        try {
            const startDate = `${filterAno}-${String(filterMes).padStart(2, '0')}-01`
            const endDateObj = new Date(filterAno, filterMes, 1) // First day of next month
            const endDate = endDateObj.toISOString().split('T')[0]

            // 1. Carregar Gastos
            const { data: gastosData, error: gastosErr } = await supabase
                .from('gastos')
                .select('*')
                .order('data_gasto', { ascending: false })

            if (gastosErr) throw gastosErr

            // Filtrar gastos para o mês selecionado
            // - Únicos: Devem ter acontecido no mês/ano exato
            // - Recorrentes: Devem estar Ativos e ter iniciado no mês/ano *ou antes*
            const gastosFiltrados = (gastosData as Gasto[]).filter(g => {
                const dataGasto = new Date(g.data_gasto + 'T00:00:00')
                if (g.tipo === 'Único') {
                    return dataGasto.getMonth() + 1 === filterMes && dataGasto.getFullYear() === filterAno
                } else {
                    // Recorrente rules:
                    // 1. Started exactly or before the selected month end
                    // 2. Either active, or if it ended, it ended *after* the start of the selected month
                    const startedBeforeEndOfMonth = dataGasto < endDateObj

                    let isStillValid = true
                    if (g.data_fim) {
                        const dataFim = new Date(g.data_fim + 'T00:00:00')
                        const startOfMonth = new Date(filterAno, filterMes - 1, 1) // First day of the selected month
                        isStillValid = dataFim >= startOfMonth
                    } else {
                        isStillValid = g.status === 'Ativo'
                    }

                    return startedBeforeEndOfMonth && isStillValid
                }
            })

            setGastos(gastosFiltrados)
            const somaGastos = gastosFiltrados.reduce((acc, g) => acc + Number(g.valor), 0)
            setTotalGastosMes(somaGastos)

            // 2. Carregar Receitas (Faturamento Fixo e Recorrente)
            const { data: projetos, error: projErr } = await supabase
                .from('projetos')
                .select('valor_entrada, status_entrada, data_entrada, valor_entrega, status_entrega, data_entrega, valor_manutencao, status_manutencao')

            if (projErr) throw projErr

            let faturado = 0
            let recorrente = 0

            if (projetos) {
                projetos.forEach((p: any) => {
                    // Soma Faturado (apenas o que foi pago NO MÊS selecionado)
                    if (p.status_entrada === 'Pago' && p.data_entrada && p.data_entrada >= startDate && p.data_entrada < endDate) {
                        faturado += Number(p.valor_entrada || 0)
                    }
                    if (p.status_entrega === 'Pago' && p.data_entrega && p.data_entrega >= startDate && p.data_entrega < endDate) {
                        faturado += Number(p.valor_entrega || 0)
                    }

                    // Soma Recorrente Máxima (projetos com manutenção ativa)
                    if (p.status_manutencao === 'Ativo') {
                        recorrente += Number(p.valor_manutencao || 0)
                    }
                })
            }

            setFaturamentoTotal(faturado)
            setReceitaRecorrente(recorrente)

        } catch (error: any) {
            console.error('Erro ao buscar dados financeiros:', error)
            showToast(t('common.error'))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadDados()
    }, [filterMes, filterAno])

    const handleOpenModal = (gasto?: Gasto) => {
        if (gasto) {
            setEditingGasto(gasto)
            setFormData({
                descricao: gasto.descricao,
                valor: gasto.valor.toString(),
                tipo: gasto.tipo,
                cobranca: gasto.cobranca || 'Cartão',
                categoria: gasto.categoria,
                data_gasto: gasto.data_gasto,
                data_fim: gasto.data_fim || '',
                status: gasto.status
            })
        } else {
            setEditingGasto(null)
            setFormData({
                descricao: '',
                valor: '',
                tipo: 'Único',
                cobranca: 'Cartão',
                categoria: 'admin.finance.catTools',
                data_gasto: new Date().toISOString().split('T')[0],
                data_fim: '',
                status: 'Ativo'
            })
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const payload = {
                descricao: formData.descricao,
                valor: Number(formData.valor),
                tipo: formData.tipo,
                cobranca: formData.cobranca,
                categoria: formData.categoria,
                data_gasto: formData.data_gasto,
                data_fim: formData.tipo === 'Recorrente' && formData.data_fim ? formData.data_fim : null,
                status: formData.status
            }

            if (editingGasto) {
                const { error } = await supabase
                    .from('gastos')
                    .update(payload)
                    .eq('id', editingGasto.id)
                if (error) throw error
                showToast(t('admin.finance.expenseUpdated'))
            } else {
                const { error } = await supabase
                    .from('gastos')
                    .insert([payload])
                if (error) throw error
                showToast(t('admin.finance.expenseCreated'))
            }

            setIsModalOpen(false)
            loadDados()
        } catch (error: any) {
            console.error('Erro ao salvar:', error)
            showToast(error.message || t('common.error'))
        }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('admin.finance.confirmDelete'))) return
        try {
            const { error } = await supabase.from('gastos').delete().eq('id', id)
            if (error) throw error
            showToast(t('admin.finance.expenseDeleted'))
            loadDados()
        } catch (err: any) {
            console.error('Delete error', err)
            showToast(t('common.error'))
        }
    }

    const lucroLiquido = (faturamentoTotal + receitaRecorrente) - totalGastosMes

    return (
        <div className="page-container fade-in">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <NexiumIcon size={24} />
                        {t('admin.finance.title')}
                    </h2>
                    <p style={{ marginTop: '4px' }}>{t('admin.finance.subtitle')}</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    + {t('admin.finance.newExpense')}
                </button>
            </header>

            {/* Filtros */}
            <div className="filters-bar" style={{ marginBottom: 24 }}>
                <select className="filter-select" value={filterMes} onChange={(e) => setFilterMes(Number(e.target.value))}>
                    {(locale === 'en' ? monthNamesEn : monthNamesPt).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select className="filter-select" value={filterAno} onChange={(e) => setFilterAno(Number(e.target.value))}>
                    {[filterAno - 1, filterAno, filterAno + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            {/* Cards Financeiros */}
            <div className="metrics-grid stagger-children" style={{ marginBottom: 32 }}>
                <div className="metric-card" style={{ borderTop: '4px solid var(--color-success)' }}>
                    <div className="label">{t('admin.finance.totalBilled')}</div>
                    <div className="value" style={{ fontSize: '1.4rem' }}>{formatCurrency(faturamentoTotal, locale)}</div>
                </div>
                <div className="metric-card" style={{ borderTop: '4px solid var(--color-success)' }}>
                    <div className="label">{t('admin.finance.recurringRev')}</div>
                    <div className="value" style={{ fontSize: '1.4rem' }}>{formatCurrency(receitaRecorrente, locale)}</div>
                </div>
                <div className="metric-card" style={{ borderTop: '4px solid var(--color-danger)' }}>
                    <div className="label">{t('admin.finance.totalExpenses')}</div>
                    <div className="value" style={{ fontSize: '1.4rem' }}>{formatCurrency(totalGastosMes, locale)}</div>
                </div>
                <div className="metric-card" style={{ borderTop: lucroLiquido >= 0 ? '4px solid var(--color-primary)' : '4px solid var(--color-danger)', backgroundColor: 'var(--color-bg-secondary)' }}>
                    <div className="label" style={{ fontWeight: 600 }}>{t('admin.finance.netProfit')}</div>
                    <div className="value" style={{ fontSize: '1.6rem', color: lucroLiquido >= 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                        {formatCurrency(lucroLiquido, locale)}
                    </div>
                </div>
            </div>

            {/* Lista de Gastos */}
            <div className="section-card animate-fade-in-up">
                <div className="section-card-header">
                    <h3>{t('admin.finance.expensesList')}</h3>
                    <span className="badge badge-light">{gastos.length}</span>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                        <div className="login-spinner" />
                    </div>
                ) : gastos.length === 0 ? (
                    <div className="section-card-body">
                        <div className="empty-state">
                            <p>{t('admin.finance.noExpenses')}</p>
                            <button className="btn btn-secondary" onClick={() => handleOpenModal()} style={{ marginTop: 16 }}>
                                {t('admin.finance.newExpense')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="section-card-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>{t('admin.finance.desc')}</th>
                                    <th>{t('admin.finance.category')}</th>
                                    <th>{t('admin.finance.billing')}</th>
                                    <th>{t('admin.finance.date')}</th>
                                    <th>{t('admin.finance.type')}</th>
                                    <th>{t('admin.finance.status')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('admin.finance.value')}</th>
                                    <th style={{ width: '80px', textAlign: 'center' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {gastos.map(g => (
                                    <tr key={g.id}>
                                        <td style={{ fontWeight: 500 }}>{g.descricao}</td>
                                        <td>
                                            <span style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: 'var(--color-border)', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                                {t(g.categoria)}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                                {g.cobranca === 'Cartão' ? t('admin.finance.billingCard') : g.cobranca === 'Boleto' ? t('admin.finance.billingBoleto') : t('admin.finance.billingPix')}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span>{new Date(g.data_gasto + 'T00:00:00').toLocaleDateString(locale === 'en' ? 'en-US' : 'pt-BR')}</span>
                                                {g.data_fim && (
                                                    <span style={{ fontSize: '11px', color: 'var(--color-text-mutted)' }}>
                                                        Até {new Date(g.data_fim + 'T00:00:00').toLocaleDateString(locale === 'en' ? 'en-US' : 'pt-BR')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${g.tipo === 'Recorrente' ? 'badge-priority-alta' : 'badge-priority-baixa'}`}>
                                                {g.tipo === 'Único' ? t('admin.finance.typeUnique') : t('admin.finance.typeRecurring')}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${g.status === 'Ativo' ? 'badge-priority-baixa' : 'badge-priority-media'}`}>
                                                {g.status === 'Ativo' ? t('common.active') : t('common.inactive')}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-danger)' }}>
                                            - {formatCurrency(g.valor, locale)}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                <button className="icon-btn" onClick={() => handleOpenModal(g)} title={t('common.edit')}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button className="icon-btn" onClick={() => handleDelete(g.id)} title={t('common.delete')} style={{ color: 'var(--color-danger)' }}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content fade-in" style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h2>{editingGasto ? t('common.edit') : t('admin.finance.newExpense')}</h2>
                            <button className="icon-btn" onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-group">
                                <label>{t('admin.finance.desc')}</label>
                                <input
                                    type="text"
                                    required
                                    className="input"
                                    value={formData.descricao}
                                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>{t('admin.finance.value')}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        className="input"
                                        value={formData.valor}
                                        onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('admin.finance.date')}</label>
                                    <input
                                        type="date"
                                        required
                                        className="input"
                                        value={formData.data_gasto}
                                        onChange={(e) => setFormData({ ...formData, data_gasto: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>{t('admin.finance.category')}</label>
                                    <select
                                        className="input"
                                        value={formData.categoria}
                                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                    >
                                        {['admin.finance.catTools', 'admin.finance.catCourses', 'admin.finance.catTaxes', 'admin.finance.catOthers'].map(cat => (
                                            <option key={cat} value={cat}>{t(cat)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t('admin.finance.billing')}</label>
                                    <select
                                        className="input"
                                        value={formData.cobranca}
                                        onChange={(e) => setFormData({ ...formData, cobranca: e.target.value })}
                                    >
                                        <option value="Cartão">{t('admin.finance.billingCard')}</option>
                                        <option value="Boleto">{t('admin.finance.billingBoleto')}</option>
                                        <option value="Pix">{t('admin.finance.billingPix')}</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>{t('admin.finance.type')}</label>
                                    <select
                                        className="input"
                                        value={formData.tipo}
                                        onChange={(e) => {
                                            const novoTipo = e.target.value as any
                                            setFormData({
                                                ...formData,
                                                tipo: novoTipo,
                                                data_fim: novoTipo === 'Único' ? '' : formData.data_fim
                                            })
                                        }}
                                    >
                                        <option value="Único">{t('admin.finance.typeUnique')}</option>
                                        <option value="Recorrente">{t('admin.finance.typeRecurring')}</option>
                                    </select>
                                </div>
                                {formData.tipo === 'Recorrente' && (
                                    <div className="form-group">
                                        <label>{t('admin.finance.endDate')}</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={formData.data_fim}
                                            onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>

                            {formData.tipo === 'Recorrente' && (
                                <div className="form-group">
                                    <label>{t('admin.finance.status')}</label>
                                    <select
                                        className="input"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <option value="Ativo">{t('common.active')}</option>
                                        <option value="Inativo">{t('common.inactive')}</option>
                                    </select>
                                </div>
                            )}

                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
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

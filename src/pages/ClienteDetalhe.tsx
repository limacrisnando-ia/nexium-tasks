import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Cliente, Projeto, Tarefa, ProjetoAnotacao, ProjetoAcesso } from '../lib/types'
import Modal from '../components/Modal'
import { showToast } from '../components/Toast'
import { StatusProgressBar } from '../components/StatusProgressBar'
import { useLanguage } from '../contexts/LanguageContext'

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
const emptyAnotacao = { titulo: '', conteudo: '' }
const emptyAcesso = { nome: '', url: '', usuario: '', senha: '' }

export default function ClienteDetalhe() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { t, locale } = useLanguage()

    function formatCurrency(value: number) {
        return locale === 'en'
            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
            : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    function formatDate(d: string | null) {
        if (!d) return '—'
        return new Date(d + 'T00:00:00').toLocaleDateString(locale === 'en' ? 'en-US' : 'pt-BR')
    }
    const [cliente, setCliente] = useState<Cliente | null>(null)
    const [projetos, setProjetos] = useState<Projeto[]>([])
    const [tarefas, setTarefas] = useState<Tarefa[]>([])
    const [loading, setLoading] = useState(true)
    const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({})

    // Projeto modal
    const [projetoModal, setProjetoModal] = useState(false)
    const [editingProjeto, setEditingProjeto] = useState<string | null>(null)
    const [projetoForm, setProjetoForm] = useState(emptyProjeto)
    const [savingP, setSavingP] = useState(false)

    // Anotações & Acessos
    const [expandedProjeto, setExpandedProjeto] = useState<string | null>(null)
    const [showAnotacoesList, setShowAnotacoesList] = useState(false)
    const [showAcessosList, setShowAcessosList] = useState(false)
    const [anotacoes, setAnotacoes] = useState<Record<string, ProjetoAnotacao[]>>({})
    const [acessos, setAcessos] = useState<Record<string, ProjetoAcesso[]>>({})
    const [anotacaoForm, setAnotacaoForm] = useState(emptyAnotacao)
    const [addingAnotacao, setAddingAnotacao] = useState(false)
    const [editingAnotacao, setEditingAnotacao] = useState<string | null>(null)
    const [editAnotacaoForm, setEditAnotacaoForm] = useState(emptyAnotacao)
    const [savingA, setSavingA] = useState(false)

    // Acessos Form
    const [acessoModal, setAcessoModal] = useState(false)
    const [editingAcesso, setEditingAcesso] = useState<string | null>(null)
    const [acessoForm, setAcessoForm] = useState(emptyAcesso)
    const [savingAc, setSavingAc] = useState(false)
    const [targetProjetoIdParaAcesso, setTargetProjetoIdParaAcesso] = useState<string | null>(null)

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

    function togglePasswordVisibility(acessoId: string) {
        setShowPasswordMap(prev => ({ ...prev, [acessoId]: !prev[acessoId] }))
    }

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
            valor_total: p.valor_total ? p.valor_total.toString() : '',
            modelo_pagamento: p.modelo_pagamento,
            status_entrada: p.status_entrada,
            data_entrada: p.data_entrada || '',
            status_entrega: p.status_entrega,
            data_entrega: p.data_entrega || '',
            valor_manutencao: p.valor_manutencao ? p.valor_manutencao.toString() : '',
            status_manutencao: p.status_manutencao || 'Inativo',
            data_inicio: p.data_inicio || '',
            data_conclusao: p.data_conclusao || ''
        })
        setProjetoModal(true)
    }

    async function saveProjeto() {
        if (!projetoForm.nome_projeto.trim() || !id) return
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
            valor_manutencao: projetoForm.valor_manutencao ? parseFloat(projetoForm.valor_manutencao) : null,
            status_manutencao: projetoForm.valor_manutencao ? projetoForm.status_manutencao : 'Inativo',
            data_inicio: projetoForm.data_inicio || null,
            data_conclusao: projetoForm.data_conclusao || null,
            updated_at: new Date().toISOString(),
        }
        if (editingProjeto) {
            const { error } = await supabase.from('projetos').update(payload).eq('id', editingProjeto)
            if (error) { showToast(t('common.error') + ': ' + error.message); setSavingP(false); return }
            showToast(t('clientDetail.projectUpdated'))
        } else {
            const { error } = await supabase.from('projetos').insert(payload)
            if (error) { showToast(t('common.error') + ': ' + error.message); setSavingP(false); return }
            showToast(t('clientDetail.projectCreated'))
        }
        setSavingP(false)
        setProjetoModal(false)
        loadAll()
    }

    async function deleteProjeto(pid: string) {
        if (!confirm(t('clientDetail.confirmDeleteProject'))) return
        const { error } = await supabase.from('projetos').delete().eq('id', pid)
        if (error) { showToast(t('common.error') + ': ' + error.message); return }
        showToast(t('clientDetail.projectDeleted'))
        loadAll()
    }

    // Anotações & Acessos CRUD
    async function toggleAnotacoes(projetoId: string) {
        if (expandedProjeto === projetoId) {
            setExpandedProjeto(null)
            setAddingAnotacao(false)
            setEditingAnotacao(null)
            return
        }
        setExpandedProjeto(projetoId)
        setAddingAnotacao(false)
        setEditingAnotacao(null)
        setShowAnotacoesList(false)
        setShowAcessosList(false)

        // Fetch both anotacoes and acessos
        if (!anotacoes[projetoId] || !acessos[projetoId]) {
            const [notasRes, acessosRes] = await Promise.all([
                supabase.from('projeto_anotacoes').select('*').eq('projeto_id', projetoId).order('created_at', { ascending: false }),
                supabase.from('projeto_acessos').select('*').eq('projeto_id', projetoId).order('created_at', { ascending: false })
            ])
            setAnotacoes(prev => ({ ...prev, [projetoId]: notasRes.data || [] }))
            setAcessos(prev => ({ ...prev, [projetoId]: acessosRes.data || [] }))
        }
    }

    async function saveAnotacao(projetoId: string) {
        if (!anotacaoForm.titulo.trim()) { showToast(t('clientDetail.titleRequired')); return }
        setSavingA(true)
        const { data, error } = await supabase
            .from('projeto_anotacoes')
            .insert({ projeto_id: projetoId, titulo: anotacaoForm.titulo, conteudo: anotacaoForm.conteudo || null })
            .select()
            .single()
        if (error) { showToast(t('common.error') + ': ' + error.message); setSavingA(false); return }
        setAnotacoes(prev => ({ ...prev, [projetoId]: [data, ...(prev[projetoId] || [])] }))
        setAnotacaoForm(emptyAnotacao)
        setAddingAnotacao(false)
        setSavingA(false)
        showToast(t('clientDetail.noteCreated'))
    }

    async function updateAnotacao(anotacaoId: string, projetoId: string) {
        if (!editAnotacaoForm.titulo.trim()) { showToast(t('clientDetail.titleRequired')); return }
        setSavingA(true)
        const { error } = await supabase
            .from('projeto_anotacoes')
            .update({ titulo: editAnotacaoForm.titulo, conteudo: editAnotacaoForm.conteudo || null, updated_at: new Date().toISOString() })
            .eq('id', anotacaoId)
        if (error) { showToast(t('common.error') + ': ' + error.message); setSavingA(false); return }
        setAnotacoes(prev => ({
            ...prev,
            [projetoId]: (prev[projetoId] || []).map(a => a.id === anotacaoId ? { ...a, titulo: editAnotacaoForm.titulo, conteudo: editAnotacaoForm.conteudo || null } : a)
        }))
        setEditingAnotacao(null)
        setSavingA(false)
        showToast(t('clientDetail.noteUpdated'))
    }

    async function deleteAnotacao(anotacaoId: string, projetoId: string) {
        if (!confirm(t('clientDetail.confirmDeleteNote'))) return
        const { error } = await supabase.from('projeto_anotacoes').delete().eq('id', anotacaoId)
        if (error) { showToast(t('common.error') + ': ' + error.message); return }
        setAnotacoes(prev => ({
            ...prev,
            [projetoId]: (prev[projetoId] || []).filter(a => a.id !== anotacaoId)
        }))
        showToast(t('clientDetail.noteDeleted'))
    }

    function openCreateAcesso(projetoId: string) {
        setTargetProjetoIdParaAcesso(projetoId)
        setEditingAcesso(null)
        setAcessoForm(emptyAcesso)
        setAcessoModal(true)
    }

    function openEditAcesso(a: ProjetoAcesso, projetoId: string) {
        setTargetProjetoIdParaAcesso(projetoId)
        setEditingAcesso(a.id)
        setAcessoForm({
            nome: a.nome,
            url: a.url || '',
            usuario: a.usuario || '',
            senha: a.senha || ''
        })
        setAcessoModal(true)
    }

    async function saveAcesso() {
        if (!targetProjetoIdParaAcesso) return
        if (!acessoForm.nome.trim()) { showToast(t('clientDetail.nameRequired')); return }
        setSavingAc(true)

        const payload = {
            projeto_id: targetProjetoIdParaAcesso,
            nome: acessoForm.nome,
            url: acessoForm.url || null,
            usuario: acessoForm.usuario || null,
            senha: acessoForm.senha || null,
            updated_at: new Date().toISOString()
        }

        if (editingAcesso) {
            const { error } = await supabase.from('projeto_acessos').update(payload).eq('id', editingAcesso)
            if (error) { showToast(t('common.error') + ': ' + error.message); setSavingAc(false); return }
            setAcessos(prev => ({
                ...prev,
                [targetProjetoIdParaAcesso]: (prev[targetProjetoIdParaAcesso] || []).map(a => a.id === editingAcesso ? { ...a, ...payload } as ProjetoAcesso : a)
            }))
            showToast(t('clientDetail.accessUpdated'))
        } else {
            // Need to insert so not including updated_at explicitly is better, but since it's there it's fine.
            const { data, error } = await supabase.from('projeto_acessos').insert(payload).select().single()
            if (error) { showToast(t('common.error') + ': ' + error.message); setSavingAc(false); return }
            setAcessos(prev => ({ ...prev, [targetProjetoIdParaAcesso]: [data, ...(prev[targetProjetoIdParaAcesso] || [])] }))
            showToast(t('clientDetail.accessCreated'))
        }

        setSavingAc(false)
        setAcessoModal(false)
    }

    async function deleteAcesso(acessoId: string, projetoId: string) {
        if (!confirm(t('clientDetail.confirmDeleteAccess'))) return
        const { error } = await supabase.from('projeto_acessos').delete().eq('id', acessoId)
        if (error) { showToast(t('common.error') + ': ' + error.message); return }
        setAcessos(prev => ({
            ...prev,
            [projetoId]: (prev[projetoId] || []).filter(a => a.id !== acessoId)
        }))
        showToast(t('clientDetail.accessDeleted'))
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
            if (error) { showToast(t('common.error') + ': ' + error.message); setSavingT(false); return }
            showToast(t('clientDetail.taskUpdated'))
        } else {
            const { error } = await supabase.from('tarefas').insert(payload)
            if (error) { showToast(t('common.error') + ': ' + error.message); setSavingT(false); return }
            showToast(t('clientDetail.taskCreated'))
        }
        setSavingT(false)
        setTarefaModal(false)
        loadAll()
    }

    async function deleteTarefa(tid: string) {
        if (!confirm(t('clientDetail.confirmDeleteTask'))) return
        const { error } = await supabase.from('tarefas').delete().eq('id', tid)
        if (error) { showToast(t('common.error') + ': ' + error.message); return }
        showToast(t('clientDetail.taskDeleted'))
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
                    <p>{t('clientDetail.notFound')}</p>
                    <button className="btn btn-secondary" onClick={() => navigate('/clientes')}>{t('clientDetail.back')}</button>
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
                    <p>{cliente.empresa || t('common.noCompany')}</p>
                </div>
            </div>

            {/* Client Info Card */}
            <div className="section-card animate-fade-in" style={{ marginBottom: 24 }}>
                <div className="client-info-grid">
                    <div className="client-info-item">
                        <div className="info-label">{t('common.status')}</div>
                        <div className="info-value">
                            <span className={`badge badge-status-${cliente.status.toLowerCase()}`}>
                                {cliente.status}
                            </span>
                        </div>
                    </div>
                    <div className="client-info-item">
                        <div className="info-label">{t('clients.contact')}</div>
                        <div className="info-value">{cliente.contato || '—'}</div>
                    </div>
                    <div className="client-info-item">
                        <div className="info-label">{t('clientDetail.totalBilled')}</div>
                        <div className="info-value">{formatCurrency(totalFaturado)}</div>
                    </div>
                    <div className="client-info-item">
                        <div className="info-label">{t('clientDetail.pending')}</div>
                        <div className="info-value">{totalPendente > 0 ? formatCurrency(totalPendente) : '—'}</div>
                    </div>
                    <div className="client-info-item">
                        <div className="info-label">{t('clientDetail.since')}</div>
                        <div className="info-value">
                            {cliente.data_cadastro
                                ? new Date(cliente.data_cadastro).toLocaleDateString(locale === 'en' ? 'en-US' : 'pt-BR')
                                : '—'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Projetos */}
            <div className="section-card animate-fade-in-up" style={{ animationDelay: '0.1s', marginBottom: 24 }}>
                <div className="section-card-header">
                    <h3>{t('clientDetail.projects')}</h3>
                    <button className="btn btn-primary btn-sm" onClick={openCreateProjeto}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {t('clientDetail.new')}
                    </button>
                </div>
                <div className="section-card-body">
                    {projetos.length === 0 ? (
                        <div className="empty-state">
                            <p>{t('clientDetail.noProjects')}</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead><tr><th>{t('clientDetail.project')}</th><th>{t('clientDetail.type')}</th><th>{t('clientDetail.totalValue')}</th><th>{t('clientDetail.downPayment')}</th><th>{t('clientDetail.delivery')}</th>{projetos.some(p => p.tipo === 'Automação') && <th>{t('clientDetail.maintenance')}</th>}<th></th></tr></thead>
                            <tbody>
                                {projetos.map((p) => {
                                    const temPendente = p.status_entrada === 'Pendente' || p.status_entrega === 'Pendente'
                                    const isExpanded = expandedProjeto === p.id
                                    const colCount = 5 + (projetos.some(pp => pp.tipo === 'Automação') ? 1 : 0) + 1
                                    return (
                                        <React.Fragment key={p.id}>
                                            <tr className={temPendente ? 'pagamento-pendente' : ''} style={{ cursor: 'pointer' }} onClick={() => toggleAnotacoes(p.id)}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                        </svg>
                                                        <div>
                                                            <strong>{p.nome_projeto}</strong>
                                                            {p.descricao && <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>{p.descricao}</div>}
                                                        </div>
                                                    </div>
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
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>{formatCurrency(p.valor_manutencao)}{t('clientDetail.monthlySuffix')}</div>
                                                            </>
                                                        ) : '—'}
                                                    </td>
                                                )}
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEditProjeto(p) }}>{t('clientDetail.edit')}</button>
                                                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); deleteProjeto(p.id) }}>{t('clientDetail.delete')}</button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="anotacoes-row">
                                                    <td colSpan={colCount} style={{ padding: 0 }}>
                                                        <div className="anotacoes-panel">
                                                            <div className="anotacoes-header" onClick={() => setShowAnotacoesList(!showAnotacoesList)} style={{ cursor: 'pointer' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ transition: 'transform 0.2s', transform: showAnotacoesList ? 'rotate(90deg)' : 'rotate(0deg)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                                                    <span className="anotacoes-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                        {t('clientDetail.notes')}
                                                                    </span>
                                                                </div>
                                                                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setAddingAnotacao(!addingAnotacao); setAnotacaoForm(emptyAnotacao); setShowAnotacoesList(true); }}>
                                                                    {addingAnotacao ? t('clientDetail.cancel') : t('clientDetail.newNote')}
                                                                </button>
                                                            </div>

                                                            {showAnotacoesList && (
                                                                <div style={{ paddingTop: 16 }}>
                                                                    {addingAnotacao && (
                                                                        <div className="anotacao-form">
                                                                            <input
                                                                                className="form-input"
                                                                                value={anotacaoForm.titulo}
                                                                                onChange={(e) => setAnotacaoForm({ ...anotacaoForm, titulo: e.target.value })}
                                                                                placeholder={t('clientDetail.notePlaceholderTitle')}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            />
                                                                            <textarea
                                                                                className="form-textarea"
                                                                                value={anotacaoForm.conteudo}
                                                                                onChange={(e) => setAnotacaoForm({ ...anotacaoForm, conteudo: e.target.value })}
                                                                                placeholder={t('clientDetail.notePlaceholderContent')}
                                                                                rows={3}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            />
                                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                                                                <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); saveAnotacao(p.id) }} disabled={savingA}>
                                                                                    {savingA ? t('common.saving') : t('common.save')}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {(anotacoes[p.id] || []).length === 0 && !addingAnotacao ? (
                                                                        <div className="anotacoes-empty">{t('clientDetail.noNotes')}</div>
                                                                    ) : (
                                                                        <div className="anotacoes-list">
                                                                            {(anotacoes[p.id] || []).map((a) => (
                                                                                <div key={a.id} className="anotacao-card">
                                                                                    {editingAnotacao === a.id ? (
                                                                                        <div className="anotacao-form">
                                                                                            <input
                                                                                                className="form-input"
                                                                                                value={editAnotacaoForm.titulo}
                                                                                                onChange={(e) => setEditAnotacaoForm({ ...editAnotacaoForm, titulo: e.target.value })}
                                                                                                onClick={(e) => e.stopPropagation()}
                                                                                            />
                                                                                            <textarea
                                                                                                className="form-textarea"
                                                                                                value={editAnotacaoForm.conteudo}
                                                                                                onChange={(e) => setEditAnotacaoForm({ ...editAnotacaoForm, conteudo: e.target.value })}
                                                                                                rows={3}
                                                                                                onClick={(e) => e.stopPropagation()}
                                                                                            />
                                                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                                                                                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setEditingAnotacao(null) }}>{t('clientDetail.cancel')}</button>
                                                                                                <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); updateAnotacao(a.id, p.id) }} disabled={savingA}>
                                                                                                    {savingA ? t('common.saving') : t('common.save')}
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <>
                                                                                            <div className="anotacao-card-header">
                                                                                                <strong>{a.titulo}</strong>
                                                                                                <div className="anotacao-actions">
                                                                                                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setEditingAnotacao(a.id); setEditAnotacaoForm({ titulo: a.titulo, conteudo: a.conteudo || '' }) }}>{t('clientDetail.edit')}</button>
                                                                                                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); deleteAnotacao(a.id, p.id) }}>{t('clientDetail.delete')}</button>
                                                                                                </div>
                                                                                            </div>
                                                                                            {a.conteudo && <div className="anotacao-card-body">{a.conteudo}</div>}
                                                                                            <div className="anotacao-card-date">
                                                                                                {a.created_at ? new Date(a.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="anotacoes-panel" style={{ marginTop: 24, borderTop: 'none', background: '#FAFAFA' }}>
                                                            <div className="anotacoes-header" onClick={() => setShowAcessosList(!showAcessosList)} style={{ cursor: 'pointer' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ transition: 'transform 0.2s', transform: showAcessosList ? 'rotate(90deg)' : 'rotate(0deg)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                                                    <span className="anotacoes-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4v-3.586l8.172-8.172a6 6 0 115.828-8.172z" /></svg>
                                                                        {t('clientDetail.accesses')}
                                                                    </span>
                                                                </div>
                                                                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openCreateAcesso(p.id); setShowAcessosList(true); }}>
                                                                    + {t('clientDetail.newAccess')}
                                                                </button>
                                                            </div>

                                                            {showAcessosList && (
                                                                <div style={{ paddingTop: 16 }}>
                                                                    {(acessos[p.id] || []).length === 0 ? (
                                                                        <div className="anotacoes-empty">{t('clientDetail.noAccesses')}</div>
                                                                    ) : (
                                                                        <div className="anotacoes-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                                                                            {(acessos[p.id] || []).map((a) => (
                                                                                <div key={a.id} className="anotacao-card" style={{ padding: 16 }}>
                                                                                    <div className="anotacao-card-header" style={{ marginBottom: 12 }}>
                                                                                        <strong>{a.nome}</strong>
                                                                                        <div className="anotacao-actions">
                                                                                            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEditAcesso(a, p.id) }}>{t('clientDetail.edit')}</button>
                                                                                            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); deleteAcesso(a.id, p.id) }}>{t('clientDetail.delete')}</button>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                                        {a.url && (
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                                <span style={{ color: 'var(--gray-500)', width: 60 }}>URL:</span>
                                                                                                <a href={a.url.startsWith('http') ? a.url : `https://${a.url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>{a.url}</a>
                                                                                            </div>
                                                                                        )}
                                                                                        {a.usuario && (
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                                <span style={{ color: 'var(--gray-500)', width: 60 }}>User:</span>
                                                                                                <strong>{a.usuario}</strong>
                                                                                            </div>
                                                                                        )}
                                                                                        {a.senha && (
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                                <span style={{ color: 'var(--gray-500)', width: 60 }}>Senha:</span>
                                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                                    <span style={{ fontFamily: 'monospace', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4, letterSpacing: showPasswordMap[a.id] ? 'normal' : 2 }}>
                                                                                                        {showPasswordMap[a.id] ? a.senha : '••••••••'}
                                                                                                    </span>
                                                                                                    <button
                                                                                                        onClick={(e) => { e.stopPropagation(); togglePasswordVisibility(a.id) }}
                                                                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', padding: 0, display: 'flex' }}
                                                                                                    >
                                                                                                        {showPasswordMap[a.id] ? (
                                                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                                                                        ) : (
                                                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                                                                        )}
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div >

            {/* Tarefas */}
            < div className="section-card animate-fade-in-up" style={{ animationDelay: '0.2s' }
            }>
                <div className="section-card-header">
                    <h3>{t('clientDetail.tasks')}</h3>
                    <button className="btn btn-primary btn-sm" onClick={openCreateTarefa}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {t('clientDetail.newTask')}
                    </button>
                </div>
                <div className="section-card-body">
                    {tarefas.length > 0 && (
                        <div style={{ padding: '16px 16px 0' }}>
                            <StatusProgressBar
                                aFazer={tarefas.filter(tarefa => tarefa.status === 'A Fazer').length}
                                emAndamento={tarefas.filter(tarefa => tarefa.status === 'Em Andamento').length}
                                concluidas={tarefas.filter(tarefa => tarefa.status === 'Concluída').length}
                            />
                        </div>
                    )}
                    {tarefas.length === 0 ? (
                        <div className="empty-state">
                            <p>{t('clientDetail.noTasks')}</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead><tr><th>{t('clientDetail.task')}</th><th>{t('clientDetail.deadline')}</th><th>{t('common.status')}</th><th>{t('clientDetail.priority')}</th><th></th></tr></thead>
                            <tbody>
                                {tarefas.map((tarefa) => {
                                    const atrasada = tarefa.prazo && tarefa.status !== 'Concluída' && new Date(tarefa.prazo + 'T00:00:00') < new Date(new Date().toDateString())
                                    return (
                                        <tr key={tarefa.id} className={`${tarefa.prioridade === 'Alta' ? 'priority-alta' : ''} ${atrasada ? 'tarefa-atrasada' : ''}`}>
                                            <td><strong>{tarefa.titulo}</strong></td>
                                            <td>{formatDate(tarefa.prazo)}</td>
                                            <td>
                                                <span className={`badge ${tarefa.status === 'Concluída' ? 'badge-black' : tarefa.status === 'Em Andamento' ? 'badge-dark' : 'badge-light'}`}>
                                                    {tarefa.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge badge-priority-${tarefa.prioridade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>
                                                    {tarefa.prioridade}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => openEditTarefa(tarefa)}>{t('clientDetail.edit')}</button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => deleteTarefa(tarefa.id)}>{t('clientDetail.delete')}</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div >

            {/* Projeto Modal */}
            < Modal
                isOpen={projetoModal}
                onClose={() => setProjetoModal(false)}
                title={editingProjeto ? t('clientDetail.editProject') : t('clientDetail.newProject')}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setProjetoModal(false)}>{t('common.cancel')}</button>
                        <button className="btn btn-primary" onClick={saveProjeto} disabled={savingP}>
                            {savingP ? t('common.saving') : t('common.save')}
                        </button>
                    </>
                }
            >
                <div className="form-group">
                    <label>{t('clientDetail.projectName')} *</label>
                    <input className="form-input" value={projetoForm.nome_projeto} onChange={(e) => setProjetoForm({ ...projetoForm, nome_projeto: e.target.value })} placeholder={t('clientDetail.projectPlaceholder')} />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>{t('clientDetail.serviceType')}</label>
                        <select className="form-select" value={projetoForm.tipo} onChange={(e) => setProjetoForm({ ...projetoForm, tipo: e.target.value as Projeto['tipo'] })}>
                            {tipoOpts.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>{t('clientDetail.totalValueLabel')}</label>
                        <input className="form-input" type="number" step="0.01" value={projetoForm.valor_total} onChange={(e) => setProjetoForm({ ...projetoForm, valor_total: e.target.value })} placeholder="0,00" />
                    </div>
                    <div className="form-group">
                        <label>{t('clientDetail.paymentModel')}</label>
                        <select className="form-select" value={projetoForm.modelo_pagamento} onChange={(e) => setProjetoForm({ ...projetoForm, modelo_pagamento: e.target.value as Projeto['modelo_pagamento'] })}>
                            {modeloPgtoOpts.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>{t('clientDetail.description')}</label>
                    <textarea className="form-textarea" value={projetoForm.descricao} onChange={(e) => setProjetoForm({ ...projetoForm, descricao: e.target.value })} placeholder={t('clientDetail.descriptionPlaceholder')} />
                </div>

                {/* Pagamento do Serviço */}
                <div style={{ borderTop: '1px solid var(--gray-200)', margin: '12px 0', paddingTop: 12 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8, letterSpacing: 1 }}>
                        {projetoForm.modelo_pagamento === '50/50' ? t('clientDetail.downPayment50') : t('clientDetail.fullPayment')}
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>{t('clientDetail.value')}</label>
                            <div className="form-input" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)', cursor: 'default' }}>
                                {projetoForm.valor_total ? formatCurrency(
                                    projetoForm.modelo_pagamento === '50/50'
                                        ? parseFloat(projetoForm.valor_total) / 2
                                        : parseFloat(projetoForm.valor_total)
                                ) : formatCurrency(0)}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>{t('clientDetail.paymentStatus')}</label>
                            <select className="form-select" value={projetoForm.status_entrada} onChange={(e) => setProjetoForm({ ...projetoForm, status_entrada: e.target.value as 'Pendente' | 'Pago' })}>
                                {statusPgtoOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>{t('clientDetail.paymentDate')}</label>
                            <input className="form-input" type="date" value={projetoForm.data_entrada} onChange={(e) => setProjetoForm({ ...projetoForm, data_entrada: e.target.value })} />
                        </div>
                    </div>
                </div>

                {/* Entrega — só se 50/50 */}
                {
                    projetoForm.modelo_pagamento === '50/50' && (
                        <div style={{ borderTop: '1px solid var(--gray-200)', margin: '12px 0', paddingTop: 12 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8, letterSpacing: 1 }}>{t('clientDetail.delivery50')}</div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>{t('clientDetail.value')}</label>
                                    <div className="form-input" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)', cursor: 'default' }}>
                                        {projetoForm.valor_total ? formatCurrency(parseFloat(projetoForm.valor_total) / 2) : formatCurrency(0)}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t('clientDetail.paymentStatus')}</label>
                                    <select className="form-select" value={projetoForm.status_entrega} onChange={(e) => setProjetoForm({ ...projetoForm, status_entrega: e.target.value as 'Pendente' | 'Pago' })}>
                                        {statusPgtoOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t('clientDetail.paymentDate')}</label>
                                    <input className="form-input" type="date" value={projetoForm.data_entrega} onChange={(e) => setProjetoForm({ ...projetoForm, data_entrega: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Manutenção / Suporte — sempre visível, opcional */}
                <div style={{ borderTop: '1px solid var(--gray-200)', margin: '12px 0', paddingTop: 12 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8, letterSpacing: 1 }}>{t('clientDetail.maintenanceSupport')}</div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>{t('clientDetail.monthlyValue')}</label>
                            <input className="form-input" type="number" step="0.01" value={projetoForm.valor_manutencao} onChange={(e) => setProjetoForm({ ...projetoForm, valor_manutencao: e.target.value })} placeholder="0,00" />
                        </div>
                        <div className="form-group">
                            <label>{t('clientDetail.paymentStatus')}</label>
                            <select className="form-select" value={projetoForm.status_manutencao} onChange={(e) => setProjetoForm({ ...projetoForm, status_manutencao: e.target.value as 'Ativo' | 'Inativo' })}>
                                <option value="Ativo">Ativo</option>
                                <option value="Inativo">Inativo</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>{t('clientDetail.startDate')}</label>
                        <input className="form-input" type="date" value={projetoForm.data_inicio} onChange={(e) => setProjetoForm({ ...projetoForm, data_inicio: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>{t('clientDetail.endDate')}</label>
                        <input className="form-input" type="date" value={projetoForm.data_conclusao} onChange={(e) => setProjetoForm({ ...projetoForm, data_conclusao: e.target.value })} />
                    </div>
                </div>
            </Modal >

            {/* Tarefa Modal */}
            < Modal
                isOpen={tarefaModal}
                onClose={() => setTarefaModal(false)}
                title={editingTarefa ? t('clientDetail.editTask') : t('clientDetail.newTaskTitle')}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setTarefaModal(false)}>{t('common.cancel')}</button>
                        <button className="btn btn-primary" onClick={saveTarefa} disabled={savingT}>
                            {savingT ? t('common.saving') : t('common.save')}
                        </button>
                    </>
                }
            >
                <div className="form-group">
                    <label>{t('clientDetail.taskTitle')} *</label>
                    <input className="form-input" value={tarefaForm.titulo} onChange={(e) => setTarefaForm({ ...tarefaForm, titulo: e.target.value })} placeholder={t('clientDetail.taskPlaceholder')} />
                </div>
                <div className="form-group">
                    <label>{t('clientDetail.description')}</label>
                    <textarea className="form-textarea" value={tarefaForm.descricao} onChange={(e) => setTarefaForm({ ...tarefaForm, descricao: e.target.value })} placeholder={t('clientDetail.taskDescPlaceholder')} />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>{t('clientDetail.deadline')}</label>
                        <input className="form-input" type="date" value={tarefaForm.prazo} onChange={(e) => setTarefaForm({ ...tarefaForm, prazo: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>{t('clientDetail.project')}</label>
                        <select className="form-select" value={tarefaForm.projeto_id} onChange={(e) => setTarefaForm({ ...tarefaForm, projeto_id: e.target.value })}>
                            <option value="">{t('clientDetail.none')}</option>
                            {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome_projeto}</option>)}
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>{t('common.status')}</label>
                        <select className="form-select" value={tarefaForm.status} onChange={(e) => setTarefaForm({ ...tarefaForm, status: e.target.value as Tarefa['status'] })}>
                            {statusTarefaOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>{t('clientDetail.priority')}</label>
                        <select className="form-select" value={tarefaForm.prioridade} onChange={(e) => setTarefaForm({ ...tarefaForm, prioridade: e.target.value as Tarefa['prioridade'] })}>
                            {prioridadeOpts.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
            </Modal >

            {/* Acesso Modal */}
            < Modal
                isOpen={acessoModal}
                onClose={() => setAcessoModal(false)}
                title={editingAcesso ? t('clientDetail.edit') + ' ' + t('clientDetail.accesses').toLowerCase() : t('clientDetail.newAccess')}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setAcessoModal(false)}>{t('common.cancel')}</button>
                        <button className="btn btn-primary" onClick={saveAcesso} disabled={savingAc}>
                            {savingAc ? t('common.saving') : t('common.save')}
                        </button>
                    </>
                }
            >
                <div className="form-group">
                    <label>{t('clientDetail.accessName')} *</label>
                    <input className="form-input" value={acessoForm.nome} onChange={(e) => setAcessoForm({ ...acessoForm, nome: e.target.value })} placeholder="Ex: Hospedagem, Painel Admin..." />
                </div>
                <div className="form-group">
                    <label>{t('clientDetail.accessUrl')}</label>
                    <input className="form-input" value={acessoForm.url} onChange={(e) => setAcessoForm({ ...acessoForm, url: e.target.value })} placeholder="https://" />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>{t('clientDetail.accessUser')}</label>
                        <input className="form-input" value={acessoForm.usuario} onChange={(e) => setAcessoForm({ ...acessoForm, usuario: e.target.value })} placeholder="Email ou username" />
                    </div>
                    <div className="form-group">
                        <label>{t('clientDetail.accessPassword')}</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="form-input"
                                type={showPasswordMap['form'] ? 'text' : 'password'}
                                value={acessoForm.senha}
                                onChange={(e) => setAcessoForm({ ...acessoForm, senha: e.target.value })}
                                placeholder="••••••••"
                                style={{ paddingRight: 40 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswordMap(prev => ({ ...prev, form: !prev.form }))}
                                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', display: 'flex' }}
                            >
                                {showPasswordMap['form'] ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal >
        </div >
    )
}

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Tarefa, Cliente } from '../lib/types'

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const statusOpts = ['A Fazer', 'Em Andamento', 'Concluída'] as const
const prioridadeOpts = ['Alta', 'Média', 'Baixa'] as const

interface TarefaComCliente extends Tarefa {
    cliente_nome?: string
}

export default function Calendario() {
    const [tarefas, setTarefas] = useState<TarefaComCliente[]>([])
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [loading, setLoading] = useState(true)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [filterCliente, setFilterCliente] = useState('Todos')
    const [filterStatus, setFilterStatus] = useState('Todos')
    const [filterPrioridade, setFilterPrioridade] = useState('Todos')

    useEffect(() => {
        async function load() {
            setLoading(true)
            const [tRes, cRes] = await Promise.all([
                supabase.from('tarefas').select('*, clientes(nome)').not('prazo', 'is', null).order('prazo'),
                supabase.from('clientes').select('id, nome').order('nome'),
            ])
            if (tRes.data) {
                setTarefas(tRes.data.map((t: any) => ({
                    ...t,
                    cliente_nome: t.clientes?.nome,
                })))
            }
            if (cRes.data) setClientes(cRes.data)
            setLoading(false)
        }
        load()
    }, [])

    const filtered = useMemo(() => {
        return tarefas.filter((t) => {
            if (filterCliente !== 'Todos' && t.cliente_id !== filterCliente) return false
            if (filterStatus !== 'Todos' && t.status !== filterStatus) return false
            if (filterPrioridade !== 'Todos' && t.prioridade !== filterPrioridade) return false
            return true
        })
    }, [tarefas, filterCliente, filterStatus, filterPrioridade])

    // Calendar calculations
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const calendarDays = useMemo(() => {
        const days: { date: Date; isCurrentMonth: boolean }[] = []
        // Previous month padding
        for (let i = startOffset - 1; i >= 0; i--) {
            days.push({ date: new Date(year, month, -i), isCurrentMonth: false })
        }
        // Current month
        for (let d = 1; d <= totalDays; d++) {
            days.push({ date: new Date(year, month, d), isCurrentMonth: true })
        }
        // Next month padding
        const remaining = 7 - (days.length % 7)
        if (remaining < 7) {
            for (let i = 1; i <= remaining; i++) {
                days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
            }
        }
        return days
    }, [year, month, startOffset, totalDays])

    const tasksByDate = useMemo(() => {
        const map = new Map<string, TarefaComCliente[]>()
        filtered.forEach((t) => {
            if (!t.prazo) return
            const key = t.prazo
            if (!map.has(key)) map.set(key, [])
            map.get(key)!.push(t)
        })
        return map
    }, [filtered])

    const todayStr = new Date().toISOString().slice(0, 10)

    function prevMonth() {
        setCurrentDate(new Date(year, month - 1, 1))
    }

    function nextMonth() {
        setCurrentDate(new Date(year, month + 1, 1))
    }

    function goToday() {
        setCurrentDate(new Date())
    }

    function dateToKey(d: Date) {
        return d.toISOString().slice(0, 10)
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header"><h2>Calendário</h2></div>
                <div className="loading-skeleton" style={{ height: 500 }} />
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>Calendário de Prazos</h2>
                <p>Visualize os prazos das tarefas</p>
            </div>

            <div className="filters-bar">
                <select className="filter-select" value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}>
                    <option value="Todos">Todos os clientes</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="Todos">Todos os status</option>
                    {statusOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="filter-select" value={filterPrioridade} onChange={(e) => setFilterPrioridade(e.target.value)}>
                    <option value="Todos">Todas as prioridades</option>
                    {prioridadeOpts.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            {/* Calendar navigation */}
            <div className="calendar-nav animate-fade-in">
                <button className="btn btn-ghost btn-sm" onClick={prevMonth}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h3>{monthNames[month]} {year}</h3>
                <button className="btn btn-ghost btn-sm" onClick={nextMonth}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
                <button className="btn btn-secondary btn-sm" onClick={goToday}>Hoje</button>
            </div>

            {/* Calendar grid */}
            <div className="calendar-grid animate-fade-in-up">
                {dayNames.map((d) => (
                    <div key={d} className="calendar-header-cell">{d}</div>
                ))}
                {calendarDays.map((day, idx) => {
                    const key = dateToKey(day.date)
                    const dayTasks = tasksByDate.get(key) || []
                    const isToday = key === todayStr

                    return (
                        <div
                            key={idx}
                            className={`calendar-cell ${day.isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''}`}
                        >
                            <div className="calendar-day-number">
                                {isToday ? (
                                    <span>{day.date.getDate()}</span>
                                ) : (
                                    day.date.getDate()
                                )}
                            </div>
                            {dayTasks.slice(0, 3).map((t) => (
                                <div
                                    key={t.id}
                                    className={`calendar-event priority-${t.prioridade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}
                                    title={`${t.titulo}${t.cliente_nome ? ' — ' + t.cliente_nome : ''}`}
                                >
                                    {t.titulo}
                                </div>
                            ))}
                            {dayTasks.length > 3 && (
                                <div style={{ fontSize: '0.6rem', color: 'var(--gray-500)', paddingLeft: 6 }}>
                                    +{dayTasks.length - 3} mais
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

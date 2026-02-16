import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { showToast } from '../components/Toast'
import { supabase } from '../lib/supabaseClient'
import type { Tarefa } from '../lib/types'

/* ─── Timer presets (seconds) ─── */
const FOCUS_TIME = 25 * 60
const SHORT_BREAK = 5 * 60
const LONG_BREAK = 15 * 60
const CYCLES_BEFORE_LONG = 4

export type Phase = 'focus' | 'shortBreak' | 'longBreak'
export const phaseLabel: Record<Phase, string> = { focus: 'Foco', shortBreak: 'Pausa Curta', longBreak: 'Pausa Longa' }
export const phaseColor: Record<Phase, string> = { focus: '#111', shortBreak: '#555', longBreak: '#888' }

export type QueueTask = Tarefa & { cliente_nome?: string; nome_projeto?: string }

interface FocoContextType {
    /* timer */
    phase: Phase
    timeLeft: number
    running: boolean
    cycleCount: number
    sessionsToday: number
    /* queue */
    fila: QueueTask[]
    currentIndex: number
    selectedCliente: string
    /* actions */
    setSelectedCliente: (id: string) => void
    startTimer: () => void
    pauseTimer: () => void
    resetTimer: () => void
    skipPhase: () => void
    addToQueue: (t: QueueTask) => void
    removeFromQueue: (id: string) => void
    moveUp: (idx: number) => void
    moveDown: (idx: number) => void
    nextTask: () => void
    prevTask: () => void
    completeCurrent: () => Promise<void>
    setFila: React.Dispatch<React.SetStateAction<QueueTask[]>>
    setCurrentIndex: React.Dispatch<React.SetStateAction<number>>
}

const FocoContext = createContext<FocoContextType | null>(null)

export function useFoco() {
    const ctx = useContext(FocoContext)
    if (!ctx) throw new Error('useFoco must be used within FocoProvider')
    return ctx
}

export function FocoProvider({ children }: { children: ReactNode }) {
    const [phase, setPhase] = useState<Phase>('focus')
    const [timeLeft, setTimeLeft] = useState(FOCUS_TIME)
    const [running, setRunning] = useState(false)
    const [cycleCount, setCycleCount] = useState(0)
    const [sessionsToday, setSessionsToday] = useState(0)

    const [fila, setFila] = useState<QueueTask[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedCliente, setSelectedClienteState] = useState('')

    /* Use timestamp-based approach so the timer is accurate even when tab is in background */
    const endTimeRef = useRef<number | null>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    /* When running starts, compute end time */
    useEffect(() => {
        if (running) {
            endTimeRef.current = Date.now() + timeLeft * 1000
            intervalRef.current = setInterval(() => {
                const remaining = Math.round((endTimeRef.current! - Date.now()) / 1000)
                if (remaining <= 0) {
                    clearInterval(intervalRef.current!)
                    intervalRef.current = null
                    setTimeLeft(0)
                    setRunning(false)
                    playNotification()
                } else {
                    setTimeLeft(remaining)
                }
            }, 250) // Check frequently for accuracy
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            endTimeRef.current = null
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [running])

    /* Handle phase completion */
    useEffect(() => {
        if (timeLeft === 0 && !running) {
            if (phase === 'focus') {
                const newCycleCount = cycleCount + 1
                setCycleCount(newCycleCount)
                setSessionsToday(prev => prev + 1)
                if (newCycleCount % CYCLES_BEFORE_LONG === 0) {
                    setPhase('longBreak')
                    setTimeLeft(LONG_BREAK)
                } else {
                    setPhase('shortBreak')
                    setTimeLeft(SHORT_BREAK)
                }
                showToast('🎉 Ciclo de foco concluído!')
            } else {
                setPhase('focus')
                setTimeLeft(FOCUS_TIME)
                showToast('⏰ Pausa encerrada! Hora de focar.')
            }
        }
    }, [timeLeft, running])

    function playNotification() {
        try {
            const ctx = new AudioContext()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.value = 800
            gain.gain.value = 0.3
            osc.start()
            setTimeout(() => { osc.stop(); ctx.close() }, 300)
        } catch { /* ignore */ }
    }

    function startTimer() { if (fila.length > 0) setRunning(true) }
    function pauseTimer() { setRunning(false) }
    function resetTimer() {
        setRunning(false)
        setPhase('focus')
        setTimeLeft(FOCUS_TIME)
        setCycleCount(0)
    }
    function skipPhase() {
        setRunning(false)
        if (phase === 'focus') {
            const newCycleCount = cycleCount + 1
            setCycleCount(newCycleCount)
            if (newCycleCount % CYCLES_BEFORE_LONG === 0) {
                setPhase('longBreak')
                setTimeLeft(LONG_BREAK)
            } else {
                setPhase('shortBreak')
                setTimeLeft(SHORT_BREAK)
            }
        } else {
            setPhase('focus')
            setTimeLeft(FOCUS_TIME)
        }
    }

    function setSelectedCliente(id: string) {
        setSelectedClienteState(id)
        setFila([])
        setCurrentIndex(0)
        resetTimer()
    }

    function addToQueue(tarefa: QueueTask) {
        if (fila.find(f => f.id === tarefa.id)) return
        setFila(prev => [...prev, tarefa])
    }
    function removeFromQueue(id: string) {
        setFila(prev => {
            const newFila = prev.filter(f => f.id !== id)
            if (currentIndex >= newFila.length && currentIndex > 0) {
                setCurrentIndex(newFila.length - 1)
            }
            return newFila
        })
    }
    function moveUp(idx: number) {
        if (idx === 0) return
        setFila(prev => {
            const next = [...prev];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
            return next
        })
    }
    function moveDown(idx: number) {
        if (idx === fila.length - 1) return
        setFila(prev => {
            const next = [...prev];
            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
            return next
        })
    }
    function nextTask() {
        if (currentIndex < fila.length - 1) setCurrentIndex(prev => prev + 1)
    }
    function prevTask() {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1)
    }

    const completeCurrent = useCallback(async () => {
        if (fila.length === 0) return
        const task = fila[currentIndex]
        const { error } = await supabase.from('tarefas').update({
            status: 'Concluída',
            data_conclusao: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
        }).eq('id', task.id)
        if (error) { showToast('Erro: ' + error.message); return }
        showToast(`✅ "${task.titulo}" concluída!`)
        setFila(prev => {
            const newFila = prev.filter(f => f.id !== task.id)
            if (currentIndex >= newFila.length && currentIndex > 0) {
                setCurrentIndex(newFila.length - 1)
            }
            return newFila
        })
    }, [fila, currentIndex])

    return (
        <FocoContext.Provider value={{
            phase, timeLeft, running, cycleCount, sessionsToday,
            fila, currentIndex, selectedCliente,
            setSelectedCliente, startTimer, pauseTimer, resetTimer, skipPhase,
            addToQueue, removeFromQueue, moveUp, moveDown,
            nextTask, prevTask, completeCurrent,
            setFila, setCurrentIndex,
        }}>
            {children}
        </FocoContext.Provider>
    )
}

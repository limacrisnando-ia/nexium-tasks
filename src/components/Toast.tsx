import { useState, useEffect, useCallback } from 'react'

interface Toast {
    id: number
    message: string
}

let addToastFn: ((msg: string) => void) | null = null

export function showToast(message: string) {
    addToastFn?.(message)
}

export default function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([])

    const addToast = useCallback((message: string) => {
        const id = Date.now()
        setToasts((prev) => [...prev, { id, message }])
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 3000)
    }, [])

    useEffect(() => {
        addToastFn = addToast
        return () => { addToastFn = null }
    }, [addToast])

    return (
        <div className="toast-container">
            {toasts.map((t) => (
                <div key={t.id} className="toast">{t.message}</div>
            ))}
        </div>
    )
}

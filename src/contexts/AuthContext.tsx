import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { User, Session } from '@supabase/supabase-js'

export interface Usuario {
    id: string
    email: string
    nome: string
    role: 'SUPERADMIN' | 'USER'
    ativo: boolean
    created_at: string
}

interface AuthContextType {
    user: User | null
    usuario: Usuario | null
    session: Session | null
    loading: boolean
    isSuperAdmin: boolean
    signInWithGoogle: () => Promise<void>
    signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
    signUpWithEmail: (email: string, password: string, nome: string) => Promise<{ error: string | null }>
    signOut: () => Promise<void>
    refreshUsuario: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [usuario, setUsuario] = useState<Usuario | null>(null)
    const [loading, setLoading] = useState(true)
    const initialized = useRef(false)

    async function fetchUsuario(retries = 2): Promise<Usuario | null> {
        for (let i = 0; i < retries; i++) {
            try {
                const { data, error } = await supabase.rpc('get_my_usuario')
                if (error) break
                if (data && data.length > 0) return data[0]
                // Wait before retry
                if (i < retries - 1) await new Promise(r => setTimeout(r, 800))
            } catch {
                break
            }
        }
        return null
    }

    useEffect(() => {
        // Step 1: Get initial session and usuario
        async function init() {
            try {
                const { data: { session: s } } = await supabase.auth.getSession()
                setSession(s)
                setUser(s?.user ?? null)

                if (s?.user) {
                    const u = await fetchUsuario()
                    if (u) setUsuario(u)
                }
            } catch (err) {
                console.warn('Auth init error:', err)
            } finally {
                initialized.current = true
                setLoading(false)
            }
        }
        init()

        // Step 2: Listen for auth changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, s) => {
                // Skip the initial session event since init() handles it
                if (event === 'INITIAL_SESSION') return

                setSession(s)
                setUser(s?.user ?? null)

                if (s?.user) {
                    const u = await fetchUsuario()
                    if (u) setUsuario(u)
                } else {
                    setUsuario(null)
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    async function signInWithGoogle() {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
        })
    }

    async function signInWithEmail(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error?.message ?? null }
    }

    async function signUpWithEmail(email: string, password: string, nome: string) {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: nome } },
        })
        return { error: error?.message ?? null }
    }

    async function signOut() {
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setUsuario(null)
    }

    async function refreshUsuario() {
        const u = await fetchUsuario(1)
        if (u) setUsuario(u)
    }

    const isSuperAdmin = usuario?.role === 'SUPERADMIN'

    return (
        <AuthContext.Provider value={{
            user, usuario, session, loading, isSuperAdmin,
            signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, refreshUsuario,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

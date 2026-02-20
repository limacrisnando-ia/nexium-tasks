import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
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

    // Fetch usuario record with retry (DB trigger creates it, may take a moment)
    async function fetchUsuario(authUser: User, retries = 3): Promise<void> {
        const email = authUser.email
        if (!email) return

        for (let i = 0; i < retries; i++) {
            const { data } = await supabase
                .from('usuarios')
                .select('*')
                .eq('email', email)
                .maybeSingle()

            if (data) {
                setUsuario(data)
                return
            }

            // Wait before retry (trigger may still be executing)
            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, 800))
            }
        }
    }

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            setSession(s)
            setUser(s?.user ?? null)
            if (s?.user) {
                fetchUsuario(s.user).finally(() => setLoading(false))
            } else {
                setLoading(false)
            }
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, s) => {
                setSession(s)
                setUser(s?.user ?? null)
                if (s?.user) {
                    await fetchUsuario(s.user)
                } else {
                    setUsuario(null)
                }
                setLoading(false)
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
        if (user) await fetchUsuario(user, 1)
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

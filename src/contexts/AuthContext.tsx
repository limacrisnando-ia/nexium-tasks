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

    // Fetch usuario from DB — SECURITY DEFINER function bypasses RLS
    async function fetchUsuario(): Promise<Usuario | null> {
        try {
            const { data, error } = await supabase.rpc('get_my_usuario')
            if (error) {
                console.warn('[Auth] fetchUsuario error:', error.message)
                return null
            }
            if (data && data.length > 0) return data[0]
            // Retry once after 1s (trigger might still be creating the record)
            await new Promise(r => setTimeout(r, 1000))
            const retry = await supabase.rpc('get_my_usuario')
            if (retry.data && retry.data.length > 0) return retry.data[0]
        } catch (err) {
            console.warn('[Auth] fetchUsuario exception:', err)
        }
        return null
    }

    useEffect(() => {
        let mounted = true

        // Single source of truth: onAuthStateChange handles ALL auth events
        // including INITIAL_SESSION (fires on page load with stored session)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, s) => {
                if (!mounted) return

                console.log('[Auth] Event:', event, 'Session:', !!s)

                // Synchronously update session and user state
                setSession(s)
                setUser(s?.user ?? null)

                if (s?.user) {
                    // Fetch usuario asynchronously — DON'T await in the callback
                    // (Supabase warns against async work in onAuthStateChange)
                    fetchUsuario().then(u => {
                        if (mounted) {
                            setUsuario(u)
                            setLoading(false)
                        }
                    })
                } else {
                    setUsuario(null)
                    setLoading(false)
                }
            }
        )

        // Safety: if onAuthStateChange never fires within 5s, stop loading
        const timeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn('[Auth] Timeout — forcing loading=false')
                setLoading(false)
            }
        }, 5000)

        return () => {
            mounted = false
            clearTimeout(timeout)
            subscription.unsubscribe()
        }
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
        const u = await fetchUsuario()
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

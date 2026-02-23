import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getTranslation, type Locale } from '../lib/i18n'
import { useAuth } from './AuthContext'

interface LanguageContextType {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function useLanguage() {
    const ctx = useContext(LanguageContext)
    if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
    return ctx
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const { usuario } = useAuth()

    // Initialize from localStorage, fallback to pt-BR
    const [locale, setLocaleState] = useState<Locale>(() => {
        const stored = localStorage.getItem('nexium-locale')
        if (stored === 'en' || stored === 'pt-BR') return stored
        return 'pt-BR'
    })

    // When usuario loads, sync locale from DB
    useEffect(() => {
        if (usuario && (usuario as any).idioma) {
            const dbLocale = (usuario as any).idioma as Locale
            if (dbLocale === 'en' || dbLocale === 'pt-BR') {
                setLocaleState(dbLocale)
                localStorage.setItem('nexium-locale', dbLocale)
            }
        }
    }, [usuario])

    const setLocale = useCallback(async (newLocale: Locale) => {
        setLocaleState(newLocale)
        localStorage.setItem('nexium-locale', newLocale)

        // Save to DB if logged in
        if (usuario?.id) {
            await supabase
                .from('usuarios')
                .update({ idioma: newLocale, updated_at: new Date().toISOString() })
                .eq('id', usuario.id)
        }
    }, [usuario])

    const t = useCallback((key: string) => getTranslation(locale, key), [locale])

    return (
        <LanguageContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

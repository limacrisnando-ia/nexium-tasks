import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { NexiumIcon } from '../components/NexiumIcon'

export default function Login() {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
    const [mode, setMode] = useState<'login' | 'register'>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [nome, setNome] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        if (mode === 'login') {
            const result = await signInWithEmail(email, password)
            if (result.error) setError(result.error)
        } else {
            if (!nome.trim()) { setError('Informe seu nome'); setLoading(false); return }
            const result = await signUpWithEmail(email, password, nome)
            if (result.error) {
                setError(result.error)
            } else {
                setSuccess('Conta criada! Verifique seu email para confirmar.')
            }
        }
        setLoading(false)
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">
                        <NexiumIcon size={40} />
                    </div>
                    <h1 className="login-title">NEXIUM</h1>
                    <p className="login-subtitle">Tasks</p>
                </div>

                <button className="login-google-btn" onClick={signInWithGoogle} type="button">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Entrar com Google
                </button>

                <div className="login-divider">
                    <span>ou</span>
                </div>

                <form onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <div className="form-group">
                            <label>Nome</label>
                            <input
                                className="form-input"
                                type="text"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                placeholder="Seu nome"
                            />
                        </div>
                    )}
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            className="form-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Senha</label>
                        <input
                            className="form-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    {error && <div className="login-error">{error}</div>}
                    {success && <div className="login-success">{success}</div>}

                    <button className="btn btn-primary login-submit" type="submit" disabled={loading}>
                        {loading ? 'Carregando...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
                    </button>
                </form>

                <div className="login-toggle">
                    {mode === 'login' ? (
                        <span>Não tem conta? <button type="button" onClick={() => { setMode('register'); setError(''); setSuccess('') }}>Criar conta</button></span>
                    ) : (
                        <span>Já tem conta? <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess('') }}>Entrar</button></span>
                    )}
                </div>
            </div>
        </div>
    )
}

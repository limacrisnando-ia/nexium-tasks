import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { showToast } from '../components/Toast'

export default function MeuPerfil() {
    const { usuario, user, refreshUsuario, isSuperAdmin, signOut } = useAuth()
    const [nome, setNome] = useState(usuario?.nome ?? '')
    const [saving, setSaving] = useState(false)
    const [changingPwd, setChangingPwd] = useState(false)
    const [pwdForm, setPwdForm] = useState({ current: '', nova: '', confirma: '' })
    const [savingPwd, setSavingPwd] = useState(false)

    async function handleSaveNome() {
        if (!nome.trim()) { showToast('Nome é obrigatório'); return }
        setSaving(true)
        const { error } = await supabase
            .from('usuarios')
            .update({ nome: nome.trim(), updated_at: new Date().toISOString() })
            .eq('id', usuario?.id)
        if (error) {
            showToast('Erro ao salvar: ' + error.message)
        } else {
            showToast('Nome atualizado com sucesso!')
            await refreshUsuario()
        }
        setSaving(false)
    }

    async function handleChangePassword() {
        if (!pwdForm.nova.trim()) { showToast('Informe a nova senha'); return }
        if (pwdForm.nova.length < 6) { showToast('Senha deve ter no mínimo 6 caracteres'); return }
        if (pwdForm.nova !== pwdForm.confirma) { showToast('As senhas não coincidem'); return }

        setSavingPwd(true)
        const { error } = await supabase.auth.updateUser({ password: pwdForm.nova })
        if (error) {
            showToast('Erro: ' + error.message)
        } else {
            showToast('Senha alterada com sucesso!')
            setChangingPwd(false)
            setPwdForm({ current: '', nova: '', confirma: '' })
        }
        setSavingPwd(false)
    }

    const loginProvider = user?.app_metadata?.provider
    const isGoogleUser = loginProvider === 'google'
    const createdAt = usuario?.created_at
        ? new Date(usuario.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
        : '—'

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>
                    👤 Meu Perfil
                    {isSuperAdmin && <span className="admin-badge">ADMIN</span>}
                </h2>
                <p>Gerencie suas informações pessoais</p>
            </div>

            {/* Informações pessoais */}
            <div className="section-card animate-fade-in">
                <div className="section-card-header">
                    <h3>Informações Pessoais</h3>
                </div>
                <div className="section-card-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="perfil-info-grid">
                        <div className="form-group">
                            <label>Nome</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    className="form-input"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    placeholder="Seu nome"
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSaveNome}
                                    disabled={saving || nome === usuario?.nome}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Email</label>
                            <input className="form-input" value={usuario?.email ?? ''} disabled />
                            <small style={{ color: 'var(--gray-500)', fontSize: '0.7rem' }}>O email não pode ser alterado</small>
                        </div>

                        <div className="form-group">
                            <label>Função</label>
                            <div>
                                <span className={`badge ${isSuperAdmin ? 'badge-priority-alta' : 'badge-light'}`}>
                                    {usuario?.role === 'SUPERADMIN' ? 'Administrador' : 'Usuário'}
                                </span>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Membro desde</label>
                            <p style={{ margin: 0, fontSize: '0.85rem' }}>{createdAt}</p>
                        </div>

                        <div className="form-group">
                            <label>Método de login</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {isGoogleUser ? (
                                    <>
                                        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                        <span style={{ fontSize: '0.85rem' }}>Google</span>
                                    </>
                                ) : (
                                    <span style={{ fontSize: '0.85rem' }}>Email / Senha</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Segurança */}
            {!isGoogleUser && (
                <div className="section-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="section-card-header">
                        <h3>Segurança</h3>
                    </div>
                    <div className="section-card-body" style={{ padding: 24 }}>
                        {!changingPwd ? (
                            <button className="btn btn-secondary" onClick={() => setChangingPwd(true)}>
                                Alterar senha
                            </button>
                        ) : (
                            <div style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="form-group">
                                    <label>Nova senha</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        value={pwdForm.nova}
                                        onChange={(e) => setPwdForm({ ...pwdForm, nova: e.target.value })}
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Confirmar nova senha</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        value={pwdForm.confirma}
                                        onChange={(e) => setPwdForm({ ...pwdForm, confirma: e.target.value })}
                                        placeholder="Repita a nova senha"
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary" onClick={() => { setChangingPwd(false); setPwdForm({ current: '', nova: '', confirma: '' }) }}>
                                        Cancelar
                                    </button>
                                    <button className="btn btn-primary" onClick={handleChangePassword} disabled={savingPwd}>
                                        {savingPwd ? 'Salvando...' : 'Alterar Senha'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sessão */}
            <div className="section-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="section-card-header">
                    <h3>Sessão</h3>
                </div>
                <div className="section-card-body" style={{ padding: 24 }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: 16 }}>
                        Ao sair, você precisará fazer login novamente para acessar o sistema.
                    </p>
                    <button className="btn btn-danger" onClick={signOut}>
                        Sair do sistema
                    </button>
                </div>
            </div>
        </div>
    )
}

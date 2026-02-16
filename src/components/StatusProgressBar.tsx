/* ─── Reusable Progress Bar by status ─── */
export function StatusProgressBar({ aFazer, emAndamento, concluidas }: { aFazer: number; emAndamento: number; concluidas: number }) {
    const total = aFazer + emAndamento + concluidas
    if (total === 0) return null
    const pctFazer = (aFazer / total) * 100
    const pctAndamento = (emAndamento / total) * 100
    const pctDone = (concluidas / total) * 100
    return (
        <div className="progress-bar-container">
            <div className="progress-bar-track">
                <div className="progress-bar-fill progress-bar-done" style={{ width: `${pctDone}%` }} title={`${concluidas} concluída(s)`} />
                <div className="progress-bar-fill progress-bar-andamento" style={{ width: `${pctAndamento}%` }} title={`${emAndamento} em andamento`} />
                <div className="progress-bar-fill progress-bar-afazer" style={{ width: `${pctFazer}%` }} title={`${aFazer} a fazer`} />
            </div>
            <div className="progress-bar-labels">
                <span className="progress-label-done">✅ {concluidas}</span>
                <span className="progress-label-andamento">🔄 {emAndamento}</span>
                <span className="progress-label-afazer">⏳ {aFazer}</span>
                <span className="progress-label-total">{total > 0 ? `${Math.round(pctDone)}%` : '0%'} completo</span>
            </div>
        </div>
    )
}

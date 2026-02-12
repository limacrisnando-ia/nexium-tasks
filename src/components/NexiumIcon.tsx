/** Reusable NEXIUM 3-dot icon for use across the app */
export function NexiumIcon({ size = 20, color = '#000' }: { size?: number; color?: string }) {
    return (
        <svg viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size / 2}>
            <circle cx="7" cy="15" r="7" fill={color} />
            <rect x="14" y="14" width="10" height="2" fill={color} />
            <circle cx="25" cy="15" r="7" fill={color} />
            <rect x="32" y="14" width="10" height="2" fill={color} />
            <circle cx="43" cy="15" r="7" fill={color} />
        </svg>
    )
}

/** Stacked NEXIUM logo for splash/empty states */
export function NexiumLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const scale = size === 'sm' ? 0.7 : size === 'lg' ? 1.4 : 1
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 * scale }}>
            <NexiumIcon size={52 * scale} />
            <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
                <div style={{ fontSize: `${1 * scale}rem`, fontWeight: 700, letterSpacing: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                    NEXIUM
                </div>
                <div style={{ fontSize: `${0.55 * scale}rem`, fontWeight: 300, letterSpacing: 3, color: '#999', fontFamily: "'JetBrains Mono', monospace" }}>
                    Tasks
                </div>
            </div>
        </div>
    )
}

/**
 * Shown at the very root when required VITE_* env vars are missing.
 * Avoids rendering the full app tree (which would crash on Supabase calls)
 * and gives the operator a clear, actionable message.
 *
 * Uses inline styles only so it works even if Tailwind/CSS failed to load.
 */
interface Props {
  missing: string[];
}

export function EnvMissingScreen({ missing }: Props) {
  return (
    <div
      role="alert"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0b10',
        color: '#e6e7ea',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(249,115,22,0.12)',
            color: '#f97316',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          !
        </div>
        <h1 style={{ fontSize: 22, margin: '0 0 8px', fontWeight: 700 }}>
          Configuración incompleta
        </h1>
        <p style={{ fontSize: 14, opacity: 0.75, margin: '0 0 16px', lineHeight: 1.6 }}>
          La aplicación no puede iniciar porque faltan variables de entorno requeridas.
          Agrégalas en la configuración del proyecto y vuelve a publicar.
        </p>
        <ul
          style={{
            listStyle: 'none',
            padding: 12,
            margin: '0 0 20px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 13,
            textAlign: 'left',
          }}
        >
          {missing.map((k) => (
            <li key={k} style={{ padding: '4px 0', color: '#f97316' }}>
              • {k}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #1e90ff, #8a4dff)',
            color: '#fff',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
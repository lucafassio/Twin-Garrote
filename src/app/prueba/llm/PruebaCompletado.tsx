'use client'

import { useState } from 'react'
import type { PedidoOpciones } from '@/eventos'

// Bloque de prueba del completado (#13): se escribe lo que lleva deletreado y se ve la frase y la latencia.
// Usa el turno, el historial y la cercania de la pagina, como lo haria deletrear.

const PREFIJOS_DE_PRUEBA = ['tengo fr', 'quiero ag', 'me duele', 'gracias por', 'no me gusta', 'cuando viene']

type Medicion = { prefijo: string; frase: string; msTotal: number; msServidor: number; proveedor: string }

export default function PruebaCompletado({ pedido }: { pedido: PedidoOpciones }) {
  const [prefijo, setPrefijo] = useState(PREFIJOS_DE_PRUEBA[0])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mediciones, setMediciones] = useState<Medicion[]>([])

  async function completar(p: string) {
    setPrefijo(p)
    setCargando(true)
    setError(null)
    const inicio = performance.now()
    try {
      const r = await fetch('/api/completar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefijo: p, pedido }),
      })
      const datos = await r.json()
      const total = Math.round(performance.now() - inicio)
      if (!r.ok) throw new Error(datos.error ?? `HTTP ${r.status}`)
      setMediciones((m) => [
        { prefijo: p, frase: datos.frase, msTotal: total, msServidor: datos.ms, proveedor: datos.proveedor },
        ...m,
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCargando(false)
    }
  }

  const ultima = mediciones[0]

  return (
    <section className="space-y-3 rounded border p-4">
      <h2 className="text-2xl font-bold">Completado</h2>
      <p className="text-sm opacity-70">
        Lo que lleva deletreado el usuario. Usa el turno, el historial y la cercanía de arriba.
      </p>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border bg-transparent p-2 text-lg"
          value={prefijo}
          onChange={(e) => setPrefijo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && completar(prefijo)}
        />
        <button
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          disabled={cargando}
          onClick={() => completar(prefijo)}
        >
          {cargando ? 'Completando…' : 'Completar'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {PREFIJOS_DE_PRUEBA.map((p) => (
          <button key={p} className="rounded border px-2 py-1 text-sm" disabled={cargando} onClick={() => completar(p)}>
            {p}
          </button>
        ))}
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {ultima && (
        <p className="text-xl">
          <span className="font-semibold">{ultima.frase}</span>{' '}
          <span className="text-sm opacity-70">
            ({ultima.msTotal} ms, servidor {ultima.msServidor} ms, {ultima.proveedor})
          </span>
        </p>
      )}
      {mediciones.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>Prefijo</th>
              <th>Completado</th>
              <th>Total</th>
              <th>Servidor</th>
            </tr>
          </thead>
          <tbody>
            {mediciones.map((m, i) => (
              <tr key={i} className={m.msTotal > 2500 ? 'text-red-600' : ''}>
                <td>{m.prefijo}</td>
                <td>{m.frase}</td>
                <td>{m.msTotal} ms</td>
                <td>{m.msServidor} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

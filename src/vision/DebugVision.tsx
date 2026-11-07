'use client'

import { useEffect, useState } from 'react'
import { calibrar, observarVision, setUmbral, type LecturaVision } from './index'

export function DebugVision({ ocupado = false }: { ocupado?: boolean } = {}) {
  const [lectura, setLectura] = useState<LecturaVision>()
  const [umbral, cambiarUmbral] = useState(0.5)
  const [calibrando, setCalibrando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  useEffect(() => observarVision(setLectura), [])

  async function calibrarCierre() {
    setCalibrando(true)
    setMensaje('Mantené los ojos abiertos durante 3 segundos.')
    try {
      await calibrar()
      setMensaje('Línea base calibrada.')
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No pudimos calibrar.')
    } finally {
      setCalibrando(false)
    }
  }

  return (
    <section className="space-y-2 rounded border border-zinc-500 p-3" aria-label="Diagnóstico de Visión">
      <p>Ojo izquierdo: {lectura?.izquierdo?.toFixed(2) ?? '—'} · Derecho: {lectura?.derecho?.toFixed(2) ?? '—'}</p>
      <p>{lectura?.izquierdo == null ? 'No vemos tus ojos' : lectura.cerrados ? 'Ojos cerrados' : 'Ojos abiertos'}</p>
      <progress aria-label="Progreso del parpadeo largo" value={lectura?.progreso ?? 0} max={1} />
      <label className="block">Umbral de cierre: {umbral.toFixed(2)}{' '}
        <input type="range" min="0.05" max="1" step="0.01" value={umbral} onChange={evento => {
          const valor = evento.target.valueAsNumber
          cambiarUmbral(valor)
          setUmbral(valor)
        }} />
      </label>
      <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={ocupado || calibrando} onClick={calibrarCierre}>Calibrar ojos abiertos</button>
      <p role="status">{mensaje}</p>
    </section>
  )
}

export default DebugVision

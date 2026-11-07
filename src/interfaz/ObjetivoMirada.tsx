'use client'

import { createPortal } from 'react-dom'

// Oscurece todo menos una zona real de la pantalla ([data-zona]) para que el usuario
// la mire. Se usa en la calibracion y en la prueba de la mirada.
export default function ObjetivoMirada({
  zona,
  texto,
  color = 'amber',
}: {
  zona: string
  texto: string
  color?: 'amber' | 'emerald' | 'red'
}) {
  if (typeof document === 'undefined') return null
  const r = document.querySelector(`[data-zona="${zona}"]`)?.getBoundingClientRect()
  if (!r) return null
  const borde = { amber: 'outline-amber-300', emerald: 'outline-emerald-400', red: 'outline-red-500' }[color]
  const letra = { amber: 'text-amber-300', emerald: 'text-emerald-300', red: 'text-red-400' }[color]
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-50">
      <div
        className={`absolute flex items-center justify-center rounded-2xl outline outline-8 ${borde}`}
        style={{ left: r.left, top: r.top, width: r.width, height: r.height, boxShadow: '0 0 0 9999px rgba(0,0,0,0.88)' }}
      >
        <span className={`rounded-xl bg-black/70 px-6 py-3 text-center text-5xl font-bold ${letra}`}>{texto}</span>
      </div>
    </div>,
    document.body,
  )
}

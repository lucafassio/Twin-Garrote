'use client'

import { useEffect, useState } from 'react'
import { bus } from '@/eventos'

// Simula vision y voz para probar sin camara ni microfono.
// Barra espaciadora = parpadeo largo. Campo de texto + Enter = turno. Muestra cada decir recibido.
export default function Simulador() {
  const [texto, setTexto] = useState('')
  const [dichos, setDichos] = useState<string[]>([])

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || (e.target as HTMLElement).tagName === 'INPUT') return
      e.preventDefault()
      bus.emit('parpadeoLargo', {})
    }
    window.addEventListener('keydown', alTeclear)
    const off = bus.on('decir', ({ texto, urgencia }) =>
      setDichos((d) => [...d, urgencia ? `URGENCIA: ${texto}` : texto]),
    )
    return () => {
      window.removeEventListener('keydown', alTeclear)
      off()
    }
  }, [])

  return (
    <div className="fixed bottom-2 left-2 z-50 w-80 rounded border border-yellow-500 bg-black/90 p-2 text-sm text-yellow-200">
      <div className="font-bold">Simulador (espacio = parpadeo largo)</div>
      <input
        className="mt-1 w-full rounded bg-zinc-800 px-2 py-1 text-white"
        placeholder="Turno del interlocutor + Enter"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && texto.trim()) {
            bus.emit('turno', { texto: texto.trim() })
            setTexto('')
          }
        }}
      />
      <ul className="mt-1 max-h-32 overflow-auto">
        {dichos.map((d, i) => (
          <li key={i}>decir: {d}</li>
        ))}
      </ul>
    </div>
  )
}

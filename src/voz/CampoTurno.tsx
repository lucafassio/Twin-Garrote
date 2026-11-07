'use client'

import { useState } from 'react'
import { bus } from '@/eventos'
import { cerrarTurno } from './turnoManual'

// Plan B real cuando el microfono no entiende: alguien tipea la frase del interlocutor.
// Enter con texto = turno. Enter vacio = cierra a mano el turno que se esta escuchando.
export default function CampoTurno({ className = '' }: { className?: string }) {
  const [texto, setTexto] = useState('')
  return (
    <input
      className={`w-full rounded bg-zinc-800 px-3 py-2 text-lg text-white ${className}`}
      placeholder="Frase del interlocutor + Enter (vacio: cerrar turno)"
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return
        const limpio = texto.trim()
        if (limpio) bus.emit('turno', { texto: limpio })
        else cerrarTurno()
        setTexto('')
      }}
    />
  )
}

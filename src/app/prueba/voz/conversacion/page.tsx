'use client'

import { useEffect, useState } from 'react'
import Simulador from '@/dev/Simulador'
import Pantalla from '@/interfaz/Pantalla'
import { useNucleo } from '@/interfaz/useNucleo'
import { iniciarVoz } from '@/voz'

// Prueba de punta a punta del path voz con lo que ya hicieron los otros paths:
// microfono -> turno -> nucleo -> LLM (/api/opciones) -> barrido -> decir -> parlante.
// Espacio = parpadeo largo (Simulador), hasta que este vision.
export default function Conversacion() {
  const [activa, setActiva] = useState(false)
  const { nucleo, estado } = useNucleo()

  useEffect(() => {
    if (!activa) return
    return iniciarVoz()
  }, [activa])

  if (!activa)
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-xl text-zinc-400">Chrome necesita un click antes de escuchar y hablar.</p>
        <button className="rounded bg-emerald-600 px-8 py-4 text-3xl font-bold" onClick={() => setActiva(true)}>
          Empezar
        </button>
      </main>
    )

  return (
    <>
      <Pantalla
        estado={estado}
        onCortarUrgencia={nucleo.cortarUrgencia}
        onRepetir={nucleo.repetir}
        onTerminarDeletreo={nucleo.terminarDeletreo}
        onCancelarDeletreo={nucleo.cancelarDeletreo}
      />
      <Simulador />
    </>
  )
}

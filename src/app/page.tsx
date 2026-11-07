'use client'

import { useEffect, useState } from 'react'
import DebugNucleo from '@/interfaz/DebugNucleo'
import Pantalla from '@/interfaz/Pantalla'
import { useNucleo } from '@/interfaz/useNucleo'
import { CampoTurno, escuchaDisponible, iniciarVoz } from '@/voz'

// Pagina principal: solo la toca el path nucleo-interfaz.
// "Empezar" hace falta: Chrome no deja hablar, sonar audio ni abrir el microfono sin un click previo.
export default function Home() {
  const [iniciado, setIniciado] = useState(false)
  if (!iniciado) return <Inicio onEmpezar={() => setIniciado(true)} />
  return <Conversacion />
}

function Inicio({ onEmpezar }: { onEmpezar: () => void }) {
  const [sinVoz, setSinVoz] = useState(false)
  useEffect(() => {
    // Solo se puede saber en el navegador; en el servidor se asume que hay.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSinVoz(!escuchaDisponible())
  }, [])

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-10 bg-zinc-950 text-zinc-50">
      <h1 className="text-7xl font-black">Parpadeo</h1>
      <button
        type="button"
        onClick={onEmpezar}
        autoFocus
        className="rounded-2xl bg-yellow-300 px-16 py-8 text-5xl font-bold text-zinc-950"
      >
        Empezar
      </button>
      {sinVoz && (
        <p className="max-w-3xl text-center text-3xl text-amber-300">
          Este navegador no reconoce voz. Usá Chrome, o escribí lo que dice el interlocutor en el campo de abajo.
        </p>
      )}
    </main>
  )
}

function Conversacion() {
  const { nucleo, estado } = useNucleo()
  const [herramientas, setHerramientas] = useState(true)

  // Voz: escucha al interlocutor y dice las respuestas.
  useEffect(() => iniciarVoz(), [])

  // TODO vision (#3): cuando exista iniciarVision(video), montar aca un <video> oculto,
  // iniciarVision(video) en un useEffect, DebugVision dentro de las herramientas y la tecla C para calibrar.

  // Tecla D: mostrar u ocultar las herramientas del operador.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'd' || e.key === 'D') setHerramientas((v) => !v)
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [])

  return (
    <Pantalla
      estado={estado}
      onCortarUrgencia={nucleo.cortarUrgencia}
      onRepetir={nucleo.repetir}
      operador={
        herramientas && (
          <div className="flex items-center gap-4">
            <CampoTurno className="max-w-2xl" />
            <span className="text-sm text-zinc-500">D oculta · + / − velocidad · Escape corta la urgencia</span>
            <DebugNucleo nucleo={nucleo} estado={estado} flotante={false} />
          </div>
        )
      }
    />
  )
}

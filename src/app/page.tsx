'use client'

import { useEffect, useState } from 'react'
import DebugNucleo from '@/interfaz/DebugNucleo'
import MonitorBus from '@/interfaz/MonitorBus'
import VisionEnVivo from '@/interfaz/VisionEnVivo'
import Pantalla from '@/interfaz/Pantalla'
import SimuladorOjos from '@/interfaz/SimuladorOjos'
import { useNucleo } from '@/interfaz/useNucleo'
import { ajustesVoz, CampoTurno, escuchaDisponible, iniciarVoz, type Motor } from '@/voz'

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
      {sinVoz ? (
        <p className="max-w-3xl text-center text-3xl text-amber-300">
          Este navegador no reconoce voz. Usá Chrome, o escribí lo que dice el interlocutor en el campo de abajo.
        </p>
      ) : (
        // Arc y Brave traen la API pero no transcriben: no se puede detectar antes de probar.
        <p className="max-w-3xl text-center text-2xl text-zinc-400">
          Para escuchar hace falta Google Chrome (Arc y Brave no transcriben).
        </p>
      )}
    </main>
  )
}

function Conversacion() {
  const { nucleo, estado } = useNucleo()
  const [herramientas, setHerramientas] = useState(true)
  // Groq Whisper por defecto (si falta la clave o la red, voz vuelve sola a Chrome). Tecla M cambia.
  const [motor, setMotor] = useState<Motor>('groq')

  // Voz: escucha al interlocutor y dice las respuestas. Cambiar de motor la reinicia.
  useEffect(() => {
    ajustesVoz.motor = motor
    return iniciarVoz()
  }, [motor])

  // TODO vision (#3): cuando exista iniciarVision(video), montar aca un <video> oculto,
  // iniciarVision(video) en un useEffect, DebugVision dentro de las herramientas y la tecla C para calibrar.

  // Tecla D: mostrar u ocultar las herramientas del operador.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'd' || e.key === 'D') setHerramientas((v) => !v)
      if (e.key === 'm' || e.key === 'M') setMotor((m) => (m === 'groq' ? 'google' : 'groq'))
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [])

  return (
    <>
      {/* Hasta que exista vision: Espacio = parpadeo largo, mantener O = ojos cerrados */}
      <SimuladorOjos espacio />
      <Pantalla
        estado={estado}
        onCortarUrgencia={nucleo.cortarUrgencia}
        onRepetir={nucleo.repetir}
        operador={
          // Se oculta sin desmontar: la camara de vision tiene que seguir andando.
          <div className={herramientas ? 'flex items-start gap-4' : 'h-0 overflow-hidden opacity-0'}>
            <div className="flex w-[28rem] flex-col gap-2">
              <CampoTurno />
              <ul className="text-sm leading-snug text-zinc-400">
                <li><b className="text-zinc-200">Parpadeo largo</b> elige lo iluminado (o Espacio / mantener O)</li>
                <li><b className="text-zinc-200">C</b> calibra los ojos · <b className="text-zinc-200">Z</b> calibra la mirada (mirá cada zona que se ilumina)</li>
                <li><b className="text-zinc-200">Escape</b> o click corta la urgencia · <b className="text-zinc-200">+ / −</b> velocidad</li>
                <li><b className="text-zinc-200">M</b> cambia el motor de voz (ahora: {motor === 'groq' ? 'Groq Whisper' : 'Chrome'})</li>
                <li><b className="text-zinc-200">D</b> oculta estas herramientas</li>
              </ul>
            </div>
            <VisionEnVivo />
            <MonitorBus />
            <DebugNucleo nucleo={nucleo} estado={estado} flotante={false} />
          </div>
        }
      />
    </>
  )
}

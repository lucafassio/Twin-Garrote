'use client'

import { useEffect, useRef, useState } from 'react'
import DebugNucleo from '@/interfaz/DebugNucleo'
import MonitorBus from '@/interfaz/MonitorBus'
import Pantalla from '@/interfaz/Pantalla'
import { PasoCamara, PasoMirada, PasoParpadeo } from '@/interfaz/Preparacion'
import SimuladorOjos from '@/interfaz/SimuladorOjos'
import { useCamara } from '@/interfaz/useCamara'
import { useNucleo } from '@/interfaz/useNucleo'
import { estadoInicial } from '@/nucleo/reductor'
import DebugVision from '@/vision/DebugVision'
import { ajustesVoz, CampoTurno, iniciarVoz, type Motor } from '@/voz'

// Pagina principal: solo la toca el path nucleo-interfaz.
// Arranca con la preparacion (camara, parpadeo, mirada) y despues la conversacion.
// Los clicks de la preparacion habilitan el audio y el microfono en Chrome.
type Fase = 'camara' | 'parpadeo' | 'mirada' | 'conversacion'

const nada = () => {}

export default function Home() {
  const video = useRef<HTMLVideoElement>(null)
  const camara = useCamara(video)
  const [fase, setFase] = useState<Fase>('camara')

  return (
    <>
      {/* Un solo <video> para toda la pagina: grande en el paso de camara, invisible despues. */}
      <video
        ref={video}
        muted
        playsInline
        className={
          fase === 'camara'
            ? 'fixed left-1/2 top-[13.5rem] z-10 aspect-video w-[44rem] max-w-[calc(100%-4rem)] -translate-x-1/2 -scale-x-100 rounded-3xl object-cover'
            : 'pointer-events-none fixed bottom-0 right-0 h-px w-px opacity-0'
        }
      />
      {fase === 'camara' && (
        <PasoCamara camara={camara} onListo={() => setFase('parpadeo')} onSaltear={() => setFase('conversacion')} />
      )}
      {fase === 'parpadeo' && <PasoParpadeo onListo={() => setFase('mirada')} onVolver={() => setFase('camara')} />}
      {fase === 'mirada' && (
        <>
          {/* La mirada se calibra sobre la pantalla real: mismas zonas, mismos lugares. */}
          <Pantalla estado={estadoInicial} onCortarUrgencia={nada} onRepetir={nada} onTerminarDeletreo={nada} onCancelarDeletreo={nada} />
          <PasoMirada onListo={() => setFase('conversacion')} />
        </>
      )}
      {fase === 'conversacion' && <Conversacion onRecalibrar={setFase} />}
    </>
  )
}

function Conversacion({ onRecalibrar }: { onRecalibrar: (fase: Fase) => void }) {
  const { nucleo, estado } = useNucleo()
  // Herramientas de quien opera la demo: ocultas; la tecla D las muestra.
  const [herramientas, setHerramientas] = useState(false)
  // Groq Whisper por defecto (si falta la clave o la red, voz vuelve sola a Chrome). Tecla M cambia.
  const [motor, setMotor] = useState<Motor>('groq')

  // Voz: escucha al interlocutor y dice las respuestas. Cambiar de motor la reinicia.
  useEffect(() => {
    ajustesVoz.motor = motor
    return iniciarVoz()
  }, [motor])

  // Teclas del operador: D herramientas, M motor de voz, Z recalibrar la mirada,
  // C recalibrar el parpadeo, + / - velocidad del barrido.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      const k = e.key.toLowerCase()
      if (k === 'd') setHerramientas((v) => !v)
      else if (k === 'm') setMotor((m) => (m === 'groq' ? 'google' : 'groq'))
      else if (k === 'z') onRecalibrar('mirada')
      else if (k === 'c') onRecalibrar('parpadeo')
      // Con las herramientas visibles, + / - los maneja DebugNucleo.
      else if (!herramientas && (k === '+' || k === '=')) nucleo.setVelocidad(nucleo.velocidad() - 100)
      else if (!herramientas && k === '-') nucleo.setVelocidad(nucleo.velocidad() + 100)
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [nucleo, onRecalibrar, herramientas])

  return (
    <>
      {/* Respaldo de teclado de vision: Espacio = parpadeo largo, mantener O = ojos cerrados */}
      <SimuladorOjos espacio />
      <Pantalla
        estado={estado}
        onCortarUrgencia={nucleo.cortarUrgencia}
        onRepetir={nucleo.repetir}
        onTerminarDeletreo={nucleo.terminarDeletreo}
        onCancelarDeletreo={nucleo.cancelarDeletreo}
        velocidadMs={nucleo.velocidad()}
        operador={
          herramientas && (
            <div className="flex items-start gap-4">
              <div className="flex w-[28rem] flex-col gap-2">
                <CampoTurno />
                <p className="text-sm leading-snug text-zinc-400">
                  D oculta · M voz ({motor === 'groq' ? 'Groq' : 'Chrome'}) · Z recalibra mirada · C recalibra parpadeo · + / −
                  velocidad · Espacio o mantener O simulan el parpadeo
                </p>
              </div>
              <DebugVision />
              <MonitorBus />
              <DebugNucleo nucleo={nucleo} estado={estado} flotante={false} />
            </div>
          )
        }
      />
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { bus } from '@/eventos'
import { depuracionEscucha } from '@/voz/escuchar'

// Monitor en vivo del bus: estado del microfono y ultimos eventos con la hora.
// Sirve para ver en la demo si la voz escucha, si llegan turnos y si se eligen cosas.
// Senal tipica de navegador sin reconocimiento real (Arc, Brave): "escuchando" que
// se prende y se apaga solo, sin ningun "parcial".

type Linea = { hora: string; texto: string; color: string }

const MAXIMO_LINEAS = 8

export default function MonitorBus() {
  const [escuchando, setEscuchando] = useState(false)
  const [hablando, setHablando] = useState(false)
  const [ultimoParcial, setUltimoParcial] = useState<number | null>(null)
  const [ahora, setAhora] = useState(() => Date.now())
  const [lineas, setLineas] = useState<Linea[]>([])
  const [motor, setMotor] = useState('')
  const [nivel, setNivel] = useState<{ nivel: number; hablando: boolean } | null>(null)
  const [segmento, setSegmento] = useState<{ audioMs: number; respuestaMs: number } | null>(null)

  // Ganchos de depuracion de voz: motor activo y, con Groq, nivel del micro y cada frase transcripta.
  useEffect(() => {
    depuracionEscucha.alMotor = setMotor
    depuracionEscucha.alNivel = ({ nivel, hablando }) => setNivel({ nivel, hablando })
    depuracionEscucha.alSegmento = ({ audioMs, respuestaMs }) => setSegmento({ audioMs, respuestaMs })
    return () => {
      depuracionEscucha.alMotor = null
      depuracionEscucha.alNivel = null
      depuracionEscucha.alSegmento = null
    }
  }, [])

  useEffect(() => {
    const anotar = (texto: string, color = 'text-zinc-300') =>
      setLineas((l) =>
        [{ hora: new Date().toLocaleTimeString('es-AR'), texto, color }, ...l].slice(0, MAXIMO_LINEAS),
      )
    const offs = [
      bus.on('escuchando', ({ activo }) => {
        setEscuchando(activo)
        anotar(`escuchando ${activo ? 'si' : 'no'}`, 'text-emerald-300')
      }),
      bus.on('transcripcionParcial', ({ texto }) => {
        if (texto) setUltimoParcial(Date.now())
      }),
      bus.on('turno', ({ texto }) => anotar(`turno: ${texto}`, 'text-white')),
      bus.on('hablando', ({ activo }) => {
        setHablando(activo)
        anotar(`hablando ${activo ? 'si' : 'no'}`, 'text-sky-300')
      }),
      bus.on('decir', ({ texto, urgencia }) => anotar(`decir${urgencia ? ' (URGENCIA)' : ''}: ${texto}`, 'text-yellow-300')),
      bus.on('repetir', () => anotar('repetir', 'text-yellow-300')),
      bus.on('detenerUrgencia', ({ falsaAlarma }) =>
        anotar(`detenerUrgencia${falsaAlarma ? ' (falsa alarma)' : ' (atendida)'}`, 'text-red-300'),
      ),
      bus.on('parpadeoLargo', () => anotar('parpadeo largo', 'text-fuchsia-300')),
      bus.on('ojos', ({ cerrados }) => {
        // Solo los cambios, no cada actualizacion del progreso.
        setLineas((l) => {
          const texto = cerrados ? 'ojos cerrados' : 'ojos abiertos'
          if (l[0]?.texto.startsWith('ojos') && l[0].texto === texto) return l
          return [{ hora: new Date().toLocaleTimeString('es-AR'), texto, color: 'text-fuchsia-300' }, ...l].slice(
            0,
            MAXIMO_LINEAS,
          )
        })
      }),
    ]
    const reloj = setInterval(() => setAhora(Date.now()), 1000)
    return () => {
      offs.forEach((off) => off())
      clearInterval(reloj)
    }
  }, [])

  const hace = ultimoParcial === null ? 'nunca' : `hace ${Math.round((ahora - ultimoParcial) / 1000)} s`

  return (
    <div className="w-96 rounded border border-emerald-600 bg-black/90 p-2 font-mono text-xs">
      <div className="flex gap-3 font-bold">
        <span className={escuchando ? 'text-emerald-300' : 'text-zinc-500'}>mic {escuchando ? 'ON' : 'off'}</span>
        <span className={hablando ? 'text-sky-300' : 'text-zinc-500'}>voz {hablando ? 'hablando' : 'callada'}</span>
        <span className="text-zinc-400">ultimo parcial: {hace}</span>
      </div>
      <div className="flex items-center gap-3 text-zinc-300">
        <span>
          motor <b className={motor === 'groq' ? 'text-amber-300' : 'text-sky-300'}>{motor || '-'}</b>
        </span>
        {nivel && (
          <span className="flex items-center gap-1">
            nivel
            <span className="inline-block h-2 w-20 overflow-hidden rounded bg-zinc-800">
              <span
                className={`block h-full ${nivel.hablando ? 'bg-emerald-400' : 'bg-zinc-500'}`}
                style={{ width: `${Math.min(100, nivel.nivel * 400)}%` }}
              />
            </span>
          </span>
        )}
        {segmento && (
          <span>
            whisper {segmento.audioMs} ms de audio → {segmento.respuestaMs} ms
          </span>
        )}
      </div>
      <ul className="mt-1">
        {lineas.map((l, i) => (
          <li key={i} className={`truncate ${l.color}`}>
            <span className="text-zinc-500">{l.hora}</span> {l.texto}
          </li>
        ))}
      </ul>
    </div>
  )
}

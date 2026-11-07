'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { bus } from '@/eventos'
import { calibrar, calibrarZonas, estadoZonas, iniciarVision } from '@/vision'
import DebugVision from '@/vision/DebugVision'

// Camara + vision para la pantalla principal (paso 5 del #5).
// Vision emite ojos / parpadeoLargo / zonaMirada al bus; el nucleo los usa sin saber de donde vienen.
// Tecla C: calibrar los ojos abiertos (3 s). Tecla Z: calibrar la mirada por zonas (~20 s).
const ZONAS = ['opcion0', 'opcion1', 'opcion2', 'opcion3', 'franja']

type Paso = { zona: string; paso: number; total: number }

export default function VisionEnVivo() {
  const video = useRef<HTMLVideoElement>(null)
  const [estado, setEstado] = useState<'iniciando' | 'activa' | 'error'>('iniciando')
  const [mensaje, setMensaje] = useState('')
  const [paso, setPaso] = useState<Paso | null>(null)
  const [mirada, setMirada] = useState<{ zona: string | null; confianza: number } | null>(null)
  const [zonasListas, setZonasListas] = useState(false)
  const calibrando = useRef<AbortController | null>(null)

  useEffect(() => {
    let apagar: (() => void) | null = null
    let vivo = true
    const v = video.current
    if (!v) return
    iniciarVision(v)
      .then((fn) => {
        if (!vivo) return fn()
        apagar = fn
        setEstado('activa')
      })
      .catch((e) => {
        if (!vivo) return
        setEstado('error')
        setMensaje(e instanceof Error ? e.message : 'No pudimos iniciar la cámara.')
      })
    return () => {
      vivo = false
      calibrando.current?.abort()
      apagar?.()
    }
  }, [])

  // Lo que dice el clasificador cuadro a cuadro (antes de estabilizar), para el debug.
  useEffect(() => bus.on('zonaMirada', setMirada), [])

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'c' || e.key === 'C') {
        setMensaje('Calibrando: mantené los ojos abiertos 3 s…')
        calibrar()
          .then(() => setMensaje('Ojos calibrados.'))
          .catch((err) => setMensaje(err instanceof Error ? err.message : 'No se pudo calibrar.'))
      }
      if (e.key === 'z' || e.key === 'Z') {
        if (calibrando.current) return
        const control = new AbortController()
        calibrando.current = control
        setMensaje('Calibrando la mirada: seguí con la vista la zona iluminada.')
        calibrarZonas(ZONAS, (zona, n, total) => setPaso(zona ? { zona, paso: n, total } : null), control.signal)
          .then((ok) => {
            setZonasListas(estadoZonas().lista)
            setMensaje(ok ? 'Mirada calibrada: mirá una zona y parpadeá para elegir.' : 'Calibración cancelada.')
          })
          .catch((err) => setMensaje(err instanceof Error ? err.message : 'No se pudo calibrar la mirada.'))
          .finally(() => {
            calibrando.current = null
          })
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [])

  return (
    <div className="flex items-start gap-2 text-xs text-zinc-300">
      <video ref={video} muted playsInline className="h-24 w-32 -scale-x-100 rounded bg-black object-cover" />
      <div className="flex flex-col gap-1">
        <span className={estado === 'activa' ? 'text-emerald-300' : estado === 'error' ? 'text-red-300' : 'text-zinc-400'}>
          visión {estado} · mirada {zonasListas ? 'calibrada' : 'sin calibrar (Z)'}
        </span>
        {zonasListas && mirada && (
          <span>
            mira: <b className="text-amber-300">{mirada.zona ?? '-'}</b> {mirada.zona && `${Math.round(mirada.confianza * 100)}%`}
          </span>
        )}
        {mensaje && <span className="max-w-56">{mensaje}</span>}
        {estado === 'activa' && <DebugVision />}
      </div>
      {paso && createPortal(<ObjetivoCalibracion paso={paso} />, document.body)}
    </div>
  )
}

// Oscurece todo menos la zona a mirar (usa la posicion real de la celda en la pantalla).
function ObjetivoCalibracion({ paso }: { paso: Paso }) {
  const el = document.querySelector(`[data-zona="${paso.zona}"]`)
  const r = el?.getBoundingClientRect()
  if (!r) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div
        className="absolute flex items-center justify-center rounded-2xl outline outline-8 outline-amber-300"
        style={{ left: r.left, top: r.top, width: r.width, height: r.height, boxShadow: '0 0 0 9999px rgba(0,0,0,0.85)' }}
      >
        <span className="rounded-xl bg-black/70 px-6 py-3 text-5xl font-bold text-amber-300">
          Mirá acá · {paso.paso}/{paso.total}
        </span>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, type RefObject } from 'react'
import { iniciarVision, observarVision, type LecturaVision } from '@/vision'
import { crearControladorCamara } from './camara'

// Una sola camara para toda la pagina, aunque React monte dos veces.
const controlador = crearControladorCamara(iniciarVision)

export type EstadoCamara = 'iniciando' | 'lista' | 'error'

export function useCamara(video: RefObject<HTMLVideoElement | null>) {
  const [estado, setEstado] = useState<EstadoCamara>('iniciando')
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const v = video.current
    if (!v) return
    let vivo = true
    const enganche = controlador.enganchar(v)
    enganche.listo.then(
      () => vivo && setEstado('lista'),
      (e: unknown) => {
        if (!vivo) return
        setEstado('error')
        setError(e instanceof Error ? e.message : 'No pudimos prender la cámara.')
      },
    )
    return () => {
      vivo = false
      enganche.soltar()
    }
  }, [video, intento])

  return {
    estado,
    error,
    reintentar: () => {
      setEstado('iniciando')
      setIntento((i) => i + 1)
    },
  }
}

// Lectura de vision en vivo (ojos, mirada, encuadre). Re-renderiza en cada cuadro:
// usar solo en pantallas de la preparacion.
export function useLecturaVision() {
  const [lectura, setLectura] = useState<LecturaVision | null>(null)
  useEffect(() => observarVision(setLectura), [])
  return lectura
}

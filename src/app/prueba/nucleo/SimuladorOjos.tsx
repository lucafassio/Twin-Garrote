'use client'

import { useEffect } from 'react'
import { bus } from '@/eventos'

// Simula los ojos como lo haria el path vision, para probar el congelado del
// barrido y el gesto de urgencia. Mantener apretada la tecla O = ojos cerrados.
// A los 500 ms emite parpadeoLargo; a los 2 s el nucleo dispara la urgencia.
export default function SimuladorOjos() {
  useEffect(() => {
    let inicio = 0
    let intervalo: ReturnType<typeof setInterval> | null = null
    let parpadeoEmitido = false

    const cerrar = (e: KeyboardEvent) => {
      if (e.code !== 'KeyO' || e.repeat || (e.target as HTMLElement).tagName === 'INPUT') return
      inicio = performance.now()
      parpadeoEmitido = false
      bus.emit('ojos', { cerrados: true, progreso: 0 })
      intervalo = setInterval(() => {
        const progreso = Math.min(1, (performance.now() - inicio) / 500)
        if (!parpadeoEmitido) bus.emit('ojos', { cerrados: true, progreso })
        if (progreso >= 1 && !parpadeoEmitido) {
          parpadeoEmitido = true
          bus.emit('parpadeoLargo', {})
        }
      }, 50)
    }

    const abrir = (e: KeyboardEvent) => {
      if (e.code !== 'KeyO' || !intervalo) return
      clearInterval(intervalo)
      intervalo = null
      bus.emit('ojos', { cerrados: false, progreso: 0 })
    }

    window.addEventListener('keydown', cerrar)
    window.addEventListener('keyup', abrir)
    return () => {
      window.removeEventListener('keydown', cerrar)
      window.removeEventListener('keyup', abrir)
      if (intervalo) clearInterval(intervalo)
    }
  }, [])

  return null
}
